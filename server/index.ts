import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { adminAuth, adminDb, Timestamp } from "./firebaseAdmin";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
// pdf2json loaded via require in the handler to avoid ESM/CJS issues


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

    // Check each parsed event for overlaps with existing calendar events
    const parsedEventsWithOverlaps = (parsed.events || []).map((pe: any) => {
      if (!pe.start || !pe.end) return pe;
      const peStart = new Date(pe.start);
      const peEnd = new Date(pe.end);
      if (isNaN(peStart.getTime()) || isNaN(peEnd.getTime())) return pe;

      const conflict = existingEvents.find((e: any) => {
        const eStart = e.start?.toDate ? e.start.toDate() : new Date(e.start);
        const eEnd = e.end?.toDate ? e.end.toDate() : new Date(e.end);
        if (isNaN(eStart.getTime()) || isNaN(eEnd.getTime())) return false;
        return eStart.getTime() < peEnd.getTime() && eEnd.getTime() > peStart.getTime();
      });

      if (conflict) {
        const cStart = conflict.start?.toDate ? conflict.start.toDate() : new Date(conflict.start);
        const cEnd = conflict.end?.toDate ? conflict.end.toDate() : new Date(conflict.end);
        return {
          ...pe,
          overlap: {
            title: conflict.title,
            start: cStart.toISOString(),
            end: cEnd.toISOString(),
          },
        };
      }
      return pe;
    });

    res.json({
      tasks: parsed.tasks || [],
      events: parsedEventsWithOverlaps,
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
    // Check for overlapping events before saving
    if (type === "event" && item.start && item.end) {
      const newStart = new Date(item.start);
      const newEnd = new Date(item.end);
      if (!isNaN(newStart.getTime()) && !isNaN(newEnd.getTime())) {
        const eventsSnap = await adminDb.collection("users").doc(userId).collection("events").get();
        const conflict = eventsSnap.docs.find((doc) => {
          const data = doc.data();
          const eStart = data.start?.toDate ? data.start.toDate() : new Date(data.start);
          const eEnd = data.end?.toDate ? data.end.toDate() : new Date(data.end);
          return eStart.getTime() < newEnd.getTime() && eEnd.getTime() > newStart.getTime();
        });
        if (conflict) {
          const cData = conflict.data();
          const cStart = cData.start?.toDate ? cData.start.toDate() : new Date(cData.start);
          const cEnd = cData.end?.toDate ? cData.end.toDate() : new Date(cData.end);
          return res.status(409).json({
            error: "Time conflict",
            conflict: {
              title: cData.title,
              start: cStart.toISOString(),
              end: cEnd.toISOString(),
            },
          });
        }
      }
    }

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

app.post("/api/daily-summary", async (req: Request, res: Response) => {
  const { tasks, events, userName } = req.body;

  if (!tasks && !events) {
    return res.status(400).json({ error: "tasks and events are required" });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a warm, concise personal assistant named Kali. Given a user's tasks and calendar events for today, write a short friendly summary paragraph (2-4 sentences max) of their day ahead. Address them by name if provided. Be natural and conversational — like a friend giving a quick rundown. Don't use bullet points or lists. Don't mention times unless they're important for context. Keep it under 50 words.`,
        },
        {
          role: "user",
          content: `User name: ${userName || "there"}\n\nToday's events:\n${JSON.stringify(events || [])}\n\nToday's tasks:\n${JSON.stringify(tasks || [])}`,
        },
      ],
    });

    const summary = completion.choices[0].message.content || "You have a clear day ahead!";
    res.json({ summary });
  } catch (error: any) {
    console.error("Daily summary error:", error.message || error);
    res.status(500).json({ error: "Failed to generate summary", detail: error.message });
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

// ─── POST /api/parse-project ───
app.post("/api/parse-project", async (req: Request, res: Response) => {
  const { text, userId } = req.body;

  if (!text || !userId) {
    return res.status(400).json({ error: "text and userId are required" });
  }

  try {
    const today = new Date().toLocaleDateString("en-CA");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert project planner. Carefully extract and infer project details from the user's description.

Return JSON with one of two formats:

If the user's message describes an actual project, assignment, or task:
{ "valid": true, "title": string, "description": string, "deadline": "YYYY-MM-DD", "estimatedHours": number, "subComponents": string[] }

If the user's message is a greeting, casual chat, question, or does NOT describe any project/assignment/task:
{ "valid": false, "reply": "<your friendly, natural response — greet them back and ask what project or assignment they'd like to plan>" }

Guidelines for valid projects:
- **title**: A concise, clear project name. If the user gives a course name + assignment (e.g. "CS109 Problem Set 3"), use that.
- **description**: A 1-2 sentence summary of what the project involves. Infer from context if not explicit.
- **deadline**: Parse any date mention carefully. Handle relative dates ("next Friday", "in 3 days", "March 20th", "due tomorrow", "end of week"). If the user says a day of the week, calculate the exact YYYY-MM-DD. Default to 2 weeks from today if nothing mentioned.
- **estimatedHours**: Be VERY conservative. Most assignments take 2-6 hours. A section/problem set: 1.5-4h. A reflection: 2-3h. A short homework: 1-3h. A research paper: 10-20h. A coding project: 6-15h. DO NOT overestimate.
- **subComponents**: Break into 3-6 concrete steps. Keep it focused — don't over-decompose simple tasks.

Today is ${today}. The current day of the week is ${new Date().toLocaleDateString("en-US", { weekday: "long" })}.`,
        },
        { role: "user", content: text },
      ],
    });

    const parsed = JSON.parse(completion.choices[0].message.content || "{}");

    // If the input wasn't a valid project description, return a chat reply instead
    if (parsed.valid === false) {
      return res.json({
        chatReply: parsed.reply || "Tell me about a project or assignment you'd like to plan!",
      });
    }

    const projectData = {
      title: parsed.title,
      description: parsed.description,
      deadline: parsed.deadline,
      estimatedHours: parsed.estimatedHours,
      status: "active",
      createdAt: Timestamp.now(),
    };

    const docRef = await adminDb
      .collection("users")
      .doc(userId)
      .collection("projects")
      .add(projectData);

    res.json({
      projectId: docRef.id,
      project: {
        title: parsed.title,
        description: parsed.description,
        deadline: parsed.deadline,
        estimatedHours: parsed.estimatedHours,
        subComponents: parsed.subComponents,
      },
    });
  } catch (error: any) {
    console.error("Parse project error:", error.message || error);
    res.status(500).json({ error: "Failed to parse project", detail: error.message });
  }
});

