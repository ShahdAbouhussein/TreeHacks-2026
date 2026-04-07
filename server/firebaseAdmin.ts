import admin from "firebase-admin";
import { readFileSync } from "fs";
import path from "path";

const serviceAccount = JSON.parse(
  readFileSync(path.join(__dirname, "serviceAccountKey.json"), "utf-8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
