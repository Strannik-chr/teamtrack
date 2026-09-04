import { db } from "../db/index.js";
import { files } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

export class FileRepository {
  async create(metadata: any): Promise<any> {
    const [newFile] = await db.insert(files).values({
      name: metadata.name,
      originalName: metadata.originalName,
      mimeType: metadata.mimeType,
      sizeBytes: metadata.sizeBytes,
      projectId: metadata.projectId,
      taskId: metadata.taskId || null,
      uploadedBy: metadata.uploadedBy,
      storagePath: metadata.storagePath,
    }).returning();
    return newFile;
  }

  async findById(id: string): Promise<any> {
    const file = await db.query.files.findFirst({
      where: eq(files.id, id)
    });
    return file || null;
  }

  async listByProject(projectId: string): Promise<any[]> {
    const allFiles = await db.query.files.findMany({
      where: eq(files.projectId, projectId),
      orderBy: [desc(files.createdAt)]
    });
    return allFiles;
  }

  async delete(id: string): Promise<void> {
    await db.delete(files).where(eq(files.id, id));
  }
}