// ─── POST /api/generate-plan ───
app.post("/api/generate-plan", async (req: Request, res: Response) => {
  const { userId, projectId, project } = req.body;

  if (!userId || !projectId || !project) {
    return res.status(400).json({ error: "userId, projectId, and project are required" });
  }

  try {
    const today = new Date().toLocaleDateString("en-CA");
    const deadline = project.deadline;

    // Fetch events between today and deadline
    const eventsSnap = await adminDb
      .collection("users")
      .doc(userId)
      .collection("events")
      .get();

    const events: any[] = [];
    eventsSnap.forEach((doc) => {
      const data = doc.data();
      events.push({ id: doc.id, ...data });
    });

    // Filter events between today and deadline
    const relevantEvents = events.filter((e) => {
      const eventDate = e.start?.toDate
        ? e.start.toDate().toLocaleDateString("en-CA")
        : typeof e.start === "string"
          ? e.start.slice(0, 10)
          : null;
      return eventDate && eventDate >= today && eventDate <= deadline;
    });

    // Fetch incomplete tasks
    const tasksSnap = await adminDb
      .collection("users")
      .doc(userId)
      .collection("tasks")
      .where("completed", "==", false)
      .get();

    const existingTasks: any[] = [];
    tasksSnap.forEach((doc) => {
      const data = doc.data();
      existingTasks.push({ id: doc.id, ...data });
    });

    // Build day-by-day availability summary
    const startDate = new Date(`${today}T00:00:00`);
    const endDate = new Date(`${deadline}T00:00:00`);
    const availabilityMap: string[] = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toLocaleDateString("en-CA");
      const dayEventsCount = relevantEvents.filter((e) => {
        const eventDate = e.start?.toDate
          ? e.start.toDate().toLocaleDateString("en-CA")
          : typeof e.start === "string"
            ? e.start.slice(0, 10)
            : null;
        return eventDate === dateStr;
      }).length;

      const dayTasksCount = existingTasks.filter((t) => {
        const taskDate = t.scheduledDate || t.dueDate;
        return taskDate === dateStr;
      }).length;

      const estimatedBusyHours = dayEventsCount * 1.5 + dayTasksCount * 0.5;
      const freeHours = Math.max(0, Math.round(8 - estimatedBusyHours));
      const dayName = dayNames[d.getDay()];
      const monthName = monthNames[d.getMonth()];
      availabilityMap.push(`${dayName} ${monthName} ${d.getDate()}: ${dayEventsCount} events, ~${freeHours} free hours`);
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert project planning assistant. Given a project and the user's real calendar availability, create a realistic day-by-day work plan.

Return JSON: { tasks: [{ title: string, description: string, scheduledDate: "YYYY-MM-DD", estimatedMinutes: number, order: number }] }

CRITICAL RULES:
- **KEEP IT MINIMAL**: Create the FEWEST tasks possible. A 3-hour assignment needs 3-4 tasks, NOT 8. A 1-hour task might only need 2 tasks. NEVER create more than 6 tasks for a project under 5 hours. Max 8-10 tasks for large projects over 10 hours.
- **Total time MUST match estimatedHours**: If estimated at 3 hours, tasks total ~180 minutes. If 4 hours, ~240 minutes. Do the math. Do NOT exceed it.
- **Each task should be substantial**: Minimum 20 minutes per task. Don't create tiny 10-min tasks — combine related small steps into one task.
- **Vary durations realistically**: Reading: 30-45 min. Problem solving: 30-60 min. Writing: 30-45 min. Review: 15-20 min. NOT everything is 30 min.
- **Concrete & actionable**: Name tasks based on actual project content, not generic labels.
- **Distribute across 2-3 days max** for short assignments (under 5 hours). Don't spread a 3-hour assignment across a whole week.
- **Logical ordering**: Dependencies first. Research → work → review.
- **Don't pad or over-decompose**: If "solve problem 1" is one task, don't break it into "read problem 1", "think about problem 1", "solve problem 1".
- Today is ${today}. Current day: ${new Date().toLocaleDateString("en-US", { weekday: "long" })}.`,
        },
        {
          role: "user",
          content: `Project: ${JSON.stringify(project)}

Availability:
${availabilityMap.join("\n")}

Existing incomplete tasks: ${JSON.stringify(existingTasks.map((t) => ({ title: t.title, dueDate: t.dueDate })))}`,
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0].message.content || "{}");

    res.json({ tasks: parsed.tasks || [] });
  } catch (error: any) {
    console.error("Generate plan error:", error.message || error);
    res.status(500).json({ error: "Failed to generate plan", detail: error.message });
  }
});

// ─── POST /api/accept-plan ───
app.post("/api/accept-plan", async (req: Request, res: Response) => {
  const { userId, projectId, tasks, deadline } = req.body;

  if (!userId || !projectId || !tasks || !deadline) {
    return res.status(400).json({ error: "userId, projectId, tasks, and deadline are required" });
  }

  try {
    const batch = adminDb.batch();
    const taskIds: string[] = [];

    for (const task of tasks) {
      const docRef = adminDb
        .collection("users")
        .doc(userId)
        .collection("tasks")
        .doc();

      batch.set(docRef, {
        title: task.title,
        description: task.description || "",
        dueDate: task.scheduledDate || deadline,
        scheduledDate: task.scheduledDate,
        estimatedMinutes: task.estimatedMinutes,
        order: task.order,
        tag: "",
        category: "progress",
        completed: false,
        urgent: false,
        projectId,
        source: "ai-planner",
        createdAt: Timestamp.now(),
      });

      taskIds.push(docRef.id);
    }

    await batch.commit();

    res.json({ success: true, taskIds });
  } catch (error: any) {
    console.error("Accept plan error:", error.message || error);
    res.status(500).json({ error: "Failed to accept plan", detail: error.message });
  }
});

// ─── POST /api/reorganize-plan ───
app.post("/api/reorganize-plan", async (req: Request, res: Response) => {
  const { userId, projectId } = req.body;

  if (!userId || !projectId) {
    return res.status(400).json({ error: "userId and projectId are required" });
  }

  try {
    const today = new Date().toLocaleDateString("en-CA");

    // Fetch all tasks for this project
    const projectTasksSnap = await adminDb
      .collection("users")
      .doc(userId)
      .collection("tasks")
      .where("projectId", "==", projectId)
      .get();

    const allProjectTasks: any[] = [];
    projectTasksSnap.forEach((doc) => {
      allProjectTasks.push({ id: doc.id, ...doc.data() });
    });

    // Separate into completed, overdue, and future
    const completedTasks = allProjectTasks.filter((t) => t.completed === true);
    const overdueTasks = allProjectTasks.filter(
      (t) => !t.completed && t.scheduledDate < today
    );
    const futureTasks = allProjectTasks.filter(
      (t) => !t.completed && t.scheduledDate >= today
    );

    // If no overdue tasks, nothing to reorganize
    if (overdueTasks.length === 0) {
      return res.json({ reorganized: false, message: "No overdue tasks" });
    }

    // Fetch the project doc to get the deadline
    const projectDoc = await adminDb
      .collection("users")
      .doc(userId)
      .collection("projects")
      .doc(projectId)
      .get();

    const projectData = projectDoc.data();
    const deadline = projectData?.deadline;

    if (!deadline) {
      return res.status(400).json({ error: "Project has no deadline" });
    }

    // Fetch events between today and deadline
    const eventsSnap = await adminDb
      .collection("users")
      .doc(userId)
      .collection("events")
      .get();

    const events: any[] = [];
    eventsSnap.forEach((doc) => {
      const data = doc.data();
      events.push({ id: doc.id, ...data });
    });

    const relevantEvents = events.filter((e) => {
      const eventDate = e.start?.toDate
        ? e.start.toDate().toLocaleDateString("en-CA")
        : typeof e.start === "string"
          ? e.start.slice(0, 10)
          : null;
      return eventDate && eventDate >= today && eventDate <= deadline;
    });

    // Fetch user's other incomplete tasks (not from this project)
    const otherTasksSnap = await adminDb
      .collection("users")
      .doc(userId)
      .collection("tasks")
      .where("completed", "==", false)
      .get();

    const otherTasks: any[] = [];
    otherTasksSnap.forEach((doc) => {
      const data = doc.data();
      if (data.projectId !== projectId) {
        otherTasks.push({ id: doc.id, ...data });
      }
    });

    // Build day-by-day availability map
    const startDate = new Date(`${today}T00:00:00`);
    const endDate = new Date(`${deadline}T00:00:00`);
    const availabilityMap: string[] = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toLocaleDateString("en-CA");
      const dayEventsCount = relevantEvents.filter((e) => {
        const eventDate = e.start?.toDate
          ? e.start.toDate().toLocaleDateString("en-CA")
          : typeof e.start === "string"
            ? e.start.slice(0, 10)
            : null;
        return eventDate === dateStr;
      }).length;

      const dayTasksCount = otherTasks.filter((t) => {
        const taskDate = t.scheduledDate || t.dueDate;
        return taskDate === dateStr;
      }).length;

      const estimatedBusyHours = dayEventsCount * 1.5 + dayTasksCount * 0.5;
      const freeHours = Math.max(0, Math.round(8 - estimatedBusyHours));
      const dayName = dayNames[d.getDay()];
      const monthName = monthNames[d.getMonth()];
      availabilityMap.push(`${dayName} ${monthName} ${d.getDate()}: ${dayEventsCount} events, ~${freeHours} free hours`);
    }

    // Call GPT to redistribute overdue + future tasks
    const incompleteTasks = [...overdueTasks, ...futureTasks].map((t) => ({
      title: t.title,
      description: t.description,
      estimatedMinutes: t.estimatedMinutes,
      scheduledDate: t.scheduledDate,
    }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a project planning assistant. The user has overdue tasks that need to be rescheduled. Given the incomplete tasks (both overdue and future) and the user's day-by-day availability, redistribute ALL tasks from today to the deadline.

Return JSON: { tasks: [{ title: string, description: string, scheduledDate: "YYYY-MM-DD", estimatedMinutes: number, order: number }] }

Rules:
- Reschedule all provided tasks between today (${today}) and deadline (${deadline})
- Distribute work across days with available free time
- Each task should remain a concrete, actionable step
- Order tasks logically (dependencies first)
- estimatedMinutes should be realistic (15-180 min per task)
- Don't schedule tasks on days with 0 free hours
- Preserve task titles and descriptions as much as possible`,
        },
        {
          role: "user",
          content: `Tasks to reschedule: ${JSON.stringify(incompleteTasks)}

Availability:
${availabilityMap.join("\n")}`,
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0].message.content || "{}");
    const newTasks = parsed.tasks || [];

    // Batch update: delete all incomplete tasks for this project, then write new ones
    const batch = adminDb.batch();

    // Delete all incomplete project tasks
    for (const task of [...overdueTasks, ...futureTasks]) {
      const docRef = adminDb
        .collection("users")
        .doc(userId)
        .collection("tasks")
        .doc(task.id);
      batch.delete(docRef);
    }

    // Write rescheduled tasks
    for (const task of newTasks) {
      const docRef = adminDb
        .collection("users")
        .doc(userId)
        .collection("tasks")
        .doc();

      batch.set(docRef, {
        title: task.title,
        description: task.description || "",
        dueDate: deadline,
        scheduledDate: task.scheduledDate,
        estimatedMinutes: task.estimatedMinutes,
        order: task.order,
        category: "progress",
        completed: false,
        projectId,
        source: "ai-planner",
        createdAt: Timestamp.now(),
      });
    }

    await batch.commit();

    res.json({ reorganized: true, tasks: newTasks });
  } catch (error: any) {
    console.error("Reorganize plan error:", error.message || error);
    res.status(500).json({ error: "Failed to reorganize plan", detail: error.message });
  }
});

