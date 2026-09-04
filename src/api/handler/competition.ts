import { Request, Response } from "express";
import { CompetitionRepository } from "../../repository/competition_repo.js";
import { AuthRequest } from "../middleware/auth.js";
import { logger } from "../../pkg/logger/logger.js";
import { createCompetitionSchema, updateCompetitionSchema } from "../validation/schemas.js";

const repo = new CompetitionRepository();

export const createCompetition = async (req: AuthRequest, res: Response) => {
  try {
    const validated = createCompetitionSchema.parse(req.body);

    const competition = await repo.create(validated);

    res.status(201).json({ success: true, data: competition });
  } catch (error) {
    logger.error("Failed to create competition", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const updateCompetition = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Only ADMIN can update competitions" } });
    }

    const id = req.params.id as string;
    const validated = updateCompetitionSchema.parse(req.body);
    
    const comp = await repo.findById(id);
    if (!comp) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Competition not found" } });
    }

    await repo.update(id, validated);
    const updated = await repo.findById(id);

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    logger.error("Failed to update competition", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const deleteCompetition = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Only ADMIN can delete competitions" } });
    }

    const id = req.params.id as string;
    const comp = await repo.findById(id);
    if (!comp) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Competition not found" } });
    }

    await repo.delete(id);
    res.status(200).json({ success: true, data: null });
  } catch (error) {
    logger.error("Failed to delete competition", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const listCompetitions = async (req: AuthRequest, res: Response) => {
  try {
    const { type, status, limit, offset } = req.query;

    const result = await repo.list({
      type: type as string,
      status: status as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset as string,
    });

    res.status(200).json({ success: true, data: result.data, nextCursor: result.nextCursor });
  } catch (error) {
    logger.error("Failed to list competitions", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const getCompetition = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const competition = await repo.findById(id);
    
    if (!competition) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Competition not found" } });
    }

    res.status(200).json({ success: true, data: competition });
  } catch (error) {
    logger.error("Failed to get competition", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};
