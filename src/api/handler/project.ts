import { Request, Response } from "express";
import { ProjectRepository, ProjectStatus, ProjectPriority, Project } from "../../repository/project_repo.js";
import { AuthRequest } from "../middleware/auth.js";
import { logger } from "../../pkg/logger/logger.js";
import { calculateDeadlineStatus, DeadlineStatus } from "../../pkg/deadline/deadline.js";
import { sendNotification } from "../../pkg/notification/service.js";
import crypto from "crypto";

const repo = new ProjectRepository();

const mapProjectWithDeadline = (project: Project): Project & { deadline_status: DeadlineStatus } => {
  const isCompleted = project.status === "completed" || project.status === "cancelled";
  return {
    ...project,
    deadline_status: calculateDeadlineStatus(project.deadline_at, isCompleted)
  };
};

export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, competition_id, url, priority, status, responsible_user_id, members, start_at, deadline_at } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const ownerId = req.user?.uid;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });

    const initialMembers = Array.isArray(members) ? members : [];
    if (!initialMembers.includes(ownerId)) {
      initialMembers.push(ownerId);
    }

    const project = await repo.create({
      name,
      description: description || "",
      ownerId,
      competition_id,
      url: url || "",
      status: (status as ProjectStatus) || "new",
      priority: (priority as ProjectPriority) || "medium",
      responsible_user_id: responsible_user_id || ownerId,
      members: initialMembers,
      start_at: start_at ? new Date(start_at) : undefined,
      deadline_at: deadline_at ? new Date(deadline_at) : undefined,
    });

    res.status(201).json(mapProjectWithDeadline(project));
  } catch (error) {
    logger.error("Failed to create project", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const listProjects = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // List projects where the user is a member or the owner
    const projects = await repo.listByMember(userId);
    res.status(200).json(projects.map(mapProjectWithDeadline));
  } catch (error) {
    logger.error("Failed to list projects", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getProject = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const project = await repo.findById(id);
    
    if (!project) return res.status(404).json({ error: "Project not found" });

    // Simple authorization check
    const userId = req.user?.uid;
    if (!project.members.includes(userId!) && project.ownerId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.status(200).json(mapProjectWithDeadline(project));
  } catch (error) {
    logger.error("Failed to get project", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const project = await repo.findById(id);
    
    if (!project) return res.status(404).json({ error: "Project not found" });

    const userId = req.user?.uid;
    // For Phase 7: Any member can update the project, or just owner? Let's allow members.
    if (!project.members.includes(userId!) && project.ownerId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updates = req.body;
    // Security: Do not allow changing ownerId directly through general update
    delete updates.ownerId; 
    delete updates.createdAt;
    delete updates.updatedAt;
    
    // Parse dates if provided
    if (updates.start_at) updates.start_at = new Date(updates.start_at);
    if (updates.deadline_at) updates.deadline_at = new Date(updates.deadline_at);
    
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

    res.status(200).json(updatedProject ? mapProjectWithDeadline(updatedProject) : null);
  } catch (error) {
    logger.error("Failed to update project", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const project = await repo.findById(id);
    
    if (!project) return res.status(404).json({ error: "Project not found" });

    const userId = req.user?.uid;
    // Only owner can delete
    if (project.ownerId !== userId) {
      return res.status(403).json({ error: "Forbidden: Only owner can delete" });
    }

    if (project.status === "completed" || project.result) {
      return res.status(403).json({ error: "Forbidden: Completed projects cannot be deleted, they are kept in history." });
    }

    await repo.delete(id);
    res.status(204).send();
  } catch (error) {
    logger.error("Failed to delete project", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addProjectComment = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { text, mentions } = req.body;
    if (!text) return res.status(400).json({ error: "Comment text is required" });

    const project = await repo.findById(id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const userId = req.user?.uid;
    if (!project.members.includes(userId!) && project.ownerId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const newComment = {
      id: crypto.randomUUID(),
      userId: userId!,
      text,
      mentions: Array.isArray(mentions) ? mentions : [],
      createdAt: new Date(),
    };

    const updatedComments = [...(project.comments || []), newComment];
    await repo.update(id, { comments: updatedComments });

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

    res.status(201).json(newComment);
  } catch (error) {
    logger.error("Failed to add comment", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const setProjectResult = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { type, prize, amount, result_date, comment, results_url, files } = req.body;
    
    if (!type) {
      return res.status(400).json({ error: "Result type is required" });
    }

    const project = await repo.findById(id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const userId = req.user?.uid;
    // Only owner or responsible user can set results (or maybe any member, let's stick to owner/responsible for now, or just member)
    if (!project.members.includes(userId!) && project.ownerId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const result = {
      type,
      prize,
      amount,
      result_date: result_date ? new Date(result_date) : new Date(),
      comment,
      results_url,
      files: Array.isArray(files) ? files : []
    };

    // Updating the project with result and also changing status to completed if it isn't
    const updates: any = { result };
    if (project.status !== "completed") {
      updates.status = "completed";
    }

    await repo.update(id, updates);
    const updatedProject = await repo.findById(id);

    // If status changed to completed, we could send a notification here too (similar to updateProject)
    if (updatedProject && updates.status === "completed") {
      for (const memberId of updatedProject.members) {
        if (memberId !== userId) {
          sendNotification({
            userId: memberId,
            type: "project_completed",
            title: "Project Completed",
            message: `Project ${updatedProject.name} has been marked as completed with result: ${type}`,
            referenceId: updatedProject.id,
            referenceType: "project"
          });
        }
      }
    }

    res.status(200).json(updatedProject ? mapProjectWithDeadline(updatedProject) : null);
  } catch (error) {
    logger.error("Failed to set project result", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};
