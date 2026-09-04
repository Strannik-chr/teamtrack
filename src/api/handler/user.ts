import { Response } from "express";
import { UserRepository } from "../../repository/user_repo.js";
import { AuthRequest } from "../middleware/auth.js";
import { logger } from "../../pkg/logger/logger.js";

const repo = new UserRepository();

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    let user = await repo.findById(uid);
    
    // Auto-create user profile if it doesn't exist (simulating registration flow)
    if (!user) {
      user = await repo.createOrUpdate({
        uid,
        email: req.user?.email || "",
        displayName: req.user?.name || "New User",
        role: "MEMBER", // default role
        createdAt: new Date(),
      });
      logger.info("Auto-created user profile", { uid });
    }

    res.status(200).json(user);
  } catch (error) {
    logger.error("Failed to get current user", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const listUsers = async (req: AuthRequest, res: Response) => {
  try {
    // In a real scenario, check if req.user has MANAGER/ADMIN role
    const users = await repo.listAll();
    res.status(200).json(users);
  } catch (error) {
    logger.error("Failed to list users", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};
