import { db } from "../pkg/firebase/admin.js";

export type ProjectStatus = "new" | "preparation" | "in_progress" | "ready_to_submit" | "submitted" | "waiting_result" | "completed" | "cancelled";
export type ProjectPriority = "high" | "medium" | "low";

export interface ProjectComment {
  id: string;
  userId: string;
  text: string;
  mentions?: string[]; // array of user UIDs mentioned
  createdAt: Date;
}

export type ProjectResultType = "victory" | "1st_place" | "2nd_place" | "3rd_place" | "finalist" | "participation" | "not_passed";

export interface ProjectResult {
  type: ProjectResultType;
  prize?: string;
  amount?: number;
  result_date: Date;
  comment?: string;
  results_url?: string;
  files?: string[];
}

export interface Project {
  id?: string;
  name: string;
  description: string;
  ownerId: string;
  competition_id?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  responsible_user_id?: string;
  members: string[]; // array of user UIDs
  comments?: ProjectComment[];
  url?: string;
  start_at?: Date;
  deadline_at?: Date;
  result?: ProjectResult;
  createdAt: Date;
  updatedAt: Date;
}

export class ProjectRepository {
  private collection = db.collection("projects");

  async create(project: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<Project> {
    const now = new Date();
    const docRef = await this.collection.add({
      ...project,
      createdAt: now,
      updatedAt: now,
    });
    return { id: docRef.id, ...project, createdAt: now, updatedAt: now };
  }

  async findById(id: string): Promise<Project | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Project;
  }

  async listByOwner(ownerId: string): Promise<Project[]> {
    const snapshot = await this.collection.where("ownerId", "==", ownerId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Project);
  }

  async listByMember(userId: string): Promise<Project[]> {
    const snapshot = await this.collection.where("members", "array-contains", userId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Project);
  }

  async update(id: string, updates: Partial<Project>): Promise<void> {
    await this.collection.doc(id).update({
      ...updates,
      updatedAt: new Date()
    });
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }
}
