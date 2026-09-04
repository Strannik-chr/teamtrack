import { Request, Response, NextFunction } from "express";
import { auth } from "../../pkg/firebase/admin.js";
import { logger } from "../../pkg/logger/logger.js";

export interface AuthRequest extends Request {
  user?: any;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
    return;
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    logger.error("Authentication failed", { error: (error as Error).message });
    res.status(401).json({ error: "Unauthorized: Invalid token" });
    return;
  }
};
