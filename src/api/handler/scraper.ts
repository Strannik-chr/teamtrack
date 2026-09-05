import { Request, Response } from "express";
import { runScheduledScraping } from "../../pkg/scraper/scheduler/index.js";
import { logger } from "../../pkg/logger/logger.js";
import { AuthRequest } from "../middleware/auth.js";

export const triggerScraper = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Only ADMIN can trigger the scraper" } });
    }

    const result = await runScheduledScraping();
    res.status(200).json(result);
  } catch (error) {
    logger.error("Failed to run scraper pipeline", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};
