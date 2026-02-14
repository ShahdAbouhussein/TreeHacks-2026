import { useEffect, useState, useRef } from "react";
import { auth, db } from "./lib/firebase";
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import Home from "./home/App";
import { BottomNav } from "./home/features/home/components/BottomNav";
import TasksPage from "./home/features/tasks/TasksPage";
import CalendarPage from "./home/features/calendar/CalendarPage";
import { ChatBar } from "./home/features/tasks/ChatBar";
import { parseIcsFile } from "./lib/icsParser";
import { importEventsToFirestore } from "./lib/importEvents";
import { useEvents } from "./lib/useEvents";

const KaliLogo = () => (
  <svg width="44" height="38" viewBox="0 0 22 19" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.68701 0.00394624C8.06331 -0.0388464 9.02572 0.261755 10.1113 1.13271C11.1055 1.9304 11.854 3.44303 11.971 4.70761C12.0422 5.44655 11.9821 6.19221 11.7932 6.91024C11.5853 7.66966 11.3461 8.16067 11.0455 8.87035L9.89245 11.5847L8.73745 14.3218C8.30443 15.3759 7.91543 16.5074 7.19724 17.4064C5.82909 19.1191 3.03353 19.5759 1.30295 18.161C0.705558 17.6726 0.118327 16.8432 0.0483734 16.0587C-0.0529622 15.142 -0.0145136 14.2175 0.352159 13.3604C1.58701 10.4741 4.8361 9.62233 7.46297 8.47552C7.85438 8.30465 8.22265 8.11526 8.62397 7.96382C8.55328 7.81997 8.49063 7.67159 8.42672 7.52456C8.2144 7.57705 7.91283 7.73441 7.6996 7.82462C6.84176 8.18758 6.24533 8.50823 5.2927 8.56713C4.2673 8.63053 3.31418 8.36888 2.53882 7.67429C1.82602 7.03242 1.39746 6.13468 1.34711 5.17799C1.27677 3.88953 1.72758 2.62678 2.59845 1.67281C3.22685 0.980074 4.04139 0.530213 4.92774 0.246234C5.48722 0.0669847 6.10145 0.0339599 6.68701 0.00394624Z" fill="#6F8F7A"/>
    <path d="M18.0545 0.00680792C19.6614 -0.0881582 21.1488 0.816956 21.7406 2.31215C22.1712 3.39961 22.0277 4.62162 21.5889 5.67975C20.7623 7.6735 18.7759 8.74793 16.8831 9.54467C16.6583 9.63966 16.346 9.73487 16.1423 9.82903C15.429 10.1629 14.6852 10.423 13.9797 10.7721C13.8289 10.8467 13.4611 10.8981 13.4003 11.0463C13.4136 11.1765 13.496 11.3375 13.5507 11.4612C14.2801 11.2025 14.917 10.8547 15.6675 10.6223C16.7033 10.2978 17.839 10.3444 18.7993 10.8753C20.6448 11.8955 20.9461 14.0601 20.2826 15.908C20.2088 16.1134 20.0072 16.4371 19.9015 16.6376C19.3017 17.7183 17.8266 18.631 16.6325 18.8233C16.264 18.8826 15.9228 18.9271 15.5577 18.968C12.5699 19.3029 10.1419 16.9653 10.0107 14.0414C9.91954 12.2827 10.4232 11.2706 11.0947 9.71745L12.3077 6.87547L13.3743 4.3467C13.8394 3.21325 14.2176 2.04347 15.1612 1.18806C16.0775 0.357464 16.8538 0.081543 18.0545 0.00680792Z" fill="#6F8F7A"/>
  </svg>
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

const Chat = () => <div>Chat coming soon.</div>;
import Chat from "./pages/Chat";
const Calendar = () => <div>Calendar coming soon.</div>;

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("home");
  // When on the tasks page, controls whether we show ChatBar (true) or BottomNav (false)
  const [showChatBar, setShowChatBar] = useState(true);

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
    try {
      const content = await icsFile.text();
      console.log("ICS file length:", content.length);
      const events = parseIcsFile(content);
      console.log("Parsed events:", events.length, events.slice(0, 2));
      if (events.length === 0) {
        setAuthError("No events found in the file. Make sure it's a valid .ics file.");
        return;
      }
      await importEventsToFirestore(user.uid, events);
      console.log(`Imported ${events.length} events`);
      setStep(0);
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
        <div className="flex min-h-screen items-center justify-center bg-background">
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
        <div className="flex min-h-screen items-center justify-center bg-background">
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
        <div className="flex min-h-screen items-center justify-center bg-background">
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

  const navItems = [
    {
      id: "home",
      label: "Home",
      icon: "home" as const,
      isActive: activeTab === "home",
    },
    {
      id: "chat",
      label: "Chat",
      icon: "chat" as const,
      isActive: activeTab === "chat",
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: "calendar" as const,
      isActive: activeTab === "calendar",
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
    if (hasChatBar && id === "chat") {
      // On tasks/calendar page, clicking chat in the normal nav switches back to chat bar
      setShowChatBar(true);
      return;
    }
    setActiveTab(id);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 pb-24">
        {activeTab === "home" && (
          <Home
            onSeeAllTasks={() => setActiveTab("tasks")}
            onNavPress={(id) => setActiveTab(id)}
            events={events}
            userId={user.uid}
            userName={user.displayName || user.email?.split("@")[0] || "there"}
          />
        )}
        {activeTab === "chat" && <Chat />}
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
          />
        )}
        {activeTab === "profile" && (
          <div className="relative mx-auto min-h-screen max-w-[402px] bg-background pb-28">
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
              <button
                className="h-12 w-full rounded-full border border-border text-[14px] font-medium text-text-strong transition-colors hover:bg-subtle-fill"
                onClick={() => signOut(auth)}
              >
                Log out
              </button>
            </div>
          </div>
        )}
      </div>

      {hasChatBar && showChatBar ? (
        <ChatBar onMenuPress={() => setShowChatBar(false)} />
      ) : (
        <BottomNav items={navItems} onItemPress={handleNavItemPress} />
      )}
    </div>
  );
}
