import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { auth, db } from "./lib/firebase";
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import Home from "./home/App";
import { BottomNav } from "./home/features/home/components/BottomNav";
import TasksPage from "./home/features/tasks/TasksPage";
import CalendarPage from "./home/features/calendar/CalendarPage";
import Chat from "./pages/Chat";
import AssistantPage from "./pages/AssistantPage";
import FloatingAssistant from "./components/FloatingAssistant";
import { parseIcsFile } from "./lib/icsParser";
import { importEventsToFirestore } from "./lib/importEvents";
import { useEvents } from "./lib/useEvents";
import { DesktopSidebar } from "./components/DesktopSidebar";

const KaliLogo = () => (
  <svg width="29" height="25" viewBox="0 0 29 25" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.6333 0C22.9681 0.104094 24.0386 0.83307 24.7934 1.91075C25.5685 3.00821 25.8575 4.36986 25.5931 5.68214C25.0461 8.54764 21.8167 10.5302 19.1928 11.2148C18.8591 11.3019 18.3249 11.3661 18.0594 11.541L18.1543 11.6973C20.7611 13.1106 24.5205 10.6652 26.9663 10.1784C27.315 10.1177 28.0975 10.1924 28.3406 10.5011C29.7512 12.2944 28.6402 15.3338 27.4194 16.7284C26.3351 17.9687 24.7913 18.7254 23.1345 18.8276C19.1256 19.1096 17.183 16.9782 14.4873 14.6596C15.7129 17.401 20.4082 21.2419 16.6316 23.7253C14.9389 24.8355 12.8714 25.2428 10.8767 24.8591C6.54646 22.8821 9.96539 16.6931 10.9677 13.5786C10.3636 13.9381 9.87413 14.2608 9.33474 14.7033C7.65519 16.1355 5.08867 19.6262 2.72963 17.4132C-3.14951 11.8983 1.42686 9.32598 7.41625 9.32556C7.87663 9.32556 9.50469 8.97875 9.29871 8.34703C8.6172 6.19115 7.30356 4.37923 8.69599 2.17462C10.4063 -0.533312 13.8269 1.62773 15.0735 3.62752C15.549 4.39038 15.577 6.47522 16.1568 6.87086C17.8846 6.56595 18.6554 0.803285 21.6333 0Z" fill="#6F8F7A"/>
  </svg>
);

const BackChevron = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className="absolute left-lg top-[52px]">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </button>
);

