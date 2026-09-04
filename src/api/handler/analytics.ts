import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { ProjectRepository, Project } from "../../repository/project_repo.js";
import { TaskRepository, Task } from "../../repository/task_repo.js";
import { logger } from "../../pkg/logger/logger.js";
import { calculateDeadlineStatus } from "../../pkg/deadline/deadline.js";

const projectRepo = new ProjectRepository();
const taskRepo = new TaskRepository();

export const getAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Fetch projects
    const ownedProjects = await projectRepo.listByOwner(userId);
    const memberProjects = await projectRepo.listByMember(userId);
    
    // Deduplicate
    const projectMap = new Map<string, Project>();
    ownedProjects.forEach((p: Project) => p.id && projectMap.set(p.id, p));
    memberProjects.forEach((p: Project) => p.id && projectMap.set(p.id, p));
    const projects = Array.from(projectMap.values());

    // Fetch tasks for these projects
    const tasks: Task[] = [];
    for (const p of projects) {
      if (p.id) {
        const projectTasks = await taskRepo.listByProject(p.id);
        tasks.push(...projectTasks);
      }
    }

    let totalParticipations = 0;
    let finals = 0;
    let wins = 0;
    let totalPrizeMoney = 0;
    let activeProjects = 0;
    let completedProjects = 0;

    const winResultTypes = ["victory", "1st_place", "2nd_place", "3rd_place"];
    
    let mostSuccessfulProject: any = null;

    projects.forEach((p: Project) => {
      if (p.status === "completed") {
        completedProjects++;
        if (p.result) {
          totalParticipations++;
          if (winResultTypes.includes(p.result.type)) {
            wins++;
          }
          if (p.result.type === "finalist") {
            finals++;
          }
          if (p.result.amount) {
            totalPrizeMoney += p.result.amount;
            if (!mostSuccessfulProject || p.result.amount > (mostSuccessfulProject.result?.amount || 0)) {
              mostSuccessfulProject = { id: p.id, name: p.name, earned: p.result.amount };
            }
          }
        }
      } else if (p.status !== "cancelled") {
        activeProjects++;
      }
    });

    const winRate = totalParticipations > 0 ? Math.round((wins / totalParticipations) * 100) : 0;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: Task) => t.status === "done").length;
    
    const overdueTasks = tasks.filter((t: Task) => {
      if (t.status === "done" || !t.deadline) return false;
      const status = calculateDeadlineStatus(t.deadline, false);
      return status === "gray"; // meaning deadline passed
    }).length;

    // Team workload (active tasks by assignee)
    const workload: Record<string, number> = {};
    tasks.forEach((t: Task) => {
      if (t.status !== "done" && t.assigneeId) {
        workload[t.assigneeId] = (workload[t.assigneeId] || 0) + 1;
      }
    });

    // Most active member (based on completed tasks, or just most tasks overall)
    // For simplicity, we just use the assignee with most completed tasks in the fetched set
    const memberActivity: Record<string, number> = {};
    tasks.forEach((t: Task) => {
      if (t.status === "done" && t.assigneeId) {
        memberActivity[t.assigneeId] = (memberActivity[t.assigneeId] || 0) + 1;
      }
    });
    
    let mostActiveMember = null;
    let maxTasks = 0;
    for (const [memberId, count] of Object.entries(memberActivity)) {
      if (count > maxTasks) {
        mostActiveMember = memberId;
        maxTasks = count;
      }
    }

    res.status(200).json({
      projects: {
        total: projects.length,
        active: activeProjects,
        completed: completedProjects,
      },
      results: {
        totalParticipations,
        finals,
        wins,
        totalPrizeMoney,
        winRate
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        overdue: overdueTasks,
      },
      highlights: {
        mostSuccessfulProject,
        mostActiveMember: mostActiveMember ? { userId: mostActiveMember, completedTasks: maxTasks } : null,
      },
      workload
    });
  } catch (error) {
    logger.error("Failed to get analytics", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};
