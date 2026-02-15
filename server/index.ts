import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { adminAuth, adminDb, Timestamp } from "./firebaseAdmin";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import OpenAI from "openai";


dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();

app.use(cors());
app.use(express.json());

/**
 * Health check route
 */
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "Server running" });
});

const upload = multer({ dest: "uploads/" });

app.post("/api/transcribe", upload.single("audio"), async (req: any, res) => {
  console.log("🔥 /api/transcribe hit");

  const audioPath = req.file?.path;

  if (!audioPath) {
    console.log("No file uploaded");
    return res.status(400).json({ error: "No audio uploaded" });
  }

  console.log("Audio saved at:", audioPath);

  // Rename with proper extension so OpenAI accepts it
  const ext = req.file?.originalname?.split(".").pop() || "webm";
  const properPath = audioPath + "." + ext;
  fs.renameSync(audioPath, properPath);

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(properPath),
      model: "whisper-1",
    });

    console.log("Transcript:", transcription.text);

    fs.unlinkSync(properPath);

    res.json({ transcript: transcription.text });
  } catch (error: any) {
    console.error("Whisper API error:", error.message || error);
    console.error("Full error:", JSON.stringify(error, null, 2));

    if (fs.existsSync(properPath)) fs.unlinkSync(properPath);

    res.status(500).json({ error: "Transcription failed", detail: error.message });
  }
});


