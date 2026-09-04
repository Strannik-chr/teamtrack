import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { NotificationRepository } from "../../repository/notification_repo.js";
import { logger } from "../../pkg/logger/logger.js";

const notifRepo = new NotificationRepository();

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
    
    // In a real implementation: fetch all active projects and tasks and send notifications
    
    res.status(200).json({ success: true, message: "Deadline check logic initialized." });
  } catch (error) {
    logger.error("Failed to run deadline checks", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};
