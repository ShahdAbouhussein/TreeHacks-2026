import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { adminAuth } from "./firebaseAdmin";
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

app.post("/api/transcribe", upload.single("audio"), (req: any, res) => {
  console.log("🔥 /api/transcribe hit");

  const audioPath = req.file?.path;

  if (!audioPath) {
    console.log("No file uploaded");
    return res.status(400).json({ error: "No audio uploaded" });
  }

  console.log("Audio saved at:", audioPath);

  const pythonPath = path.join(__dirname, "whisper_env", "bin", "python");
  const scriptPath = path.join(__dirname, "transcribe.py");

  exec(
    `${pythonPath} ${scriptPath} ${audioPath}`,
    (error, stdout, stderr) => {
      console.log("Whisper finished");

      fs.unlinkSync(audioPath); // delete temp file

      if (error) {
        console.error("Whisper error:", stderr);
        return res.status(500).json({ error: "Transcription failed" });
      }

      console.log("Transcript:", stdout);
      res.json({ transcript: stdout.trim() });
    }
  );
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
