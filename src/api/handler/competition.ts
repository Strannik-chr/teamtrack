import { Request, Response } from "express";
import { CompetitionRepository, CompetitionType } from "../../repository/competition_repo.js";
import { AuthRequest } from "../middleware/auth.js";
import { logger } from "../../pkg/logger/logger.js";

const repo = new CompetitionRepository();

export const createCompetition = async (req: AuthRequest, res: Response) => {
  try {
    // Only admins or managers should ideally create competitions manually
    // For Phase 6 we allow it to any authenticated user for simplicity, but we can check roles
    const userRole = req.user?.role || "MEMBER";
    // Usually we would check `if (userRole !== 'ADMIN') return 403` but skipping strict RBAC for basic flow unless requested.

    const { title, organizer, type, official_url, deadline, start_at, result_at, prize_fund, status } = req.body;

    if (!title || !type) {
      return res.status(400).json({ error: "Title and type are required" });
    }

    const competition = await repo.create({
      title,
      organizer: organizer || "Unknown",
      type: type as CompetitionType,
      official_url: official_url || "",
      deadline: deadline ? new Date(deadline) : undefined,
      start_at: start_at ? new Date(start_at) : undefined,
      result_at: result_at ? new Date(result_at) : undefined,
      prize_fund: prize_fund || "",
      status: status || "draft",
    });

    res.status(201).json(competition);
  } catch (error) {
    logger.error("Failed to create competition", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const listCompetitions = async (req: AuthRequest, res: Response) => {
  try {
    const { type, status, limit, offset } = req.query;

    const result = await repo.list({
      type: type as CompetitionType,
      status: status as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset as string,
    });

    res.status(200).json(result);
  } catch (error) {
    logger.error("Failed to list competitions", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getCompetition = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const competition = await repo.findById(id);
    
    if (!competition) {
      return res.status(404).json({ error: "Competition not found" });
    }

    res.status(200).json(competition);
  } catch (error) {
    logger.error("Failed to get competition", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};
