import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

export class NotificationRepository {
  async listByUser(userId: string, limit: number = 50): Promise<any[]> {
    const notifs = await db.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: [desc(notifications.createdAt)],
      limit: limit
    });
    return notifs;
  }

  async findById(id: string): Promise<any> {
    const notif = await db.query.notifications.findFirst({
      where: eq(notifications.id, id)
    });
    return notif || null;
  }

  async markAsRead(id: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  async markAllAsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async create(data: any): Promise<any> {
    const [newNotif] = await db.insert(notifications).values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      referenceId: data.referenceId || null,
      referenceType: data.referenceType || null,
      isRead: false
    }).returning();
    return newNotif;
  }
}
