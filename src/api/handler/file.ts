import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { FileRepository, FileMetadata, AllowedFileType } from "../../repository/file_repo.js";
import { ProjectRepository } from "../../repository/project_repo.js";
import { logger } from "../../pkg/logger/logger.js";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const fileRepo = new FileRepository();
const projectRepo = new ProjectRepository();

// In-memory store for presigned upload tokens (Simulating MinIO presigned URL behavior)
// In production, this would use Redis or actual S3/MinIO presigned URLs
const uploadTokens = new Map<string, {
  projectId: string;
  taskId?: string;
  userId: string;
  expiresAt: number;
}>();

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
  "image/png",
  "image/jpg",
  "image/jpeg",
  "application/zip"
];

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const generatePresignedUrl = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, taskId } = req.body;
    
    if (!projectId) return res.status(400).json({ error: "projectId is required" });

    const project = await projectRepo.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const userId = req.user?.uid;
    if (!project.members.includes(userId!) && project.ownerId !== userId) {
      return res.status(403).json({ error: "Forbidden: Not a member of this project" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    uploadTokens.set(token, {
      projectId,
      taskId,
      userId: userId!,
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes valid
    });

    // Mock Presigned URL
    const uploadUrl = `/api/v1/files/upload/${token}`;

    res.status(200).json({ uploadUrl, expires_in: 900 });
  } catch (error) {
    logger.error("Failed to generate presigned URL", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleUpload = async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;
    const tokenData = uploadTokens.get(token);
    
    if (!tokenData || tokenData.expiresAt < Date.now()) {
      return res.status(403).json({ error: "Invalid or expired upload token" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: "File exceeds 50MB limit" });
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: "File type not allowed" });
    }

    // Save metadata
    const metadata = await fileRepo.create({
      name: crypto.randomUUID() + path.extname(file.originalname),
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      projectId: tokenData.projectId,
      taskId: tokenData.taskId,
      uploadedBy: tokenData.userId,
      storagePath: file.path
    });

    // Invalidate token
    uploadTokens.delete(token);

    res.status(201).json(metadata);
  } catch (error) {
    logger.error("Upload error", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const listFiles = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: "projectId is required" });

    const project = await projectRepo.findById(projectId as string);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const userId = req.user?.uid;
    if (!project.members.includes(userId!) && project.ownerId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const files = await fileRepo.listByProject(projectId as string);
    res.status(200).json(files);
  } catch (error) {
    logger.error("Failed to list files", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const downloadFile = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const file = await fileRepo.findById(id);
    if (!file) return res.status(404).json({ error: "File not found" });

    const project = await projectRepo.findById(file.projectId);
    const userId = req.user?.uid;
    if (project && !project.members.includes(userId!) && project.ownerId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!fs.existsSync(file.storagePath)) {
      return res.status(404).json({ error: "File physically not found on disk" });
    }

    res.download(file.storagePath, file.originalName);
  } catch (error) {
    logger.error("Failed to download file", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};
