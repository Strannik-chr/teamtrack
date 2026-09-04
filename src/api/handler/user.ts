import { Response } from "express";
import { UserRepository } from "../../repository/user_repo.js";
import { AuthRequest } from "../middleware/auth.js";
import { logger } from "../../pkg/logger/logger.js";

const repo = new UserRepository();

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.user?.id;
    if (!id) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

    const user = await repo.findById(id);

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    logger.error("Failed to get current user", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const listUsers = async (req: AuthRequest, res: Response) => {
  try {
    // In a real scenario, check if req.user has MANAGER/ADMIN role
    const users = await repo.listAll();
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    logger.error("Failed to list users", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};
