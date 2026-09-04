import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { addTeamMember, removeTeamMember, updateTeamMemberRole } from "../handler/team.js";

const router = Router();

router.post("/:projectId/members", requireAuth, addTeamMember);
router.delete("/:projectId/members/:userId", requireAuth, removeTeamMember);
router.put("/:projectId/members/:userId/role", requireAuth, updateTeamMemberRole);

export const teamRouter = router;
