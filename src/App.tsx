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
      <div style={{ padding: 40 }}>
        <h1>{isLogin ? "Sign In" : "Sign Up"}</h1>

        <input placeholder="email" onChange={(e) => setEmail(e.target.value)} />

        <input
          placeholder="password"
          type="password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleAuth}>{isLogin ? "Sign In" : "Sign Up"}</button>

        <p
          style={{ cursor: "pointer", marginTop: 10 }}
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin
            ? "Don't have an account? Sign Up"
            : "Already have an account? Sign In"}
        </p>
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
          <div className="p-6">
            <div className="mb-4">
              Logged in as <strong>{user.email}</strong>
            </div>
            <button
              className="bg-black text-white px-4 py-2"
              onClick={() => signOut(auth)}
            >
              Log Out
            </button>
          </div>
        )}
      </div>

      <BottomNav items={navItems} onItemPress={(id) => setActiveTab(id)} />
    </div>
  );
}
