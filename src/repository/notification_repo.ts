import { db } from "../pkg/firebase/admin.js";

export type NotificationType = 
  | "deadline_14" | "deadline_7" | "deadline_3" | "deadline_1" | "deadline_passed"
  | "task_assigned" | "comment_added" | "deadline_changed" | "project_completed";

export interface Notification {
  id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  referenceId?: string;
  referenceType?: "project" | "task" | "competition";
  createdAt: Date;
}

export class NotificationRepository {
  private collection = db.collection("notifications");

  async create(notification: Omit<Notification, "id" | "createdAt" | "isRead">): Promise<Notification> {
    const now = new Date();
    const docRef = await this.collection.add({
      ...notification,
      isRead: false,
      createdAt: now,
    });
    return { id: docRef.id, ...notification, isRead: false, createdAt: now };
  }

  async findById(id: string): Promise<Notification | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Notification;
  }

  async listByUser(userId: string, limit = 50): Promise<Notification[]> {
    const snapshot = await this.collection
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Notification);
  }

  async markAsRead(id: string): Promise<void> {
    await this.collection.doc(id).update({ isRead: true });
  }

  async markAllAsRead(userId: string): Promise<void> {
    const snapshot = await this.collection
      .where("userId", "==", userId)
      .where("isRead", "==", false)
      .get();
      
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isRead: true });
    });
    await batch.commit();
  }
}