// ─── POST /api/parse-document ───
app.post("/api/parse-document", upload.single("file"), async (req: any, res) => {
  const filePath = req.file?.path;
  const originalName = req.file?.originalname || "";
  const userId = req.body?.userId;
  const userContext = req.body?.context || "";

  if (!filePath) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  if (!userId) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const ext = originalName.split(".").pop()?.toLowerCase() || "";
    let extractedText = "";
    console.log("[parse-document] file:", originalName, "ext:", ext, "path:", filePath);

    if (["txt", "md", "csv"].includes(ext)) {
      // Text-based files: read as UTF-8
      extractedText = fs.readFileSync(filePath, "utf-8");
    } else if (ext === "pdf") {
      // PDFs: extract text using pdf2json
      try {
        const PDF2JSON = require("pdf2json");
        extractedText = await new Promise<string>((resolve, reject) => {
          const parser = new PDF2JSON(null, 1);
          parser.on("pdfParser_dataReady", () => {
            const text = parser.getRawTextContent() || "";
            console.log("[PDF] Extracted", text.length, "chars");
            resolve(text);
          });
          parser.on("pdfParser_dataError", (err: any) => {
            console.error("[PDF] Parse error:", err);
            reject(err);
          });
          parser.loadPDF(filePath);
        });
      } catch (pdfErr: any) {
        console.error("[PDF] Failed to extract:", pdfErr.message);
        extractedText = "";
      }

      // If extraction returned very little text (scanned PDF), fall back to vision
      if (extractedText.trim().length < 50) {
        const base64 = fs.readFileSync(filePath).toString("base64");
        const textExtraction = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: "This is a scanned PDF. Extract ALL text and information. Return the complete raw text content." },
              { type: "image_url", image_url: { url: `data:image/png;base64,${base64}` } }
            ]
          }]
        });
        extractedText = textExtraction.choices[0].message.content || "";
      }
    } else if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
      // Images: use GPT-4o vision to extract text
      const base64 = fs.readFileSync(filePath).toString("base64");
      const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

      const textExtraction = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Extract all text and information from this image. Return the raw text content." },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } }
          ]
        }]
      });
      extractedText = textExtraction.choices[0].message.content || "";
    } else if (ext === "docx") {
      // DOCX: try reading as UTF-8 (basic fallback)
      try {
        extractedText = fs.readFileSync(filePath, "utf-8");
      } catch {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return res.status(400).json({ error: `Could not read .docx file. Try converting to PDF first.` });
      }
    } else {
      // Other files: try reading as UTF-8
      try {
        extractedText = fs.readFileSync(filePath, "utf-8");
      } catch {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return res.status(400).json({ error: `Unsupported file type: .${ext}` });
      }
    }

    // Parse extracted text into project details using GPT
    const today = new Date().toLocaleDateString("en-CA");
    console.log("[parse-document] Extracted text length:", extractedText.length);
    console.log("[parse-document] First 200 chars:", extractedText.substring(0, 200));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert project planner. Analyze this document carefully and extract a meaningful project from it.

