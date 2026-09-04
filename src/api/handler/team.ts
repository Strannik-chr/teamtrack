import { Request, Response } from "express";
import { ProjectRepository } from "../../repository/project_repo.js";
import { AuthRequest } from "../middleware/auth.js";
import { logger } from "../../pkg/logger/logger.js";
import { addMemberSchema, updateMemberRoleSchema } from "../validation/team.js";
import { z } from "zod";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";

const repo = new ProjectRepository();

export const addTeamMember = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    const validated = addMemberSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
    
    const role = await repo.getMemberRole(projectId, userId);
    if (role !== "OWNER" && role !== "MANAGER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Only Owner or Manager can add members" } });
    }

    const userToAdd = await db.query.users.findFirst({
      where: eq(users.email, validated.email)
    });

    if (!userToAdd) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found" } });
    }

    const isAlreadyMember = await repo.isUserInProject(projectId, userToAdd.id);
    if (isAlreadyMember) {
      return res.status(409).json({ success: false, error: { code: "CONFLICT", message: "User is already a member" } });
    }

    await repo.addMember(projectId, userToAdd.id, validated.role);
    res.status(201).json({ success: true, data: { userId: userToAdd.id, role: validated.role } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: (error as any).errors } });
    }
    logger.error("Failed to add team member", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const removeTeamMember = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    const memberId = req.params.userId as string;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
    
    const currentUserRole = await repo.getMemberRole(projectId, userId);
    const targetUserRole = await repo.getMemberRole(projectId, memberId);

    if (!targetUserRole) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Member not found in project" } });
    }

    if (targetUserRole === "OWNER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Cannot remove the owner" } });
    }

    if (currentUserRole !== "OWNER" && currentUserRole !== "MANAGER") {
      // User can remove themselves, unless they are the owner
      if (userId !== memberId) {
        return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Only Owner or Manager can remove members" } });
      }
    }

    await repo.removeMember(projectId, memberId);
    res.status(200).json({ success: true, data: null });
  } catch (error) {
    logger.error("Failed to remove team member", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};

export const updateTeamMemberRole = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    const memberId = req.params.userId as string;
    const validated = updateMemberRoleSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
    
    const currentUserRole = await repo.getMemberRole(projectId, userId);
    const targetUserRole = await repo.getMemberRole(projectId, memberId);

    if (!targetUserRole) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Member not found in project" } });
    }

    if (currentUserRole !== "OWNER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Only Owner can change roles" } });
    }

    if (targetUserRole === "OWNER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Cannot change the owner's role" } });
    }

    await repo.updateMemberRole(projectId, memberId, validated.role);
    res.status(200).json({ success: true, data: { userId: memberId, role: validated.role } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: (error as any).errors } });
    }
    logger.error("Failed to update team member role", { error });
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } });
  }
};
