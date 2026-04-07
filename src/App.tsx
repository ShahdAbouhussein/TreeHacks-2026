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
import { parseIcsFile } from "./lib/icsParser";
import { importEventsToFirestore } from "./lib/importEvents";
import { useEvents } from "./lib/useEvents";
import { DesktopSidebar } from "./components/DesktopSidebar";

const KaliLogo = () => (
  <svg width="49" height="39" viewBox="0 0 49 39" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M40.1328 0.030652C41.8301 -0.200838 44.4242 0.924777 45.8063 1.86093C47.2807 2.85959 48.5803 4.33524 48.9059 6.11753C49.1179 7.27843 48.9955 8.66324 48.2933 9.64301C45.6498 13.3299 36.1121 14.7777 31.7339 15.3079C30.7629 15.4251 29.7899 15.5256 28.8156 15.6094C28.4076 15.6458 27.9599 15.6708 27.551 15.7154C27.4835 15.7228 27.4641 15.7685 27.4384 15.8142C27.4374 17.114 34.8789 20.3045 36.2391 20.9446C36.6579 21.1433 37.0698 21.3562 37.4735 21.583C38.8204 22.3404 40.0227 23.2028 41.094 24.2935C43.1221 26.3586 44.2149 28.9427 44.1188 31.826C44.1098 32.0979 44.104 32.6661 44.0265 32.9126C43.7268 33.8636 42.8678 34.9103 42.1576 35.5809C40.4625 37.1818 38.3303 38.0833 35.9753 38.0145C34.275 37.9646 32.5219 37.5287 31.115 36.5613C27.9722 34.4002 26.3571 30.1019 25.533 26.5798C25.3369 25.7238 25.1684 24.8619 25.028 23.9954C24.9593 23.5702 24.9104 22.7519 24.8196 22.3863C24.6396 21.6619 23.994 20.5228 23.465 19.9841C23.1505 19.6638 22.71 19.3714 22.247 19.3732C21.9286 19.3745 21.411 19.5801 21.1916 19.8119C20.4372 20.6089 20.804 21.7553 20.8677 22.6999C20.9133 23.3644 20.9343 24.0302 20.9307 24.696C20.929 28.1582 20.1842 31.6617 18.6754 34.7989C18.4044 35.3624 17.9894 36.213 17.5232 36.6338C15.4722 38.4378 12.1491 39.0003 9.48248 39C7.28493 38.9997 4.77996 38.4356 3.20479 36.8526C2.47697 36.0698 2.02847 34.9176 2.06889 33.8493C2.26728 28.6087 5.87401 24.024 9.94391 20.9518C10.8159 20.2935 11.8868 19.6977 12.8148 19.0961C14.4975 18.0088 16.151 16.8779 17.7736 15.7046C19.0508 14.7733 20.3919 13.7365 21.5161 12.6311C21.8766 12.2459 22.7302 11.3976 22.6529 10.8392C22.4981 9.72276 21.3866 9.82168 20.6363 10.1991C19.488 10.7769 18.7255 11.6241 17.779 12.4268C16.2713 13.7029 14.8124 15.0346 13.1296 16.0922C12.3512 16.5813 11.041 17.0427 10.161 17.384C9.84634 17.5061 8.36765 17.6897 7.99306 17.6807C5.93169 17.6312 3.56187 16.8393 2.00107 15.4835C1.75095 15.2592 1.31753 14.785 1.1738 14.5178C0.575788 13.4059 0.0585924 11.9605 0.00460554 10.7012C-0.0531781 9.35317 0.43516 8.40385 1.3352 7.44466C1.83415 6.91292 2.65277 6.22554 3.28944 5.90241C4.67542 5.19893 6.2873 4.66945 7.78014 4.24057C10.5818 3.44947 13.4305 2.83105 16.3098 2.3889C18.2495 2.08339 20.286 1.83393 22.2456 1.76012C23.8504 1.74569 26.1522 1.60406 27.3917 2.80955C29.1071 4.47781 28.516 7.66571 27.6318 9.61979C27.1134 10.7966 25.8072 12.4664 25.7704 13.7549C25.7351 14.9926 29.0175 12.8822 29.3343 12.6622C30.8353 11.6198 32.3086 10.3844 33.2357 8.79669C33.5921 8.18626 33.8868 7.43657 34.1564 6.78499C34.464 6.03031 34.7797 5.279 35.1042 4.53122C35.4432 3.75642 36.055 2.4739 36.6172 1.83911C37.3465 1.01547 39.0176 0.118624 40.1328 0.030652Z" fill="#6F8F7A"/>
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
      // Desktop: render as full page. Mobile: open modal.
      if (window.innerWidth >= 1024) {
        setActiveTab("chat");
      } else {
        setChatOpen(true);
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

        {/* Chat popover modal */}
        <Chat open={chatOpen} onClose={() => setChatOpen(false)} userId={user.uid} />
      </div>
    </div>
  );
}