app.post("/api/parse-transcript", async (req: Request, res: Response) => {
  const { transcript, userId, timeZone, clientDate } = req.body;

  if (!transcript || !userId) {
    return res.status(400).json({ error: "transcript and userId are required" });
  }

  const formatDateInTimeZone = (date: Date, tz?: string) => {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(date);
      const y = parts.find((p) => p.type === "year")?.value;
      const m = parts.find((p) => p.type === "month")?.value;
      const d = parts.find((p) => p.type === "day")?.value;
      if (y && m && d) return `${y}-${m}-${d}`;
    } catch {
      // Fallback to server-local date if timezone is invalid
    }
    const local = new Date(date);
    const y = local.getFullYear();
    const m = String(local.getMonth() + 1).padStart(2, "0");
    const d = String(local.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const tz = typeof timeZone === "string" && timeZone.trim() ? timeZone : undefined;
  const clientToday =
    typeof clientDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(clientDate)
      ? clientDate
      : undefined;
  const today = clientToday || formatDateInTimeZone(new Date(), tz);
  const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  const extractSingleWeekday = (text: string) => {
    const lower = text.toLowerCase();
    const found = new Set<number>();
    weekdayNames.forEach((name, idx) => {
      const re = new RegExp(`\\b${name}\\b`, "i");
      if (re.test(lower)) found.add(idx);
    });
    if (found.size !== 1) return null;
    return Array.from(found)[0];
  };

  const hasExplicitDate = (text: string) => {
    const lower = text.toLowerCase();
    if (/\b\d{4}-\d{2}-\d{2}\b/.test(text)) return true;
    if (/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/.test(text)) return true;
    if (/\b\d{1,2}(st|nd|rd|th)\b/.test(lower)) return true;
    if (/\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b/.test(lower)) {
      return true;
    }
    return false;
  };

  const toYmd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const resolveWeekdayDate = (base: Date, weekday: number, isNext: boolean) => {
    const baseDay = base.getDay();
    let delta = (weekday - baseDay + 7) % 7;
    if (isNext && delta === 0) delta = 7;
    const result = new Date(base);
    result.setDate(base.getDate() + delta);
    return result;
  };

  try {
    // Fetch existing items so GPT can match deletion requests
    const existingTasks: any[] = [];
    const existingEvents: any[] = [];
    const tasksSnap = await adminDb.collection("users").doc(userId).collection("tasks").get();
    tasksSnap.forEach((d) => existingTasks.push({ id: d.id, ...d.data() }));
    const eventsSnap = await adminDb.collection("users").doc(userId).collection("events").get();
    eventsSnap.forEach((d) => existingEvents.push({ id: d.id, ...d.data() }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an assistant that extracts actionable tasks and calendar events from voice transcripts, and also detects requests to remove existing items.
Today's date is ${today}. Use this as the authoritative "today" when resolving relative dates.
Return JSON only with this schema:
{
  "tasks": [{ "title": string, "dueDate": "YYYY-MM-DD", "description": string, "category": "protect"|"progress"|"maintain"|"flourish" }],
  "events": [{ "title": string, "start": "ISO 8601", "end": "ISO 8601", "description": string }],
  "deletions": [{ "id": string, "type": "task"|"event", "title": string }]
}

Rules for ADDITIONS:
- "Meeting with X" or time-specific activities → event
- "Assignment due" / "need to do" / action items → task
- Resolve relative dates: "next Monday", "tomorrow", "Friday", etc. relative to today
- Category mapping: academic/work → "progress", health/self-care → "protect", social/relationships → "maintain", hobbies/personal growth → "flourish"
- If no end time for an event, default to 1 hour after start

Rules for DELETIONS:
- Phrases like "remove", "delete", "cancel", "I don't have X anymore", "never mind about X" → deletion
- Match against the user's existing items below and return their exact id, type, and title
- Only return deletions for items that clearly match

Existing tasks: ${JSON.stringify(existingTasks.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate })))}
Existing events: ${JSON.stringify(existingEvents.map((e) => ({ id: e.id, title: e.title, start: e.start })))}

If no items found for any category, return empty arrays.`,
        },
        { role: "user", content: transcript },
      ],
    });

    const parsed = JSON.parse(completion.choices[0].message.content || "{}");

    // Post-process: fix mismatched weekday resolutions (e.g., "Monday" -> wrong date)
    const weekday = extractSingleWeekday(transcript);
    if (weekday !== null && !hasExplicitDate(transcript)) {
      const base = new Date(`${today}T00:00:00`);
      const lower = transcript.toLowerCase();
      const weekdayName = weekdayNames[weekday];
      const isNext = new RegExp(`\\bnext\\s+${weekdayName}\\b`, "i").test(lower);
      const targetDate = resolveWeekdayDate(base, weekday, isNext);

      if (Array.isArray(parsed.events)) {
        parsed.events = parsed.events.map((event: any) => {
          if (!event?.start || !event?.end) return event;
          const start = new Date(event.start);
          const end = new Date(event.end);
          if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return event;
          if (start.getDay() === weekday) return event;
          const durationMs = end.getTime() - start.getTime();
          const fixedStart = new Date(start);
          fixedStart.setFullYear(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
          const fixedEnd = new Date(fixedStart.getTime() + durationMs);
          return { ...event, start: fixedStart.toISOString(), end: fixedEnd.toISOString() };
        });
      }

      if (Array.isArray(parsed.tasks)) {
        parsed.tasks = parsed.tasks.map((task: any) => {
          if (!task?.dueDate) return task;
          const due = new Date(`${task.dueDate}T00:00:00`);
          if (Number.isNaN(due.getTime())) return task;
          if (due.getDay() === weekday) return task;
          return { ...task, dueDate: toYmd(targetDate) };
        });
      }
    }

    res.json({
      tasks: parsed.tasks || [],
      events: parsed.events || [],
      deletions: parsed.deletions || [],
    });
  } catch (error: any) {
    console.error("Parse transcript error:", error.message || error);
    res.status(500).json({ error: "Failed to parse transcript", detail: error.message });
  }
});

app.post("/api/save-item", async (req: Request, res: Response) => {
  console.log("🔥 /api/save-item hit", JSON.stringify(req.body, null, 2));
  const { userId, type, item } = req.body;

  if (!userId || !type || !item) {
    return res.status(400).json({ error: "userId, type, and item are required" });
  }

  try {
    const collection = type === "task" ? "tasks" : "events";
    const data =
      type === "task"
        ? {
            title: item.title,
            dueDate: item.dueDate,
            description: item.description || "",
            category: item.category || "progress",
            completed: false,
            createdAt: Timestamp.now(),
          }
        : {
            title: item.title,
            start: Timestamp.fromDate(new Date(item.start)),
            end: Timestamp.fromDate(new Date(item.end)),
            description: item.description || "",
            location: "",
            allDay: false,
            createdAt: Timestamp.now(),
          };

    console.log("Saving to:", `users/${userId}/${collection}`, JSON.stringify(data, null, 2));
    const docRef = await adminDb.collection("users").doc(userId).collection(collection).add(data);
    console.log("✅ Saved with ID:", docRef.id);
    res.json({ id: docRef.id });
  } catch (error: any) {
    console.error("Save item error:", error.message || error);
    res.status(500).json({ error: "Failed to save item", detail: error.message });
  }
});

app.post("/api/delete-item", async (req: Request, res: Response) => {
  const { userId, type, itemId } = req.body;

  if (!userId || !type || !itemId) {
    return res.status(400).json({ error: "userId, type, and itemId are required" });
  }

  try {
    const collection = type === "task" ? "tasks" : "events";
    await adminDb.collection("users").doc(userId).collection(collection).doc(itemId).delete();
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete item error:", error.message || error);
    res.status(500).json({ error: "Failed to delete item", detail: error.message });
  }
});

/**
 * Firebase ID Token verification middleware
 */
async function verifyToken(
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split("Bearer ")[1];

    const decoded = await adminAuth.verifyIdToken(token);

    req.user = decoded;

    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
}

/**
 * Protected test route
 */
app.get(
  "/api/protected",
  verifyToken,
  (req: Request & { user?: any }, res: Response) => {
    res.json({
      message: "You are verified",
      uid: req.user?.uid,
    });
  }
);

const PORT = 5001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
