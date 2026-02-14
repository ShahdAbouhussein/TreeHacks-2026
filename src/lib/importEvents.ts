import { db } from "./firebase";
import { collection, writeBatch, doc, Timestamp } from "firebase/firestore";
import type { ParsedEvent } from "./icsParser";

export async function importEventsToFirestore(
  userId: string,
  events: ParsedEvent[]
): Promise<void> {
  const eventsCol = collection(db, "users", userId, "events");

  // Firestore batches support max 500 writes
  for (let i = 0; i < events.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = events.slice(i, i + 500);

    for (const event of chunk) {
      const ref = doc(eventsCol);
      batch.set(ref, {
        title: event.title,
        start: Timestamp.fromDate(event.start),
        end: Timestamp.fromDate(event.end),
        description: event.description,
        location: event.location,
        allDay: event.allDay,
        source: "ics" as const,
        createdAt: Timestamp.now(),
      });
    }

    await batch.commit();
  }
}