const ArrowButton = ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-subtle transition-colors hover:bg-accent-dark disabled:opacity-40"
  >
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  </button>
);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(false);
  const [step, setStep] = useState(0);
  const [authError, setAuthError] = useState("");
  const [icsFile, setIcsFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("home");
  const [chatOpen, setChatOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"profile" | "calendars" | "tasks" | "appearance">("profile");
  // Track if add modal should open (triggered from desktop sidebar)
  const [desktopAddTrigger, setDesktopAddTrigger] = useState(0);

  const { events } = useEvents(user?.uid);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuth = async () => {
    setAuthError("");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        console.log("Signed in");
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        const newUser = userCredential.user;

        await setDoc(doc(db, "users", newUser.uid), {
          email: newUser.email,
          createdAt: new Date(),
        });

        console.log("User + Firestore doc created");
        setStep(3);
      }
    } catch (error: any) {
      console.error("Auth error:", error.code);
      setAuthError(
        error.code === "auth/email-already-in-use"
          ? "That email is already registered."
          : error.code === "auth/wrong-password" || error.code === "auth/invalid-credential"
          ? "Incorrect email or password."
          : error.code === "auth/weak-password"
          ? "Password must be at least 6 characters."
          : "Something went wrong. Please try again."
      );
    }
  };

  const handleIcsUpload = async () => {
    if (!icsFile || !user) return;
    setImporting(true);
    setAuthError("");
    setImportSuccess("");
    try {
      const content = await icsFile.text();
      const parsed = parseIcsFile(content);
      if (parsed.length === 0) {
        setAuthError("No events found in the file. Make sure it's a valid .ics file.");
        return;
      }
      await importEventsToFirestore(user.uid, parsed);
      setImportSuccess(`Successfully imported ${parsed.length} event${parsed.length > 1 ? "s" : ""}!`);
      setTimeout(() => setStep(0), 1500);
    } catch (err: any) {
      console.error("ICS import error:", err);
      setAuthError(`Import failed: ${err.message || err}`);
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  // Show ICS upload step even though user is set (sign-up just completed)
  if (!user || step === 3) {
    if (!user && step !== 3) {
      // Auth screens (steps 0-2)
    }

    // Step 0: Welcome
    if (step === 0 && !user) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="w-full max-w-[402px] px-lg">
            <KaliLogo />
            <p className="mt-3 text-body leading-body font-semibold text-text-secondary">
              Welcome to Kali!
            </p>
            <h1 className="mt-1 font-serif text-display leading-display tracking-[-0.3px] text-text-strong">
              Let's get you organized.
            </h1>

            <div className="mt-10 flex w-full flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setStep(1); setAuthError(""); }}
                className="flex h-14 w-full items-center justify-center rounded-[8px] bg-surface text-body leading-body font-medium text-text-strong transition-colors hover:bg-subtle-fill"
              >
                Sign in with email
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setStep(1); setAuthError(""); }}
                className="text-body leading-body text-accent"
              >
                I don't have an account
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Step 1: Email input
    if (step === 1) {
      return (
        <div className="relative flex min-h-screen items-center justify-center bg-background">
          <BackChevron onClick={() => { setStep(0); setAuthError(""); }} />
          <div className="w-full max-w-[402px] px-lg">
            <h1 className="font-serif text-display leading-display tracking-[-0.3px] text-text-strong">
              {isLogin ? "Sign in" : "Sign up"}
            </h1>
            <p className="mt-3 text-body leading-body text-text-strong">
              Use your email to import your calendar data and enjoy a smooth experience with Kali.
            </p>

            <div className="mt-8">
              <input
                className="h-14 w-full rounded-[12px] bg-surface px-5 text-body leading-body text-text-strong placeholder:text-text-tertiary focus:outline-none"
                placeholder="Enter your email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && email) setStep(2); }}
              />
            </div>

            <div className="mt-12 flex justify-end">
              <ArrowButton onClick={() => setStep(2)} disabled={!email} />
            </div>
          </div>
        </div>
      );
    }

    // Step 2: Password input
    if (step === 2) {
      return (
        <div className="relative flex min-h-screen items-center justify-center bg-background">
          <BackChevron onClick={() => { setStep(1); setAuthError(""); }} />
          <div className="w-full max-w-[402px] px-lg">
            <h1 className="font-serif text-display leading-display tracking-[-0.3px] text-text-strong">
              {isLogin ? "Sign in" : "Sign up"}
            </h1>
            <p className="mt-3 text-body leading-body text-text-strong">
              Use your email to import your calendar data and enjoy a smooth experience with Kali.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <input
                className="h-14 w-full rounded-[12px] bg-surface px-5 text-body leading-body text-text-strong placeholder:text-text-tertiary"
                value={email}
                readOnly
              />
              <input
                className="h-14 w-full rounded-[12px] bg-surface px-5 text-body leading-body text-text-strong placeholder:text-text-tertiary focus:outline-none"
                placeholder="Enter your password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && password) handleAuth(); }}
              />
              {authError && (
                <p className="text-caption leading-caption text-red-500">{authError}</p>
              )}
            </div>

            <div className="mt-12 flex justify-end">
              <ArrowButton onClick={handleAuth} disabled={!password} />
            </div>
          </div>
        </div>
      );
    }

    // Step 3: ICS Upload (sign-up only)
    if (step === 3 && user) {
      return (
        <div className="relative flex min-h-screen items-center justify-center bg-background">
          <BackChevron onClick={() => { setStep(0); setAuthError(""); }} />
          <div className="w-full max-w-[402px] px-lg">
            <p className="text-body leading-body text-text-strong max-w-[280px]">
              The transition is easy! Simply upload your calendar via and .ics.
            </p>

            <div
              className="mt-6 flex h-[200px] flex-col items-center justify-center rounded-[16px] bg-surface cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files[0];
                if (file && file.name.endsWith(".ics")) setIcsFile(file);
              }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9fafa6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 8l-5-5-5 5M12 3v12" />
              </svg>
              <p className="mt-2 text-caption leading-caption text-text-tertiary text-center">
                {icsFile ? icsFile.name : ""}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ics"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setIcsFile(file);
                }}
              />
            </div>

            {authError && (
              <p className="mt-3 text-caption leading-caption text-red-500">{authError}</p>
            )}
            {importSuccess && (
              <p className="mt-3 text-caption leading-caption font-medium" style={{ color: "#6F8F7A" }}>{importSuccess}</p>
            )}

            <div className="mt-12 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="text-caption leading-caption text-text-secondary"
              >
                Skip for now
              </button>
              <ArrowButton onClick={handleIcsUpload} disabled={!icsFile || importing} />
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  // Tasks page has no selected nav item on mobile
  const noActive = activeTab === "tasks";
  const navItems = [
    {
      id: "home",
      label: "Home",
      icon: "home" as const,
      isActive: !noActive && activeTab === "home",
    },
    {
      id: "chat",
      label: "Chat",
      icon: "chat" as const,
      isActive: !noActive && activeTab === "chat",
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: "calendar" as const,
      isActive: !noActive && activeTab === "calendar",
    },
    {
      id: "profile",
      label: "Profile",
      icon: "profile" as const,
      isActive: activeTab === "profile",
    },
  ];

  const handleNavItemPress = (id: string) => {
    if (id === "chat") {
      // Desktop: full page. Mobile: floating popover.
      if (window.innerWidth >= 768) {
        setActiveTab("chat");
      } else {
        setAssistantOpen(true);
      }
      return;
    }
    setActiveTab(id);
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar - hidden on mobile */}
      <DesktopSidebar
        activeTab={activeTab}
        onNavPress={handleNavItemPress}
        userEmail="carmah@stanford.edu"
        onAddPress={() => setDesktopAddTrigger((n) => n + 1)}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:min-h-0 lg:max-h-screen lg:overflow-y-auto">
        <div className="pb-24 lg:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {activeTab === "home" && (
                <Home
                  onSeeAllTasks={() => setActiveTab("tasks")}
                  onNavPress={handleNavItemPress}
                  events={events}
                  userId={user.uid}
                  userName="Carmah"
                  desktopAddTrigger={desktopAddTrigger}
                  onAssistantOpen={() => setAssistantOpen(true)}
                />
              )}
              {activeTab === "tasks" && (
                <TasksPage
                  onBack={() => setActiveTab("home")}
                  userId={user.uid}
                />
              )}
              {activeTab === "calendar" && (
                <CalendarPage
                  onBack={() => setActiveTab("home")}
                  events={events}
                  userId={user.uid}
                  onNavPress={handleNavItemPress}
                />
              )}
              {activeTab === "chat" && (
                <AssistantPage userId={user.uid} events={events} />
              )}
              {activeTab === "profile" && (
                <div className="relative mx-auto max-w-[402px] lg:max-w-none lg:w-full bg-background pb-28 lg:pb-0 min-h-screen">
                  {/* Mobile: simple stacked layout */}
                  <div className="lg:hidden">
                    <header className="flex items-end justify-between px-lg pt-5xl pb-2xl">
                      <h1 className="font-serif text-display leading-display tracking-[-0.3px] text-text-strong">
                        Settings
                      </h1>
                    </header>
                    <div className="mx-lg space-y-lg">
                      {/* Profile card */}
                      <div className="rounded-[16px] bg-surface p-2xl shadow-subtle">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent text-body font-semibold">
                            {(user?.displayName || "C")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-body leading-body font-medium text-text-strong">{user?.displayName || "User"}</p>
                            <p className="text-caption leading-caption text-text-secondary">carmah@stanford.edu</p>
                          </div>
                        </div>
                      </div>

                      {/* Calendar card */}
                      <div className="rounded-[16px] bg-surface p-2xl shadow-subtle">
                        <p className="text-body leading-body font-medium text-text-strong mb-1">Calendar</p>
                        <p className="text-caption leading-caption text-text-secondary mb-3">
                          {uploadedFileName ? "Calendar uploaded" : "Import your .ics calendar file"}
                        </p>

                        {uploadedFileName ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 rounded-[12px] bg-background px-4 py-3">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6F8F7A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                              <span className="flex-1 truncate text-caption leading-caption font-medium text-text-strong">{uploadedFileName}</span>
                              <span className="text-caption leading-caption font-medium" style={{ color: "#6F8F7A" }}>{events.length} events</span>
                            </div>
                            <button className="flex h-11 w-full items-center justify-center rounded-[12px] border border-dashed border-border text-caption leading-caption font-medium text-text-secondary hover:bg-subtle-fill" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                              {importing ? "Importing..." : "Add another .ics file"}
                            </button>
                            <button className="flex h-11 w-full items-center justify-center rounded-[12px] text-caption leading-caption font-medium text-red-500 hover:bg-red-50" onClick={async () => { if (!user || deleting) return; setDeleting(true); setAuthError(""); setImportSuccess(""); try { const eventsCol = collection(db, "users", user.uid, "events"); const snapshot = await getDocs(eventsCol); for (let i = 0; i < snapshot.docs.length; i += 500) { const batch = writeBatch(db); snapshot.docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref)); await batch.commit(); } setUploadedFileName(""); setImportSuccess(`Deleted ${snapshot.docs.length} events.`); } catch (err: any) { setAuthError(`Delete failed: ${err.message || err}`); } finally { setDeleting(false); } }} disabled={deleting}>
                              {deleting ? "Deleting..." : "Remove all events"}
                            </button>
                          </div>
                        ) : (
                          <button className="flex h-12 w-full items-center justify-center rounded-[12px] border border-dashed border-border text-body leading-body font-medium text-text-secondary hover:bg-subtle-fill" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                            {importing ? "Importing..." : icsFile ? icsFile.name : "Choose .ics file"}
                          </button>
                        )}

                        {authError && <p className="mt-2 text-caption leading-caption text-red-500">{authError}</p>}
                        {importSuccess && <p className="mt-2 text-caption leading-caption font-medium" style={{ color: "#6F8F7A" }}>{importSuccess}</p>}
                      </div>

                      <button className="h-12 w-full rounded-[12px] text-body leading-body font-medium text-red-500 hover:bg-red-50 transition-colors" onClick={() => signOut(auth)}>
                        Log out
                      </button>
                    </div>
                  </div>

                  {/* Desktop: settings layout with sidebar */}
                  <div className="hidden lg:flex min-h-screen">
                    {/* Settings sidebar */}
                    <div className="w-[240px] shrink-0 border-r border-divider px-5 py-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent text-caption font-semibold">
                          {(user?.displayName || "C")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-small leading-small font-medium text-text-strong">{user?.displayName || "User"}</p>
                          <p className="text-label leading-label text-text-tertiary">Settings</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="px-3 py-1.5 text-label leading-label font-medium text-text-tertiary uppercase tracking-wide">Personal</p>
                        <button
                          onClick={() => setSettingsTab("profile")}
                          className={`flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-small leading-small transition-colors ${settingsTab === "profile" ? "bg-subtle-fill text-text-strong font-medium" : "text-text-secondary hover:bg-subtle-fill"}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                          Profile
                        </button>
                      </div>

                      <div className="mt-4 space-y-1">
                        <p className="px-3 py-1.5 text-label leading-label font-medium text-text-tertiary uppercase tracking-wide">App Settings</p>
                        <button
                          onClick={() => setSettingsTab("calendars")}
                          className={`flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-small leading-small transition-colors ${settingsTab === "calendars" ? "bg-subtle-fill text-text-strong font-medium" : "text-text-secondary hover:bg-subtle-fill"}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" /></svg>
                          Calendars
                        </button>
                        <button
                          onClick={() => setSettingsTab("tasks")}
                          className={`flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-small leading-small transition-colors ${settingsTab === "tasks" ? "bg-subtle-fill text-text-strong font-medium" : "text-text-secondary hover:bg-subtle-fill"}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17L4 12" /></svg>
                          Tasks
                        </button>
                        <button
                          onClick={() => setSettingsTab("appearance")}
                          className={`flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-small leading-small transition-colors ${settingsTab === "appearance" ? "bg-subtle-fill text-text-strong font-medium" : "text-text-secondary hover:bg-subtle-fill"}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
                          Appearance
                        </button>
                      </div>

                      <div className="mt-8 border-t border-divider pt-4">
                        <button
                          onClick={() => signOut(auth)}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-small leading-small text-red-500 hover:bg-red-50 rounded-[8px] transition-colors"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                          Log out
                        </button>
                      </div>
                    </div>

                    {/* Settings content area */}
                    <div className="flex-1 px-10 py-8 max-w-[640px]">
                      {settingsTab === "profile" && (
                        <div>
                          <h2 className="text-title leading-title font-medium text-text-strong">Profile</h2>
                          <p className="mt-1 text-small leading-small text-text-secondary">Manage your account details</p>
                          <div className="mt-6 border-t border-divider pt-6 space-y-5">
                            <div>
                              <p className="text-small leading-small font-medium text-text-strong">Email</p>
                              <p className="mt-1 text-body leading-body text-text-secondary">carmah@stanford.edu</p>
                            </div>
                            <div>
                              <p className="text-small leading-small font-medium text-text-strong">Name</p>
                              <p className="mt-1 text-body leading-body text-text-secondary">{user?.displayName || "Not set"}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {settingsTab === "calendars" && (
                        <div>
                          <h2 className="text-title leading-title font-medium text-text-strong">Calendars</h2>
                          <p className="mt-1 text-small leading-small text-text-secondary">Manage your calendar imports</p>
                          <div className="mt-6 border-t border-divider pt-6">
                            {uploadedFileName ? (
                              <div className="space-y-4">
                                <div className="flex items-center gap-3 rounded-[12px] bg-background px-4 py-3">
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6F8F7A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                  </svg>
                                  <span className="flex-1 truncate text-body leading-body font-medium text-text-strong">{uploadedFileName}</span>
                                  <span className="text-caption leading-caption font-medium" style={{ color: "#6F8F7A" }}>{events.length} event{events.length !== 1 ? "s" : ""}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button className="rounded-[12px] bg-subtle-fill px-4 py-2.5 text-small leading-small font-medium text-text-secondary hover:bg-gray-200 transition-colors" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                                    {importing ? "Importing..." : "Add another .ics"}
                                  </button>
                                  <button className="rounded-[12px] px-4 py-2.5 text-small leading-small font-medium text-red-500 hover:bg-red-50 transition-colors" onClick={async () => { if (!user || deleting) return; setDeleting(true); setAuthError(""); setImportSuccess(""); try { const eventsCol = collection(db, "users", user.uid, "events"); const snapshot = await getDocs(eventsCol); for (let i = 0; i < snapshot.docs.length; i += 500) { const batch = writeBatch(db); snapshot.docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref)); await batch.commit(); } setUploadedFileName(""); setImportSuccess(`Deleted ${snapshot.docs.length} events.`); } catch (err: any) { setAuthError(`Delete failed: ${err.message || err}`); } finally { setDeleting(false); } }} disabled={deleting}>
                                    {deleting ? "Deleting..." : "Remove all"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="text-small leading-small text-text-secondary mb-3">No calendar imported yet. Upload a .ics file to get started.</p>
                                <button className="rounded-[12px] bg-accent px-4 py-2.5 text-small leading-small font-medium text-white hover:bg-accent-dark transition-colors" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                                  {importing ? "Importing..." : "Import .ics file"}
                                </button>
                              </div>
                            )}
                            {authError && <p className="mt-3 text-caption leading-caption text-red-500">{authError}</p>}
                            {importSuccess && <p className="mt-3 text-caption leading-caption font-medium" style={{ color: "#6F8F7A" }}>{importSuccess}</p>}
                          </div>
                        </div>
                      )}

                      {settingsTab === "tasks" && (
                        <div>
                          <h2 className="text-title leading-title font-medium text-text-strong">Tasks</h2>
                          <p className="mt-1 text-small leading-small text-text-secondary">Manage your task preferences</p>
                          <div className="mt-6 border-t border-divider pt-6">
                            <p className="text-small leading-small text-text-secondary">Additional task settings will be available in future updates.</p>
                          </div>
                        </div>
                      )}

                      {settingsTab === "appearance" && (
                        <div>
                          <h2 className="text-title leading-title font-medium text-text-strong">Appearance</h2>
                          <p className="mt-1 text-small leading-small text-text-secondary">Customize how Kali looks</p>
                          <div className="mt-6 border-t border-divider pt-6">
                            <p className="text-small leading-small text-text-secondary">Appearance settings will be available in future updates.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ics"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !user) return;
                      setIcsFile(file);
                      setImporting(true);
                      setAuthError("");
                      setImportSuccess("");
                      try {
                        const content = await file.text();
                        const parsed = parseIcsFile(content);
                        if (parsed.length === 0) {
                          setAuthError("No events found in the file.");
                          return;
                        }
                        await importEventsToFirestore(user.uid, parsed);
                        setUploadedFileName(file.name);
                        setIcsFile(null);
                        setImportSuccess(`Successfully imported ${parsed.length} event${parsed.length > 1 ? "s" : ""}!`);
                      } catch (err: any) {
                        console.error("ICS import failed:", err);
                        setAuthError(`Import failed: ${err.message || err}`);
                      } finally {
                        setImporting(false);
                        e.target.value = "";
                      }
                    }}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile bottom nav - hidden on desktop */}
        {activeTab !== "calendar" && (
          <div className="lg:hidden">
            <BottomNav items={navItems} onItemPress={handleNavItemPress} />
          </div>
        )}

        {/* Chat popover modal (voice) */}
        <Chat open={chatOpen} onClose={() => setChatOpen(false)} userId={user.uid} />

        {/* Floating assistant */}
        <FloatingAssistant
          open={assistantOpen}
          onClose={() => setAssistantOpen(false)}
          userId={user.uid}
          events={events}
        />
      </div>
    </div>
  );
}
