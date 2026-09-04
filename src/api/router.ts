import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { healthCheck } from "./handler/health.js";
import { requestLogger } from "./middleware/logger.js";
import { requireAuth } from "./middleware/auth.js";
import { validate } from "./middleware/validate.js";
import { createProjectSchema, updateProjectSchema, addProjectCommentSchema, setProjectResultSchema, createTaskSchema, updateTaskSchema, createCompetitionSchema } from "./validation/schemas.js";
import { createProject, listProjects, getProject, updateProject, deleteProject, addProjectComment, setProjectResult } from "./handler/project.js";
import { getMe, listUsers } from "./handler/user.js";
import { createCompetition, listCompetitions, getCompetition, updateCompetition, deleteCompetition } from "./handler/competition.js";
import { createTask, listTasks, getTask, updateTask, deleteTask, addTaskComment } from "./handler/task.js";
import { getCalendarEvents } from "./handler/calendar.js";
import { getUrgentItems } from "./handler/urgent.js";
import { generatePresignedUrl, handleUpload, listFiles, downloadFile } from "./handler/file.js";
import { listNotifications, markAsRead, markAllAsRead, triggerDeadlineChecks } from "./handler/notification.js";
import { getAnalytics } from "./handler/analytics.js";
import { triggerScraper } from "./handler/scraper.js";
import { authRouter } from "./routes/auth.js";
import { teamRouter } from "./routes/team.js";

// File upload validation (Phase 16)
const upload = multer({ 
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow specific mimetypes
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  }
});

// Rate Limiting (Phase 16)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: "Too many requests from this IP, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createRouter = () => {
  const router = express.Router();
  
  // Security Headers Middleware
  router.use(helmet());

  // CORS config
  router.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));
  
  router.use(express.json({ limit: "1mb" })); // Prevent large payloads
  router.use(requestLogger);

  // Apply Rate Limiter to all API routes
  router.use("/api/", apiLimiter);

  // System Routes
  router.get("/health", healthCheck);
  router.get("/api/health", healthCheck);

  // Analytics (Phase 14)
  router.get("/api/v1/analytics", requireAuth, getAnalytics);

  // Urgent (Phase 10)
  router.get("/api/v1/urgent", requireAuth, getUrgentItems);

  // Calendar (Phase 9)
  router.get("/api/v1/calendar", requireAuth, getCalendarEvents);

  // Auth Routes
  router.use("/api/v1/auth", authRouter);

  // Users (Phase 3)
  router.get("/api/v1/users/me", requireAuth, getMe);
  router.get("/api/v1/users", requireAuth, listUsers);

  // Competitions (Phase 6)
  router.post("/api/v1/competitions", requireAuth, validate(createCompetitionSchema), createCompetition);
  router.get("/api/v1/competitions", requireAuth, listCompetitions);
  router.get("/api/v1/competitions/:id", requireAuth, getCompetition);
  router.put("/api/v1/competitions/:id", requireAuth, updateCompetition);
  router.delete("/api/v1/competitions/:id", requireAuth, deleteCompetition);

  // Projects (Phase 7 & 11)
  router.post("/api/v1/projects", requireAuth, validate(createProjectSchema), createProject);
  router.get("/api/v1/projects", requireAuth, listProjects);
  router.get("/api/v1/projects/:id", requireAuth, getProject);
  router.put("/api/v1/projects/:id", requireAuth, validate(updateProjectSchema), updateProject);
  router.delete("/api/v1/projects/:id", requireAuth, deleteProject);
  router.post("/api/v1/projects/:id/comments", requireAuth, validate(addProjectCommentSchema), addProjectComment); // Phase 11
  router.post("/api/v1/projects/:id/result", requireAuth, validate(setProjectResultSchema), setProjectResult); // Phase 13

  // Teams (Phase 7 / Members)
  router.use("/api/v1/projects", teamRouter);

  // Tasks (Phase 8 & 11)
  router.post("/api/v1/tasks", requireAuth, validate(createTaskSchema), createTask);
  router.get("/api/v1/tasks", requireAuth, listTasks);
  router.get("/api/v1/tasks/:id", requireAuth, getTask);
  router.put("/api/v1/tasks/:id", requireAuth, validate(updateTaskSchema), updateTask);
  router.delete("/api/v1/tasks/:id", requireAuth, deleteTask);
  router.post("/api/v1/tasks/:id/comments", requireAuth, validate(addProjectCommentSchema), addTaskComment);

  // Files (Phase 11)
  router.post("/api/v1/files/presigned", requireAuth, generatePresignedUrl);
  router.put("/api/v1/files/upload/:token", upload.single("file"), handleUpload); // Accepts multipart/form-data
  router.get("/api/v1/files", requireAuth, listFiles);
  router.get("/api/v1/files/:id/download", requireAuth, downloadFile);

  // Notifications (Phase 12)
  router.get("/api/v1/notifications", requireAuth, listNotifications);
  router.put("/api/v1/notifications/:id/read", requireAuth, markAsRead);
  router.post("/api/v1/notifications/read-all", requireAuth, markAllAsRead);
  router.post("/api/v1/notifications/cron/deadlines", triggerDeadlineChecks); // internal cron endpoint

  // Scraper (Phase 15)
  router.post("/api/v1/scraper/trigger", triggerScraper); // internal endpoint

  return router;
};
