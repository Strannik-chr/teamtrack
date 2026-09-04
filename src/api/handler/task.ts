import { Request, Response } from "express";
import { TaskRepository, TaskStatus, TaskPriority, TaskComment, Task } from "../../repository/task_repo.js";
import { ProjectRepository } from "../../repository/project_repo.js";
import { AuthRequest } from "../middleware/auth.js";
import { logger } from "../../pkg/logger/logger.js";
import crypto from "crypto"; // Using web crypto API or Node crypto to generate simple UUIDs for comments
import { calculateDeadlineStatus, DeadlineStatus } from "../../pkg/deadline/deadline.js";
import { sendNotification } from "../../pkg/notification/service.js";

const taskRepo = new TaskRepository();
const projectRepo = new ProjectRepository();

const mapTaskWithDeadline = (task: Task): Task & { deadline_status: DeadlineStatus } => {
  const isCompleted = task.status === "done";
  return {
    ...task,
    deadline_status: calculateDeadlineStatus(task.deadline, isCompleted)
  };
};

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, title, description, status, priority, assigneeId, deadline } = req.body;
    
    if (!projectId || !title) {
      return res.status(400).json({ error: "projectId and title are required" });
    }

    // Verify project access
    const project = await projectRepo.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const userId = req.user?.uid;
    if (!project.members.includes(userId!) && project.ownerId !== userId) {
      return res.status(403).json({ error: "Forbidden: Not a member of this project" });
    }

    const task = await taskRepo.create({
      projectId,
      title,
      description: description || "",
      status: (status as TaskStatus) || "todo",
      priority: (priority as TaskPriority) || "medium",
      assigneeId,
      deadline: deadline ? new Date(deadline) : undefined,
      comments: []
    });

    if (assigneeId && assigneeId !== userId) {
      sendNotification({
        userId: assigneeId,
        type: "task_assigned",
        title: "New Task Assigned",
        message: `You have been assigned to task: ${title}`,
        referenceId: task.id,
        referenceType: "task"
      });
    }

    res.status(201).json(mapTaskWithDeadline(task));
  } catch (error) {
    logger.error("Failed to create task", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const listTasks = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ error: "projectId query param is required" });
    }

    const project = await projectRepo.findById(projectId as string);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const userId = req.user?.uid;
    if (!project.members.includes(userId!) && project.ownerId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const tasks = await taskRepo.listByProject(projectId as string);
    res.status(200).json(tasks.map(mapTaskWithDeadline));
  } catch (error) {
    logger.error("Failed to list tasks", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getTask = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const task = await taskRepo.findById(id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const project = await projectRepo.findById(task.projectId);
    const userId = req.user?.uid;
    if (project && !project.members.includes(userId!) && project.ownerId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.status(200).json(mapTaskWithDeadline(task));
  } catch (error) {
    logger.error("Failed to get task", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const task = await taskRepo.findById(id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const project = await projectRepo.findById(task.projectId);
    const userId = req.user?.uid;
    if (project && !project.members.includes(userId!) && project.ownerId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updates = req.body;
    delete updates.id;
    delete updates.projectId;
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.comments; // Do not update comments via this endpoint

    if (updates.deadline) updates.deadline = new Date(updates.deadline);

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
      
      if (updates.deadline && (!task.deadline || updates.deadline.getTime() !== task.deadline.getTime())) {
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

    res.status(200).json(updatedTask ? mapTaskWithDeadline(updatedTask) : null);
  } catch (error) {
    logger.error("Failed to update task", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const task = await taskRepo.findById(id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const project = await projectRepo.findById(task.projectId);
    const userId = req.user?.uid;
    if (project && !project.members.includes(userId!) && project.ownerId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await taskRepo.delete(id);
    res.status(204).send();
  } catch (error) {
    logger.error("Failed to delete task", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addTaskComment = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { text, mentions } = req.body;
    if (!text) return res.status(400).json({ error: "Comment text is required" });

    const task = await taskRepo.findById(id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const project = await projectRepo.findById(task.projectId);
    const userId = req.user?.uid;
    if (project && !project.members.includes(userId!) && project.ownerId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const newComment: TaskComment = {
      id: crypto.randomUUID(),
      userId: userId!,
      text,
      mentions: Array.isArray(mentions) ? mentions : [],
      createdAt: new Date(),
    };

    const updatedComments = [...(task.comments || []), newComment];
    await taskRepo.update(id, { comments: updatedComments });

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

    res.status(201).json(newComment);
  } catch (error) {
    logger.error("Failed to add comment", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};
