import { db } from "../db/index.js";
import { tasks, taskComments, users } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

export class TaskRepository {
  async create(data: any): Promise<any> {
    const [newTask] = await db.insert(tasks).values({
      projectId: data.projectId,
      title: data.title,
      description: data.description || "",
      status: data.status || "TODO",
      priority: data.priority || "medium",
      assigneeId: data.assigneeId || null,
      deadline: data.deadline ? new Date(data.deadline) : null,
    }).returning();
    
    return this.findById(newTask.id);
  }

  async findById(id: string): Promise<any> {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      with: {
        assignee: true,
        comments: {
          with: { user: true }
        }
      }
    });
    
    if (!task) return null;
    return this.mapTask(task);
  }

  async listByProject(projectId: string, filters?: { status?: string, assigneeId?: string }): Promise<any[]> {
    let whereClause: any = eq(tasks.projectId, projectId);
    
    if (filters?.status || filters?.assigneeId) {
      const conditions = [whereClause];
      if (filters.status) conditions.push(eq(tasks.status, filters.status as any));
      if (filters.assigneeId) conditions.push(eq(tasks.assigneeId, filters.assigneeId));
      
      const { and } = await import("drizzle-orm");
      whereClause = and(...conditions);
    }

    const projectTasks = await db.query.tasks.findMany({
      where: whereClause,
      orderBy: [desc(tasks.createdAt)],
      with: {
        assignee: true,
        comments: {
          with: { user: true }
        }
      }
    });

    return projectTasks.map((t: any) => this.mapTask(t));
  }

  async update(id: string, updates: any): Promise<void> {
    const dbUpdates: any = { updatedAt: new Date() };
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline ? new Date(updates.deadline) : null;
    if (updates.assigneeId !== undefined) dbUpdates.assigneeId = updates.assigneeId;

    if (Object.keys(dbUpdates).length > 1) {
      await db.update(tasks).set(dbUpdates).where(eq(tasks.id, id));
    }
  }

  async delete(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async addComment(taskId: string, userId: string, text: string, mentions?: string[]): Promise<any> {
    const [comment] = await db.insert(taskComments).values({
      taskId,
      userId,
      text,
      mentions: mentions || [],
    }).returning();
    
    return comment;
  }

  private mapTask(t: any) {
    if (!t) return null;
    return {
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      assigneeId: t.assigneeId,
      deadline: t.deadline,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      comments: t.comments?.map((c: any) => ({
        id: c.id,
        userId: c.userId,
        text: c.text,
        mentions: c.mentions,
        createdAt: c.createdAt
      })) || []
    };
  }
}
