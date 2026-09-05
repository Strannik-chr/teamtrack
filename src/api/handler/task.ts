import { Request, Response } from "express";
import { TaskRepository } from "../../repository/task_repo.js";
import { ProjectRepository } from "../../repository/project_repo.js";
import { AuthRequest } from "../middleware/auth.js";
import { logger } from "../../pkg/logger/logger.js";
import { calculateDeadlineStatus, DeadlineStatus } from "../../pkg/deadline/deadline.js";
import { sendNotification } from "../../pkg/notification/service.js";
import { createTaskSchema, updateTaskSchema, addProjectCommentSchema as addTaskCommentSchema } from "../validation/schemas.js";
import { z } from "zod";

const taskRepo = new TaskRepository();
const projectRepo = new ProjectRepository();

const mapTaskWithDeadline = (task: any): any & { deadline_status: DeadlineStatus } => {
  const isCompleted = task.status === "DONE";
  return {
    ...task,
    deadline_status: calculateDeadlineStatus(task.deadline, isCompleted)
  };
};

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const validated = createTaskSchema.parse(req.body);
    const { projectId } = req.body; 
    
    if (!projectId) {
      return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "projectId is required" } });
    }

    const project = await projectRepo.findById(projectId);
    if (!project) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Project not found" } });

    const userId = req.user?.id;
    if (!project.members.includes(userId!)) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden: Not a member of this project" } });
    }

    if (validated.assigneeId && !project.members.includes(validated.assigneeId)) {
      return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Assignee must be a member of the project" } });
    }

    const task = await taskRepo.create({ ...validated, projectId });

    if (validated.assigneeId && validated.assigneeId !== userId) {
      sendNotification({
        userId: validated.assigneeId,
        type: "task_assigned",
        title: "New Task Assigned",
        message: `You have been assigned to task: ${validated.title}`,
        referenceId: task.id,
        referenceType: "task"
      });
    }

    res.status(201).json({ success: true, data: mapTaskWithDeadline(task) });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
       return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: (error as any).errors } });
    }
    logger.error("Failed to create task", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const listTasks = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, status, assigneeId } = req.query;
    if (!projectId) {
      return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "projectId query param is required" } });
    }

    const project = await projectRepo.findById(projectId as string);
    if (!project) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Project not found" } });

    const userId = req.user?.id;
    
    const memberRole = project.membersDetails?.find((m: any) => m.userId === userId)?.role;
    if (!memberRole) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } });
    }

    const tasks = await taskRepo.listByProject(projectId as string, {
      status: status as string | undefined,
      assigneeId: assigneeId as string | undefined
    });
    res.status(200).json({ success: true, data: tasks.map(mapTaskWithDeadline) });
  } catch (error) {
    logger.error("Failed to list tasks", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const getTask = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const task = await taskRepo.findById(id);
    if (!task) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Task not found" } });

    const project = await projectRepo.findById(task.projectId);
    const userId = req.user?.id;
    if (project && !project.members.includes(userId!)) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } });
    }

    res.status(200).json({ success: true, data: mapTaskWithDeadline(task) });
  } catch (error) {
    logger.error("Failed to get task", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const task = await taskRepo.findById(id);
    if (!task) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Task not found" } });

    const project = await projectRepo.findById(task.projectId);
    const userId = req.user?.id;
    
    if (!project) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Project not found" } });
    
    const memberRole = project.membersDetails?.find((m: any) => m.userId === userId)?.role;
    if (!memberRole) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } });
    }

    const updates = updateTaskSchema.parse(req.body);

    if (updates.assigneeId && !project.members.includes(updates.assigneeId)) {
      return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Assignee must be a member of the project" } });
    }

    if (memberRole === "MEMBER") {
      if (updates.deadline !== undefined || updates.assigneeId !== undefined || updates.title !== undefined || updates.description !== undefined) {
         return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "MEMBER can only update task status" } });
      }
    }

    await taskRepo.update(id, updates);
    const updatedTask = await taskRepo.findById(id);

    if (updatedTask) {
      if (updates.assigneeId && updates.assigneeId !== task.assigneeId && updates.assigneeId !== userId) {
        sendNotification({
          userId: updates.assigneeId,
          type: "task_assigned",
          title: "Task Assigned",
          message: `You have been assigned to task: ${updatedTask.title}`,
          referenceId: updatedTask.id,
          referenceType: "task"
        });
      }
      
      if (updates.deadline && (!task.deadline || updates.deadline !== task.deadline.toISOString())) {
        if (updatedTask.assigneeId && updatedTask.assigneeId !== userId) {
          sendNotification({
            userId: updatedTask.assigneeId,
            type: "deadline_changed",
            title: "Task Deadline Changed",
            message: `Deadline changed for task: ${updatedTask.title}`,
            referenceId: updatedTask.id,
            referenceType: "task"
          });
        }
      }
    }

    res.status(200).json({ success: true, data: updatedTask ? mapTaskWithDeadline(updatedTask) : null });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
       return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: (error as any).errors } });
    }
    logger.error("Failed to update task", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const task = await taskRepo.findById(id);
    if (!task) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Task not found" } });

    const project = await projectRepo.findById(task.projectId);
    const userId = req.user?.id;
    
    if (!project) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Project not found" } });

    const memberRole = project.membersDetails?.find((m: any) => m.userId === userId)?.role;
    if (!memberRole) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden: Not a member" } });
    }

    if (memberRole !== "OWNER" && memberRole !== "MANAGER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden: Only Owner or Manager can delete tasks" } });
    }

    await taskRepo.delete(id);
    res.status(200).json({ success: true, data: null });
  } catch (error) {
    logger.error("Failed to delete task", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const addTaskComment = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { text, mentions } = addTaskCommentSchema.parse(req.body);

    const task = await taskRepo.findById(id);
    if (!task) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Task not found" } });

    const project = await projectRepo.findById(task.projectId);
    const userId = req.user?.id;
    if (project && !project.members.includes(userId!)) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } });
    }

    const newComment = await taskRepo.addComment(id, userId!, text, mentions);

    if (newComment.mentions && newComment.mentions.length > 0) {
      for (const mentionId of newComment.mentions) {
        if (mentionId !== userId) {
          sendNotification({
            userId: mentionId,
            type: "comment_added",
            title: "New Mention in Task",
            message: `You were mentioned in a comment on task: ${task.title}`,
            referenceId: task.id,
            referenceType: "task"
          });
        }
      }
    } else if (task.assigneeId && task.assigneeId !== userId) {
      sendNotification({
        userId: task.assigneeId,
        type: "comment_added",
        title: "New Comment on Task",
        message: `A new comment was added to your task: ${task.title}`,
        referenceId: task.id,
        referenceType: "task"
      });
    }

    res.status(201).json({ success: true, data: newComment });
  } catch (error) {
    logger.error("Failed to add comment", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};