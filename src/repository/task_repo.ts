import { db } from "../pkg/firebase/admin.js";

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "high" | "medium" | "low";

export interface TaskComment {
  id?: string;
  userId: string;
  text: string;
  mentions?: string[]; // array of user UIDs mentioned
  createdAt: Date;
}

export interface Task {
  id?: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  deadline?: Date;
  comments: TaskComment[];
  createdAt: Date;
  updatedAt: Date;
}

export class TaskRepository {
  private collection = db.collection("tasks");

  async create(task: Omit<Task, "id" | "createdAt" | "updatedAt">): Promise<Task> {
    const now = new Date();
    const docRef = await this.collection.add({
      ...task,
      createdAt: now,
      updatedAt: now,
    });
    return { id: docRef.id, ...task, createdAt: now, updatedAt: now };
  }

  async findById(id: string): Promise<Task | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Task;
  }

  async listByProject(projectId: string): Promise<Task[]> {
    const snapshot = await this.collection.where("projectId", "==", projectId).orderBy("createdAt", "desc").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
  }

  async update(id: string, updates: Partial<Task>): Promise<void> {
    await this.collection.doc(id).update({
      ...updates,
      updatedAt: new Date(),
    });
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }
}
