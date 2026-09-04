import { Request, Response } from "express";
import { ProjectRepository, ProjectStatus, ProjectPriority } from "../../repository/project_repo.js";
import { AuthRequest } from "../middleware/auth.js";
import { logger } from "../../pkg/logger/logger.js";
import { calculateDeadlineStatus, DeadlineStatus } from "../../pkg/deadline/deadline.js";
import { sendNotification } from "../../pkg/notification/service.js";
import { createProjectSchema, updateProjectSchema, addProjectCommentSchema, setProjectResultSchema } from "../validation/schemas.js";

const repo = new ProjectRepository();

const mapProjectWithDeadline = (project: any): any & { deadline_status: DeadlineStatus } => {
  const isCompleted = project.status === "completed" || project.status === "cancelled";
  return {
    ...project,
    deadline_status: calculateDeadlineStatus(project.deadline_at, isCompleted)
  };
};

import { z } from "zod";

export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const validated = createProjectSchema.parse(req.body);
    
    // Use the PostgreSQL user ID instead of Firebase UID
    const ownerId = req.user?.id;
    if (!ownerId) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

    const project = await repo.create(validated, ownerId);

    res.status(201).json({ success: true, data: mapProjectWithDeadline(project) });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: (error as any).errors } });
    }
    logger.error("Failed to create project", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const listProjects = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

    const { status } = req.query;

    const projects = await repo.listByUser(userId, status as string | undefined);
    res.status(200).json({ success: true, data: projects.map(mapProjectWithDeadline) });
  } catch (error) {
    logger.error("Failed to list projects", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const getProject = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const project = await repo.findById(id);
    
    if (!project) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Project not found" } });

    const userId = req.user?.id;
    if (!project.members.includes(userId!)) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } });
    }

    res.status(200).json({ success: true, data: mapProjectWithDeadline(project) });
  } catch (error) {
    logger.error("Failed to get project", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const project = await repo.findById(id);
    
    if (!project) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Project not found" } });

    const userId = req.user?.id;
    const memberRole = project.membersDetails?.find((m: any) => m.userId === userId)?.role;
    
    if (!memberRole) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } });
    }

    if (memberRole !== "OWNER" && memberRole !== "MANAGER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden: Only Owner or Manager can update project" } });
    }

    const updates = updateProjectSchema.parse(req.body);
    
    await repo.update(id, updates);
    const updatedProject = await repo.findById(id);

    if (updatedProject && updates.status === "completed" && project.status !== "completed") {
      for (const memberId of updatedProject.members) {
        if (memberId !== userId) {
          sendNotification({
            userId: memberId,
            type: "project_completed",
            title: "Project Completed",
            message: `Project ${updatedProject.name} has been marked as completed!`,
            referenceId: updatedProject.id,
            referenceType: "project"
          });
        }
      }
    }

    res.status(200).json({ success: true, data: updatedProject ? mapProjectWithDeadline(updatedProject) : null });
  } catch (error) {
    logger.error("Failed to update project", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const project = await repo.findById(id);
    
    if (!project) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Project not found" } });

    const userId = req.user?.id;
    if (project.ownerId !== userId) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden: Only owner can delete" } });
    }

    if (project.status === "completed" || project.result) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden: Completed projects cannot be deleted" } });
    }

    await repo.delete(id);
    res.status(200).json({ success: true, data: null });
  } catch (error) {
    logger.error("Failed to delete project", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const addProjectComment = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { text, mentions } = addProjectCommentSchema.parse(req.body);

    const project = await repo.findById(id);
    if (!project) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Project not found" } });

    const userId = req.user?.id;
    if (!project.members.includes(userId!)) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } });
    }

    const newComment = await repo.addComment(id, userId!, text, mentions);

    if (newComment.mentions && newComment.mentions.length > 0) {
      for (const mentionId of newComment.mentions) {
        if (mentionId !== userId) {
          sendNotification({
            userId: mentionId,
            type: "comment_added",
            title: "New Mention in Project",
            message: `You were mentioned in a comment on project: ${project.name}`,
            referenceId: project.id,
            referenceType: "project"
          });
        }
      }
    }

    res.status(201).json({ success: true, data: newComment });
  } catch (error) {
    logger.error("Failed to add comment", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const setProjectResult = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const validated = setProjectResultSchema.parse(req.body);

    const project = await repo.findById(id);
    if (!project) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Project not found" } });

    const userId = req.user?.id;
    const memberRole = project.membersDetails?.find((m: any) => m.userId === userId)?.role;
    
    if (!memberRole) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } });
    }

    if (memberRole !== "OWNER" && memberRole !== "MANAGER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden: Only Owner or Manager can set result" } });
    }

    const updates: any = { result: validated };
    if (project.status !== "completed") {
      updates.status = "completed";
    }

    await repo.update(id, updates);
    const updatedProject = await repo.findById(id);

    if (updatedProject && updates.status === "completed") {
      for (const memberId of updatedProject.members) {
        if (memberId !== userId) {
          sendNotification({
            userId: memberId,
            type: "project_completed",
            title: "Project Completed",
            message: `Project ${updatedProject.name} has been marked as completed with result: ${validated.type}`,
            referenceId: updatedProject.id,
            referenceType: "project"
          });
        }
      }
    }

    res.status(200).json({ success: true, data: updatedProject ? mapProjectWithDeadline(updatedProject) : null });
  } catch (error) {
    logger.error("Failed to set project result", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};
