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
import { ChatBar } from "./home/features/tasks/ChatBar";
import Chat from "./pages/Chat";
import { parseIcsFile } from "./lib/icsParser";
import { importEventsToFirestore } from "./lib/importEvents";
import { useEvents } from "./lib/useEvents";

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
  // When on the tasks page, controls whether we show ChatBar (true) or BottomNav (false)
  const [showChatBar, setShowChatBar] = useState(true);
  // Chat popover open state
  const [chatOpen, setChatOpen] = useState(false);

  const { events } = useEvents(user?.uid);

  // Reset to chat bar whenever we enter the tasks or calendar tab
  useEffect(() => {
    if (activeTab === "tasks" || activeTab === "calendar") {
      setShowChatBar(true);
    }
  }, [activeTab]);

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
        // SIGN IN
        await signInWithEmailAndPassword(auth, email, password);
        console.log("Signed in");
        // onAuthStateChanged will set user, app renders main view
      } else {
        // SIGN UP
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
        // Go to ICS upload step instead of entering app
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
            <p className="mt-3 text-[14px] font-semibold leading-5 text-text-secondary">
              Welcome to Kali!
            </p>
            <h1 className="mt-1 font-serif text-[30px] leading-[36px] tracking-[-0.3px] text-text-strong">
              Let's get you organized.
            </h1>

            <div className="mt-10 flex w-full flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setStep(1); setAuthError(""); }}
                className="flex h-14 w-full items-center justify-center rounded-[8px] bg-surface text-[15px] font-medium text-text-strong transition-colors hover:bg-subtle-fill"
              >
                Sign in with email
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setStep(1); setAuthError(""); }}
                className="text-[15px] leading-5 text-accent"
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
            <h1 className="font-serif text-[40px] leading-[44px] tracking-[-0.3px] text-text-strong">
              {isLogin ? "Sign in" : "Sign up"}
            </h1>
            <p className="mt-3 text-[16px] leading-6 text-text-strong">
              Use your email to import your calendar data and enjoy a smooth experience with Kali.
            </p>

            <div className="mt-8">
              <input
                className="h-14 w-full rounded-[12px] bg-surface px-5 text-[16px] leading-5 text-text-strong placeholder:text-text-tertiary focus:outline-none"
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
            <h1 className="font-serif text-[40px] leading-[44px] tracking-[-0.3px] text-text-strong">
              {isLogin ? "Sign in" : "Sign up"}
            </h1>
            <p className="mt-3 text-[16px] leading-6 text-text-strong">
              Use your email to import your calendar data and enjoy a smooth experience with Kali.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <input
                className="h-14 w-full rounded-[12px] bg-surface px-5 text-[16px] leading-5 text-text-strong placeholder:text-text-tertiary"
                value={email}
                readOnly
              />
              <input
                className="h-14 w-full rounded-[12px] bg-surface px-5 text-[16px] leading-5 text-text-strong placeholder:text-text-tertiary focus:outline-none"
                placeholder="Enter your password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && password) handleAuth(); }}
              />
              {authError && (
                <p className="text-[13px] leading-4 text-red-500">{authError}</p>
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
            <p className="text-[14px] leading-5 text-text-strong max-w-[280px]">
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
              <p className="mt-2 text-[13px] leading-5 text-text-tertiary text-center">
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
              <p className="mt-3 text-[13px] leading-4 text-red-500">{authError}</p>
            )}
            {importSuccess && (
              <p className="mt-3 text-[13px] leading-4 font-medium" style={{ color: "#6F8F7A" }}>{importSuccess}</p>
            )}

            <div className="mt-12 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="text-[13px] leading-5 text-text-secondary"
              >
                Skip for now
              </button>
              <ArrowButton onClick={handleIcsUpload} disabled={!icsFile || importing} />
            </div>
          </div>
        </div>
      );
    }

    // Fallback to welcome (shouldn't reach here)
    return null;
  }

  // Tasks page has no selected nav item
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

  const hasChatBar = activeTab === "tasks" || activeTab === "calendar";

  const handleNavItemPress = (id: string) => {
    if (id === "chat") {
      setChatOpen(true);
      return;
    }
    if (hasChatBar && id === "chat") {
      setShowChatBar(true);
      return;
    }
    setActiveTab(id);
  };

  return (
    <div className="flex flex-col">
      <div className="pb-24">
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
                userName={user.displayName || user.email?.split("@")[0] || "there"}
              />
            )}
            {/* Chat is now a popover, not a page */}
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
            {activeTab === "profile" && (
              <div className="relative mx-auto max-w-[402px] bg-background pb-28">
                <header className="flex items-end justify-between px-lg pt-5xl pb-2xl">
                  <div className="flex flex-col gap-xs">
                    <h1 className="font-serif text-[28px] leading-[34px] tracking-[-0.3px] text-text-strong">
                      Profile
                    </h1>
                  </div>
                </header>

                <div className="mx-lg space-y-lg">
                  <div className="rounded-[16px] bg-surface p-2xl shadow-subtle">
                    <div className="flex items-center justify-between border-b border-divider pb-lg">
                      <div className="space-y-xs">
                        <p className="text-[12px] uppercase tracking-[0.12em] text-text-tertiary">
                          Email
                        </p>
                        <p className="text-[17px] leading-6 text-text-strong">
                          {user.email}
                        </p>
                      </div>
                      <span className="rounded-full border border-border px-md py-xs text-[12px] leading-4 text-text-secondary">
                        Primary
                      </span>
                    </div>
                    <div className="pt-lg text-[14px] leading-5 text-text-secondary">
                      Member since just now.
                    </div>
                  </div>
                  <div className="rounded-[16px] bg-surface p-2xl shadow-subtle">
                    <div className="space-y-xs">
                      <p className="text-[12px] uppercase tracking-[0.12em] text-text-tertiary">
                        Calendar
                      </p>
                      <p className="text-[17px] leading-6 text-text-strong">
                        {uploadedFileName ? "Calendar uploaded" : "Upload your calendar"}
                      </p>
                    </div>

                    {uploadedFileName ? (
                      <div className="mt-lg space-y-3">
                        {/* Uploaded file display */}
                        <div className="flex items-center gap-3 rounded-[12px] bg-background px-4 py-3">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6F8F7A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span className="flex-1 truncate text-[14px] font-medium text-text-strong">
                            {uploadedFileName}
                          </span>
                          <span className="text-[12px] leading-4 font-medium" style={{ color: "#6F8F7A" }}>
                            {events.length} event{events.length !== 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* Add another file */}
                        <button
                          className="flex h-11 w-full items-center justify-center rounded-full border border-dashed border-border text-[13px] font-medium text-text-secondary transition-colors hover:bg-subtle-fill"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={importing}
                        >
                          {importing ? "Importing…" : "Add another .ics file"}
                        </button>

                        {/* Remove file & delete all events */}
                        <button
                          className="flex h-11 w-full items-center justify-center rounded-full text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50"
                          onClick={async () => {
                            if (!user || deleting) return;
                            setDeleting(true);
                            setAuthError("");
                            setImportSuccess("");
                            try {
                              const eventsCol = collection(db, "users", user.uid, "events");
                              const snapshot = await getDocs(eventsCol);
                              // Delete in batches of 500
                              for (let i = 0; i < snapshot.docs.length; i += 500) {
                                const batch = writeBatch(db);
                                snapshot.docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref));
                                await batch.commit();
                              }
                              setUploadedFileName("");
                              setImportSuccess(`Deleted ${snapshot.docs.length} event${snapshot.docs.length !== 1 ? "s" : ""}.`);
                            } catch (err: any) {
                              console.error("Delete events failed:", err);
                              setAuthError(`Delete failed: ${err.message || err}`);
                            } finally {
                              setDeleting(false);
                            }
                          }}
                          disabled={deleting}
                        >
                          {deleting ? "Deleting…" : "Remove file & delete all events"}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-lg">
                        <button
                          className="flex h-12 w-full items-center justify-center rounded-full border border-dashed border-border text-[14px] font-medium text-text-secondary transition-colors hover:bg-subtle-fill"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={importing}
                        >
                          {importing
                            ? "Importing…"
                            : icsFile
                              ? icsFile.name
                              : "Choose .ics file"}
                        </button>
                      </div>
                    )}

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

                    {authError && (
                      <p className="mt-2 text-[13px] leading-4 text-red-500">{authError}</p>
                    )}
                    {importSuccess && (
                      <p className="mt-2 text-[13px] leading-4 font-medium" style={{ color: "#6F8F7A" }}>{importSuccess}</p>
                    )}
                  </div>

                  <button
                    className="h-12 w-full rounded-full border border-border text-[14px] font-medium text-text-strong transition-colors hover:bg-subtle-fill"
                    onClick={() => signOut(auth)}
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {activeTab !== "calendar" && (
        <BottomNav items={navItems} onItemPress={handleNavItemPress} />
      )}

      {/* Chat popover modal */}
      <Chat open={chatOpen} onClose={() => setChatOpen(false)} userId={user.uid} />
    </div>
  );
}
