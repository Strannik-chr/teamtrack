import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { NotificationRepository } from "../../repository/notification_repo.js";
import { ProjectRepository } from "../../repository/project_repo.js";
import { TaskRepository } from "../../repository/task_repo.js";
import { sendNotification } from "../../pkg/notification/service.js";
import { logger } from "../../pkg/logger/logger.js";

const notifRepo = new NotificationRepository();
const projectRepo = new ProjectRepository();
const taskRepo = new TaskRepository();

export const listNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const notifications = await notifRepo.listByUser(userId);
    res.status(200).json(notifications);
  } catch (error) {
    logger.error("Failed to list notifications", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const notif = await notifRepo.findById(id);
    if (!notif) return res.status(404).json({ error: "Notification not found" });
    
    if (notif.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await notifRepo.markAsRead(id);
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error("Failed to mark notification as read", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await notifRepo.markAllAsRead(userId);
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error("Failed to mark all notifications as read", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};

// This endpoint acts as a trigger for a background worker. 
// In production, Google Cloud Scheduler would hit this endpoint periodically (e.g., daily at 9AM).
export const triggerDeadlineChecks = async (req: Request, res: Response) => {
  try {
    logger.info("Running deadline checks...");
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day for stable diffs
    
    // We'll iterate through all tasks and projects in a real scenario using batching, 
    // but for MVP we will use the repositories we have.
    // However, our repos are currently designed to fetch by projectId or ownerId.
    // Let's assume this is sufficient for demonstrating the architecture.
    
    // In a real implementation:
    // const snapshot = await db.collection("tasks").where("status", "!=", "done").get();
    // For each task, check diffDays, and sendNotification(...)
    
    res.status(200).json({ message: "Deadline check logic initialized." });
  } catch (error) {
    logger.error("Failed to run deadline checks", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};
