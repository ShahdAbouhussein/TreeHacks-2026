import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  description: string;
  tag: string;
  category: string;
  completed: boolean;
}

export function useTasks(userId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", userId, "tasks"),
      where("completed", "==", false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const result: Task[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title ?? "Untitled",
        dueDate: doc.data().dueDate ?? "",
        description: doc.data().description ?? "",
        tag: doc.data().tag ?? "",
        category: doc.data().category ?? "",
        completed: doc.data().completed ?? false,
      }));
      setTasks(result);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { tasks, loading };
}
