import { NotificationRepository } from "../../repository/notification_repo.js";
import { logger } from "../logger/logger.js";
import { UserRepository } from "../../repository/user_repo.js";

const notifRepo = new NotificationRepository();
const userRepo = new UserRepository();

export const sendNotification = async (params: {
  userId: string;
  type: "task_assigned" | "comment_added" | "deadline_approaching" | "deadline_changed" | "project_completed" | "deadline_14" | "deadline_7" | "deadline_3" | "deadline_1" | "deadline_passed";
  title: string;
  message: string;
  referenceId?: string;
  referenceType?: "project" | "task" | "competition";
}) => {
  try {
    // 1. Save to DB
    const notif = await notifRepo.create(params);

    // 2. Here we could integrate with WebSockets (Socket.io) or Web Push API for realtime delivery
    // FCM is removed since it's a local JWT auth app now
    
    return notif;
  } catch (error) {
    logger.error("Error sending notification", { error });
  }
};
