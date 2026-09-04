import { db } from "../pkg/firebase/admin.js";
import { Filter } from "firebase-admin/firestore";

export type CompetitionType = "competition" | "grant" | "hackathon" | "tournament" | "olympiad" | "forum" | "accelerator" | "championship" | "other";

export interface Competition {
  id?: string;
  title: string;
  organizer: string;
  type: CompetitionType;
  official_url: string;
  deadline?: Date;
  start_at?: Date;
  result_at?: Date;
  prize_fund?: string;
  source_id?: string;
  status: "published" | "draft" | "archived";
  created_at: Date;
  updated_at: Date;
}

export interface CompetitionQuery {
  type?: CompetitionType;
  status?: string;
  limit?: number;
  offset?: string; // Using document ID for cursor-based pagination
}

export class CompetitionRepository {
  private collection = db.collection("competitions");

  async create(competition: Omit<Competition, "id" | "created_at" | "updated_at">): Promise<Competition> {
    const now = new Date();
    const docRef = await this.collection.add({
      ...competition,
      created_at: now,
      updated_at: now,
    });
    return { id: docRef.id, ...competition, created_at: now, updated_at: now };
  }

  async findById(id: string): Promise<Competition | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Competition;
  }

  async findBySourceId(sourceId: string): Promise<Competition | null> {
    const snapshot = await this.collection.where("source_id", "==", sourceId).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Competition;
  }


  async list(query?: CompetitionQuery): Promise<{ data: Competition[], nextCursor?: string }> {
    let queryRef: FirebaseFirestore.Query = this.collection.orderBy("created_at", "desc");

    if (query?.type) {
      queryRef = queryRef.where("type", "==", query.type);
    }
    if (query?.status) {
      queryRef = queryRef.where("status", "==", query.status);
    }

    // Apply pagination
    const limit = query?.limit || 20;
    queryRef = queryRef.limit(limit);

    if (query?.offset) {
      const cursorDoc = await this.collection.doc(query.offset).get();
      if (cursorDoc.exists) {
        queryRef = queryRef.startAfter(cursorDoc);
      }
    }

    const snapshot = await queryRef.get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Competition);
    
    let nextCursor = undefined;
    if (data.length === limit) {
      nextCursor = data[data.length - 1].id;
    }

    return { data, nextCursor };
  }

  async update(id: string, updates: Partial<Competition>): Promise<void> {
    await this.collection.doc(id).update({
      ...updates,
      updated_at: new Date()
    });
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }
}
