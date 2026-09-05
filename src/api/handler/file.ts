import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { FileRepository } from "../../repository/file_repo.js";
import { ProjectRepository } from "../../repository/project_repo.js";
import { logger } from "../../pkg/logger/logger.js";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { config } from "../../config/config.js";
import { generateUploadUrl, generateDownloadUrl } from "../../pkg/storage/s3.js";

const fileRepo = new FileRepository();
const projectRepo = new ProjectRepository();

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpg",
  "image/jpeg",
  "application/zip"
];

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const generatePresignedUrl = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, taskId, fileName, contentType } = req.body;
    
    if (!projectId || !fileName || !contentType) {
      return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "projectId, fileName, and contentType are required" } });
    }

    const project = await projectRepo.findById(projectId);
    if (!project) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Project not found" } });

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

    const isMember = await projectRepo.isUserInProject(projectId, userId);
    if (!isMember) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden: Not a member of this project" } });
    }

    if (!ALLOWED_TYPES.includes(contentType)) {
      return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "File type not allowed" } });
    }

    // In production, we generate a real S3 presigned URL.
    // We also register the file metadata right away (or via a webhook/callback in a robust setup).
    // For simplicity, we create the DB record here in a 'pending' state.
    const objectKey = crypto.randomUUID() + path.extname(fileName);
    
    let uploadUrl: string;

    if (process.env.NODE_ENV === "production" || process.env.AWS_S3_BUCKET) {
      uploadUrl = await generateUploadUrl(objectKey, contentType);
      
      await fileRepo.create({
        name: objectKey,
        originalName: fileName,
        mimeType: contentType,
        sizeBytes: 0, // In S3 we might fetch size later or client provides it
        projectId: projectId,
        taskId: taskId,
        uploadedBy: userId,
        storagePath: objectKey
      });
    } else {
      // Local development fallback using stateless JWT
      const token = jwt.sign({
        projectId,
        taskId,
        userId
      }, config.jwtSecret, { expiresIn: '15m' });
      uploadUrl = `/api/v1/files/upload/${token}`;
    }

    res.status(200).json({ success: true, data: { uploadUrl, objectKey, expires_in: 900 } });
  } catch (error) {
    logger.error("Failed to generate presigned URL", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const handleUpload = async (req: Request, res: Response) => {
  // Only used for local dev fallback
  try {
    const token = req.params.token as string;
    
    let tokenData: { projectId: string; taskId?: string; userId: string };
    try {
      tokenData = jwt.verify(token, config.jwtSecret) as { projectId: string; taskId?: string; userId: string };
    } catch (e) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Invalid or expired upload token" } });
    }
    
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "No file uploaded" } });
    }

    if (file.size > MAX_FILE_SIZE) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "File exceeds 50MB limit" } });
    }

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "File type not allowed" } });
    }

    const objectKey = crypto.randomUUID() + path.extname(file.originalname);
    
    const metadata = await fileRepo.create({
      name: objectKey,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      projectId: tokenData.projectId,
      taskId: tokenData.taskId,
      uploadedBy: tokenData.userId,
      storagePath: file.path
    });

    res.status(201).json({ success: true, data: metadata });
  } catch (error) {
    logger.error("Upload error", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const listFiles = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "projectId is required" } });

    const project = await projectRepo.findById(projectId as string);
    if (!project) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Project not found" } });

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

    const isMember = await projectRepo.isUserInProject(projectId as string, userId);
    if (!isMember) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } });
    }

    const files = await fileRepo.listByProject(projectId as string);
    res.status(200).json({ success: true, data: files });
  } catch (error) {
    logger.error("Failed to list files", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const downloadFile = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const file = await fileRepo.findById(id);
    if (!file) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "File not found" } });

    const project = await projectRepo.findById(file.projectId);
    const userId = req.user?.id;
    
    if (project && userId) {
      const isMember = await projectRepo.isUserInProject(file.projectId, userId);
      if (!isMember) {
        return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } });
      }
    }

    if (process.env.NODE_ENV === "production" || process.env.AWS_S3_BUCKET) {
      const downloadUrl = await generateDownloadUrl(file.storagePath, file.originalName);
      return res.status(200).json({ success: true, data: { downloadUrl } });
    } else {
      if (!fs.existsSync(file.storagePath)) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "File physically not found on disk" } });
      }
      return res.download(file.storagePath, file.originalName);
    }
  } catch (error) {
    logger.error("Failed to download file", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};
