import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
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

    const q = query(
      collection(db, "users", userId, "events"),
      orderBy("start", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const result: CalendarEvent[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title ?? "Untitled",
          start: data.start?.toDate() ?? new Date(),
          end: data.end?.toDate() ?? new Date(),
          description: data.description ?? "",
          location: data.location ?? "",
          allDay: data.allDay ?? false,
        };
      });
      setEvents(result);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { events, loading };
}
