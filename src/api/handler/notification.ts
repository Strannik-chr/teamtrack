import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { NotificationRepository } from "../../repository/notification_repo.js";
import { ProjectRepository } from "../../repository/project_repo.js";
import { TaskRepository } from "../../repository/task_repo.js";
import { sendNotification } from "../../pkg/notification/service.js";
import { logger } from "../../pkg/logger/logger.js";
import { db } from "../../db/index.js";
import { eq, isNull, and, or, not } from "drizzle-orm";
import { tasks, projects } from "../../db/schema.js";

const notifRepo = new NotificationRepository();
const projectRepo = new ProjectRepository();
const taskRepo = new TaskRepository();

export const listNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

    const notifications = await notifRepo.listByUser(userId);
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    logger.error("Failed to list notifications", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

    const notif = await notifRepo.findById(id);
    if (!notif) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Notification not found" } });
    
    if (notif.userId !== userId) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } });
    }

    await notifRepo.markAsRead(id);
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error("Failed to mark notification as read", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

    await notifRepo.markAllAsRead(userId);
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error("Failed to mark all notifications as read", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

// This endpoint acts as a trigger for a background worker. 
export const triggerDeadlineChecks = async (req: Request, res: Response) => {
  try {
    logger.info("Running deadline checks...");
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day for stable diffs
    
    // Check Tasks
    const activeTasks = await db.select().from(tasks).where(not(eq(tasks.status, "DONE")));
    for (const task of activeTasks) {
       if (!task.deadline || !task.assigneeId) continue;
       const deadline = new Date(task.deadline);
       deadline.setHours(0, 0, 0, 0);
       
       const diffTime = deadline.getTime() - now.getTime();
       const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
       
       let notificationType: "deadline_14" | "deadline_7" | "deadline_3" | "deadline_1" | "deadline_passed" | null = null;
       
       if (diffDays === 14) notificationType = "deadline_14";
       else if (diffDays === 7) notificationType = "deadline_7";
       else if (diffDays === 3) notificationType = "deadline_3";
       else if (diffDays === 1) notificationType = "deadline_1";
       else if (diffDays === -1) notificationType = "deadline_passed"; // Notify one day after it passes

       if (notificationType) {
           await sendNotification({
               userId: task.assigneeId,
               type: notificationType,
               title: "Task Deadline Approaching",
               message: `Task "${task.title}" is due in ${diffDays > 0 ? diffDays + ' days' : 'the past'}.`,
               referenceId: task.id,
               referenceType: "task"
           });
       }
    }

    res.status(200).json({ success: true, message: "Deadline check logic completed." });
  } catch (error) {
    logger.error("Failed to run deadline checks", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};
