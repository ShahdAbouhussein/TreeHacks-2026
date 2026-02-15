import { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "./firebase";

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description: string;
  location: string;
  allDay: boolean;
}

export function useEvents(userId: string | undefined) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "users", userId, "events"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const result: CalendarEvent[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        // Handle both Firestore Timestamps and ISO strings
        const toDate = (val: any): Date => {
          if (!val) return new Date();
          if (typeof val.toDate === "function") return val.toDate();
          if (typeof val === "string") return new Date(val);
          return new Date();
        };
        return {
          id: doc.id,
          title: data.title ?? "Untitled",
          start: toDate(data.start),
          end: toDate(data.end),
          description: data.description ?? "",
          location: data.location ?? "",
          allDay: data.allDay ?? false,
        };
      });
      // Sort client-side to handle mixed Timestamp/string fields
      result.sort((a, b) => a.start.getTime() - b.start.getTime());
      setEvents(result);
      setLoading(false);
    }, (error) => {
      console.error("Events listener error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { events, loading };
}
