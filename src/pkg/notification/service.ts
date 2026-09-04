import { NotificationRepository, NotificationType } from "../../repository/notification_repo.js";
import { messaging } from "../firebase/admin.js";
import { logger } from "../logger/logger.js";
// Assuming we have a UserRepository where we could retrieve fcmTokens, we'll mock it or pass it.
import { UserRepository } from "../../repository/user_repo.js";

const notifRepo = new NotificationRepository();
const userRepo = new UserRepository();

export const sendNotification = async (params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string;
  referenceType?: "project" | "task" | "competition";
}) => {
  try {
    // 1. Save to DB
    const notif = await notifRepo.create(params);

    // 2. Try Push Notification (FCM)
    const user = await userRepo.findById(params.userId);
    // Supposing user model has an optional fcmTokens array:
    const tokens = (user as any)?.fcmTokens || [];
    
    if (tokens.length > 0) {
      await messaging.sendEachForMulticast({
        tokens,
        notification: {
          title: params.title,
          body: params.message,
        },
        data: {
          type: params.type,
          referenceId: params.referenceId || "",
          referenceType: params.referenceType || "",
        }
      });
      logger.info(`Push notification sent to user ${params.userId}`);
    }

    return notif;
  } catch (error) {
    logger.error("Error sending notification", { error });
  }
};
