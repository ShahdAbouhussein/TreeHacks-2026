import { useEffect, useState } from "react";
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

const Chat = () => <div>Chat coming soon.</div>;
const Tasks = () => <div>Tasks coming soon.</div>;

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuth = async () => {
    try {
      if (isLogin) {
        // SIGN IN
        await signInWithEmailAndPassword(auth, email, password);
        console.log("Signed in");
      } else {
        // SIGN UP
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          createdAt: new Date(),
        });

        console.log("User + Firestore doc created");
      }
    } catch (error: any) {
      console.error("Auth error:", error.code);
    }
  };

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative mx-auto flex min-h-screen max-w-[402px] flex-col px-lg pb-5xl">
          <header className="pt-5xl pb-3xl">
            <p className="text-[15px] leading-5 text-text-secondary">
              {isLogin ? "Welcome back." : "Start your routine."}
            </p>
            <h1 className="font-serif text-[30px] leading-[36px] tracking-[-0.3px] text-text-strong">
              {isLogin ? "Sign in" : "Sign up"}
            </h1>
          </header>

          <div className="rounded-[16px] bg-surface p-2xl shadow-subtle">
            <div className="flex flex-col gap-lg">
              <label className="flex flex-col gap-sm text-[12px] uppercase tracking-[0.12em] text-text-tertiary">
                Email
                <input
                  className="h-12 rounded-[12px] border border-border bg-surface px-lg text-[15px] leading-5 text-text-strong placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                  placeholder="you@stanford.edu"
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-sm text-[12px] uppercase tracking-[0.12em] text-text-tertiary">
                Password
                <input
                  className="h-12 rounded-[12px] border border-border bg-surface px-lg text-[15px] leading-5 text-text-strong placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                  placeholder="••••••••"
                  type="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleAuth}
              className="mt-2xl flex h-12 w-full items-center justify-center rounded-full bg-accent text-[15px] font-medium text-white shadow-subtle transition-colors hover:bg-accent-dark"
            >
              {isLogin ? "Sign in" : "Create account"}
            </button>
          </div>

          <button
            type="button"
            className="mt-xl text-center text-[14px] leading-5 text-text-secondary"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    );
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
      id: "tasks",
      label: "Tasks",
      icon: "calendar" as const,
      isActive: activeTab === "tasks",
    },
    {
      id: "profile",
      label: "Profile",
      icon: "profile" as const,
      isActive: activeTab === "profile",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 pb-24">
        {activeTab === "home" && <Home />}
        {activeTab === "chat" && <Chat />}
        {activeTab === "tasks" && <Tasks />}
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

      <BottomNav items={navItems} onItemPress={(id) => setActiveTab(id)} />
    </div>
  );
}
