import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { ProjectRepository } from "../../repository/project_repo.js";
import { TaskRepository } from "../../repository/task_repo.js";
import { CompetitionRepository } from "../../repository/competition_repo.js";
import { calculateDeadlineStatus } from "../../pkg/deadline/deadline.js";
import { logger } from "../../pkg/logger/logger.js";

const projectRepo = new ProjectRepository();
const taskRepo = new TaskRepository();
const compRepo = new CompetitionRepository();

export interface CalendarEvent {
  id: string;
  title: string;
  type: "project_start" | "project_deadline" | "task_deadline" | "competition_start" | "competition_deadline";
  date: Date;
  statusColor: string;
  referenceId: string;
}

export const getCalendarEvents = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const events: CalendarEvent[] = [];
    
    // 1. Fetch user projects
    const projects = await projectRepo.listByMember(userId);

    // Prepare competition set for batch fetch
    const compIds = new Set<string>();

    for (const project of projects) {
      if (project.competition_id) compIds.add(project.competition_id);
      
      const isProjectDone = project.status === "completed" || project.status === "cancelled";

      if (project.start_at) {
        events.push({
          id: `proj_start_${project.id}`,
          title: `Start: ${project.name}`,
          type: "project_start",
          date: project.start_at,
          statusColor: "blue",
          referenceId: project.id!
        });
      }

      if (project.deadline_at) {
        events.push({
          id: `proj_end_${project.id}`,
          title: `Deadline: ${project.name}`,
          type: "project_deadline",
          date: project.deadline_at,
          statusColor: calculateDeadlineStatus(project.deadline_at, isProjectDone),
          referenceId: project.id!
        });
      }

      // 2. Fetch tasks for this project
      const tasks = await taskRepo.listByProject(project.id!);
      for (const task of tasks) {
        if (task.deadline) {
          const isTaskDone = task.status === "done";
          // Only show task deadlines if assigned to current user, or maybe all tasks in project? Let's show all tasks in the project for overview.
          events.push({
            id: `task_${task.id}`,
            title: `Task: ${task.title}`,
            type: "task_deadline",
            date: task.deadline,
            statusColor: calculateDeadlineStatus(task.deadline, isTaskDone),
            referenceId: task.id!
          });
        }
      }
    }

    // 3. Fetch referenced competitions
    for (const compId of Array.from(compIds)) {
      const comp = await compRepo.findById(compId);
      if (comp) {
        if (comp.start_at) {
          events.push({
            id: `comp_start_${comp.id}`,
            title: `Comp Start: ${comp.title}`,
            type: "competition_start",
            date: comp.start_at,
            statusColor: "blue",
            referenceId: comp.id!
          });
        }
        if (comp.deadline) {
          // Assume competition deadline is just informational (gray/green depending on date, but not actionable by team status natively, though we could use the deadline logic).
          events.push({
            id: `comp_end_${comp.id}`,
            title: `Comp Deadline: ${comp.title}`,
            type: "competition_deadline",
            date: comp.deadline,
            statusColor: calculateDeadlineStatus(comp.deadline, false),
            referenceId: comp.id!
          });
        }
      }
    }

    // Sort events by date ascending
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    res.status(200).json(events);
  } catch (error) {
    logger.error("Failed to get calendar events", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};