Return JSON: { "title": string, "description": string, "deadline": "YYYY-MM-DD", "estimatedHours": number, "subComponents": string[] }

Guidelines:
- **title**: Create a clear, specific project name based on the actual content. If it's a syllabus, name it after the course and what needs to be done (e.g. "CS109 Final Project" or "PSYCH101 Research Paper"). If it's an assignment spec, use the assignment name. NEVER just say "New Project" or "Project".
- **description**: Summarize what the document is about and what the user needs to accomplish in 1-2 sentences.
- **deadline**: Look for due dates, deadlines, submission dates in the document. Parse them to YYYY-MM-DD. If none found, default to 2 weeks from today.
- **estimatedHours**: Be VERY conservative and realistic. Most college assignments take 2-6 hours. A weekly section/problem set: 1.5-4h. A 2-page reflection: 2-3h. A short homework: 1-3h. A full research paper: 10-20h. A coding project: 6-15h. A midterm study guide: 4-8h. DO NOT overestimate — students work efficiently. If the document is a section worksheet or short assignment, it's likely 1.5-4 hours MAX.
- **subComponents**: Break into 3-6 specific steps based on what the document actually requires. Keep it focused — a 4-problem problem set needs 4-5 steps, not 8. Be specific to the content.

Today is ${today}. Current day: ${new Date().toLocaleDateString("en-US", { weekday: "long" })}.`,
        },
        { role: "user", content: userContext ? `User context: ${userContext}\n\nDocument content:\n${extractedText}` : extractedText },
      ],
    });

    const parsed = JSON.parse(completion.choices[0].message.content || "{}");

    // Save to Firestore
    const projectData = {
      title: parsed.title,
      description: parsed.description,
      deadline: parsed.deadline,
      estimatedHours: parsed.estimatedHours,
      status: "active",
      createdAt: Timestamp.now(),
    };

    const docRef = await adminDb
      .collection("users")
      .doc(userId)
      .collection("projects")
      .add(projectData);

    // Clean up uploaded file
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({
      projectId: docRef.id,
      project: {
        title: parsed.title,
        description: parsed.description,
        deadline: parsed.deadline,
        estimatedHours: parsed.estimatedHours,
        subComponents: parsed.subComponents,
      },
    });
  } catch (error: any) {
    console.error("Parse document error:", error.message || error);
    // Clean up uploaded file on error
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: "Failed to parse document", detail: error.message });
  }
});

const PORT = 5001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
