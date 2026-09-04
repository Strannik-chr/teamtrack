import { db } from "../pkg/firebase/admin.js";

export type AllowedFileType = 
  | "application/pdf"
  | "application/msword"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/vnd.ms-excel"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  | "application/vnd.ms-powerpoint"
  | "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  | "image/png"
  | "image/jpeg"
  | "application/zip";

export interface FileMetadata {
  id?: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  projectId: string;
  taskId?: string; // Optional if attached to a specific task
  uploadedBy: string; // User ID
  storagePath: string; // Internal path in bucket
  createdAt: Date;
}

export class FileRepository {
  private collection = db.collection("files");

  async create(metadata: Omit<FileMetadata, "id" | "createdAt">): Promise<FileMetadata> {
    const now = new Date();
    const docRef = await this.collection.add({
      ...metadata,
      createdAt: now,
    });
    return { id: docRef.id, ...metadata, createdAt: now };
  }

  async findById(id: string): Promise<FileMetadata | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as FileMetadata;
  }

  async listByProject(projectId: string): Promise<FileMetadata[]> {
    const snapshot = await this.collection.where("projectId", "==", projectId).orderBy("createdAt", "desc").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as FileMetadata);
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }
}
