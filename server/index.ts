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
  const { transcript, userId } = req.body;

  if (!transcript || !userId) {
    return res.status(400).json({ error: "transcript and userId are required" });
  }

  const today = new Date().toISOString().split("T")[0];

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
Today's date is ${today}. Return JSON only with this schema:
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
