import { useEffect, useState } from "react";
import { auth, db } from "./lib/firebase";
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(false);

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

  return (
    <div style={{ padding: 40 }}>
      {user ? (
        <>
          <h2>Logged in as {user.email}</h2>
          <button onClick={() => signOut(auth)}>Log Out</button>
        </>
      ) : (
        <>
          <h1>{isLogin ? "Sign In" : "Sign Up"}</h1>

          <input
            placeholder="email"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            placeholder="password"
            type="password"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={handleAuth}>
            {isLogin ? "Sign In" : "Sign Up"}
          </button>

          <p
            style={{ cursor: "pointer", marginTop: 10 }}
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin
              ? "Don't have an account? Sign Up"
              : "Already have an account? Sign In"}
          </p>
        </>
      )}
    </div>
  );
}
