import { Request, Response, NextFunction } from "express";
import { logger } from "../../pkg/logger/logger.js";
import jwt from "jsonwebtoken";
import { config } from "../../config/config.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
    return;
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; email: string; role: string };
    
    // Verify user still exists
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.id)
    });

    if (!user) {
      res.status(401).json({ error: "Unauthorized: User not found" });
      return;
    }

    req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
    };

    next();
  } catch (error) {
    logger.error("Authentication failed", { error: (error as Error).message });
    res.status(401).json({ error: "Unauthorized: Invalid token" });
    return;
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden: Insufficient permissions" });
      return;
    }
    next();
  };
};
