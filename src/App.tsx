import { useState } from "react";
import { auth } from "./lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./lib/firebase";


export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        createdAt: new Date(),
      });
  
      console.log("User + Firestore doc created");
    } catch (error: any) {
      console.error("Auth error:", error.code);
      console.error("Full error:", error);
    }
  };
  

  return (
    <div style={{ padding: 40 }}>
      <h1>Firebase Test</h1>
      <input
        placeholder="email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        placeholder="password"
        type="password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleSignup}>Sign Up</button>
    </div>
  );
}
