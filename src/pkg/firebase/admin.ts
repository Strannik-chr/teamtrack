import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";
import fs from "fs";
import path from "path";
import { logger } from "../logger/logger.js";

const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = {};

if (fs.existsSync(configPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
} else {
  logger.warn("firebase-applet-config.json not found");
}

const app = getApps().length ? getApps()[0] : initializeApp({
  projectId: firebaseConfig.projectId || process.env.FIREBASE_PROJECT_ID,
});
logger.info("Firebase Admin initialized");

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
export const auth = getAuth(app);
export const messaging = getMessaging(app);
