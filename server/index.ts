import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { adminAuth } from "./firebaseAdmin";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

/**
 * Health check route
 */
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "Server running" });
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
