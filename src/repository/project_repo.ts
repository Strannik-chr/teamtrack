import { db } from "../db/index.js";
import { projects, projectMembers, projectComments, users } from "../db/schema.js";
import { eq, inArray, and } from "drizzle-orm";

export type ProjectStatus = "new" | "preparation" | "in_progress" | "ready_to_submit" | "submitted" | "waiting_result" | "completed" | "cancelled";
export type ProjectPriority = "high" | "medium" | "low";
export type ProjectRole = "OWNER" | "MANAGER" | "MEMBER";

export class ProjectRepository {
  async create(data: any, ownerId: string): Promise<any> {
    return await db.transaction(async (tx) => {
      const [newProject] = await tx.insert(projects).values({
        name: data.name,
        description: data.description || "",
        competitionId: data.competition_id || null,
        url: data.url || "",
        status: data.status || "new",
        priority: data.priority || "medium",
        responsibleUserId: data.responsible_user_id || ownerId,
        startAt: data.start_at ? new Date(data.start_at) : null,
        deadlineAt: data.deadline_at ? new Date(data.deadline_at) : null,
      }).returning();

      // Add members
      const membersToInsert = data.members ? [...new Set([...data.members, ownerId])] : [ownerId];
      
      const membersData = membersToInsert.map(userId => ({
        projectId: newProject.id,
        userId: userId,
        role: (userId === ownerId ? "OWNER" : "MEMBER") as ProjectRole,
      }));

      await tx.insert(projectMembers).values(membersData);

      return this.findById(newProject.id, tx);
    });
  }

  async findById(id: string, tx: any = db): Promise<any> {
    const project = await tx.query.projects.findFirst({
      where: eq(projects.id, id),
      with: {
        members: {
          with: { user: true }
        },
        comments: {
          with: { user: true }
        }
      }
    });
    
    if (!project) return null;
    return this.mapProject(project);
  }

  async listByUser(userId: string, status?: string): Promise<any[]> {
    const userProjects = await db.query.projectMembers.findMany({
      where: eq(projectMembers.userId, userId),
      with: {
        project: {
          with: {
            members: { with: { user: true } },
            comments: { with: { user: true } }
          }
        }
      }
    });

    let projects = userProjects.map((mp: any) => this.mapProject(mp.project)).filter((p) => p !== null);
    
    if (status) {
      projects = projects.filter(p => p!.status === status);
    }
    
    return projects;
  }

  async update(id: string, updates: any): Promise<void> {
    const dbUpdates: any = { updatedAt: new Date() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.url !== undefined) dbUpdates.url = updates.url;
    if (updates.start_at !== undefined) dbUpdates.startAt = updates.start_at ? new Date(updates.start_at) : null;
    if (updates.deadline_at !== undefined) dbUpdates.deadlineAt = updates.deadline_at ? new Date(updates.deadline_at) : null;
    if (updates.result !== undefined) dbUpdates.result = updates.result;
    if (updates.competition_id !== undefined) dbUpdates.competitionId = updates.competition_id;
    if (updates.responsible_user_id !== undefined) dbUpdates.responsibleUserId = updates.responsible_user_id;

    if (Object.keys(dbUpdates).length > 1) {
      await db.update(projects).set(dbUpdates).where(eq(projects.id, id));
    }
  }

  async isUserInProject(projectId: string, userId: string): Promise<boolean> {
    const member = await db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      )
    });
    return !!member;
  }

  async getMemberRole(projectId: string, userId: string): Promise<ProjectRole | null> {
    const member = await db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      )
    });
    return member?.role || null;
  }

  async addMember(projectId: string, userId: string, role: ProjectRole = "MEMBER"): Promise<void> {
    await db.insert(projectMembers).values({
      projectId,
      userId,
      role
    });
  }

  async updateMemberRole(projectId: string, userId: string, role: ProjectRole): Promise<void> {
    await db.update(projectMembers)
      .set({ role })
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      ));
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    await db.delete(projectMembers).where(and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.userId, userId)
    ));
  }

  async delete(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async addComment(projectId: string, userId: string, text: string, mentions?: string[]): Promise<any> {
    const [comment] = await db.insert(projectComments).values({
      projectId,
      userId,
      text,
      mentions: mentions || [],
    }).returning();
    
    return comment;
  }

  private mapProject(p: any) {
    if (!p) return null;
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      competition_id: p.competitionId,
      url: p.url,
      status: p.status,
      priority: p.priority,
      responsible_user_id: p.responsibleUserId,
      start_at: p.startAt,
      deadline_at: p.deadlineAt,
      result: p.result,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      members: p.members?.map((m: any) => m.userId) || [],
      membersDetails: p.members?.map((m: any) => ({ userId: m.userId, role: m.role, user: m.user })) || [],
      ownerId: p.members?.find((m: any) => m.role === "OWNER")?.userId || null,
      comments: p.comments?.map((c: any) => ({
        id: c.id,
        userId: c.userId,
        text: c.text,
        mentions: c.mentions,
        createdAt: c.createdAt
      })) || []
    };
  }
}
