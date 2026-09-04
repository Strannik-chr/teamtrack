import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { ProjectRepository } from "../../repository/project_repo.js";
import { TaskRepository } from "../../repository/task_repo.js";
import { calculateDeadlineStatus, DeadlineStatus } from "../../pkg/deadline/deadline.js";
import { logger } from "../../pkg/logger/logger.js";

const projectRepo = new ProjectRepository();
const taskRepo = new TaskRepository();

export interface UrgentItem {
  id: string;
  type: "project" | "task";
  title: string;
  deadline: Date;
  statusColor: DeadlineStatus;
  projectId?: string;
}

export const getUrgentItems = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

    const urgentItems: UrgentItem[] = [];

    // 1. Fetch user projects
    const projects = await projectRepo.listByUser(userId);

    for (const project of projects) {
      const isProjectDone = project.status === "completed" || project.status === "cancelled";
      
      if (project.deadline_at && !isProjectDone) {
        const deadlineDate = new Date(project.deadline_at);
        const statusColor = calculateDeadlineStatus(deadlineDate, isProjectDone);
        if (statusColor === "red" || statusColor === "gray") {
          urgentItems.push({
            id: project.id!,
            type: "project",
            title: project.name,
            deadline: deadlineDate,
            statusColor
          });
        }
      }

      // 2. Fetch tasks for this project
      const tasks = await taskRepo.listByProject(project.id!);
      for (const task of tasks) {
        const isTaskDone = task.status === "DONE";
        
        // Include if the user is assigned, or just if it's urgent for the whole team. 
        // For now, let's include all urgent tasks in user's projects.
        if (task.deadline && !isTaskDone) {
          const taskDeadlineDate = new Date(task.deadline);
          const statusColor = calculateDeadlineStatus(taskDeadlineDate, isTaskDone);
          if (statusColor === "red" || statusColor === "gray") {
            urgentItems.push({
              id: task.id!,
              type: "task",
              title: task.title,
              deadline: taskDeadlineDate,
              statusColor,
              projectId: project.id
            });
          }
        }
      }
    }

    // Sort items by deadline ascending (most urgent first)
    urgentItems.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

    res.status(200).json({ success: true, data: urgentItems });
  } catch (error) {
    logger.error("Failed to get urgent items", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};
