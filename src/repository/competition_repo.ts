import { db } from "../db/index.js";
import { competitions } from "../db/schema.js";
import { eq, desc, and } from "drizzle-orm";

export class CompetitionRepository {
  async create(data: any): Promise<any> {
    const [newComp] = await db.insert(competitions).values({
      title: data.title,
      description: data.description || "",
      organizer: data.organizer || "",
      type: data.type || "other",
      url: data.official_url || "",
      source: data.source || null,
      sourceId: data.source_id || null,
      deadline: data.deadline ? new Date(data.deadline) : null,
      startAt: data.start_at ? new Date(data.start_at) : null,
      resultAt: data.result_at ? new Date(data.result_at) : null,
      prizeFund: data.prize_fund || null,
      status: data.status || "published",
    }).returning();
    
    return this.mapCompetition(newComp);
  }

  async findById(id: string): Promise<any> {
    const comp = await db.query.competitions.findFirst({
      where: eq(competitions.id, id),
    });
    
    if (!comp) return null;
    return this.mapCompetition(comp);
  }

  async findBySourceId(sourceId: string): Promise<any> {
    const comp = await db.query.competitions.findFirst({
      where: eq(competitions.sourceId, sourceId),
    });
    
    if (!comp) return null;
    return this.mapCompetition(comp);
  }

  async list(query?: any): Promise<{ data: any[], nextCursor?: string }> {
    const limit = query?.limit || 20;
    
    let whereClause = undefined;
    const conditions = [];

    if (query?.type) {
      conditions.push(eq(competitions.type, query.type));
    }
    if (query?.status) {
      conditions.push(eq(competitions.status, query.status));
    }

    if (conditions.length > 0) {
      whereClause = and(...conditions);
    }

    // Offset-based pagination instead of cursor-based for simplicity with Drizzle for now, 
    // or just omit offset for now since it was cursor-based in firestore
    const offset = query?.offset ? parseInt(query.offset, 10) : 0;
    const isCursor = query?.offset && !isNaN(offset);
    const parsedOffset = isCursor ? offset : 0;

    const comps = await db.query.competitions.findMany({
      where: whereClause,
      orderBy: [desc(competitions.createdAt)],
      limit: limit,
      offset: parsedOffset
    });

    const data = comps.map((c: any) => this.mapCompetition(c));
    
    let nextCursor = undefined;
    if (data.length === limit) {
      nextCursor = (parsedOffset + limit).toString();
    }

    return { data, nextCursor };
  }

  async update(id: string, updates: any): Promise<void> {
    const dbUpdates: any = { updatedAt: new Date() };
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.organizer !== undefined) dbUpdates.organizer = updates.organizer;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.official_url !== undefined) dbUpdates.url = updates.official_url;
    if (updates.source_id !== undefined) dbUpdates.sourceId = updates.source_id;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline ? new Date(updates.deadline) : null;
    if (updates.start_at !== undefined) dbUpdates.startAt = updates.start_at ? new Date(updates.start_at) : null;
    if (updates.result_at !== undefined) dbUpdates.resultAt = updates.result_at ? new Date(updates.result_at) : null;
    if (updates.prize_fund !== undefined) dbUpdates.prizeFund = updates.prize_fund;

    if (Object.keys(dbUpdates).length > 1) {
      await db.update(competitions).set(dbUpdates).where(eq(competitions.id, id));
    }
  }

  async delete(id: string): Promise<void> {
    await db.delete(competitions).where(eq(competitions.id, id));
  }

  private mapCompetition(c: any) {
    if (!c) return null;
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      organizer: c.organizer,
      type: c.type,
      official_url: c.url,
      source: c.source,
      source_id: c.sourceId,
      deadline: c.deadline,
      start_at: c.startAt,
      result_at: c.resultAt,
      prize_fund: c.prizeFund,
      status: c.status,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    };
  }
}
