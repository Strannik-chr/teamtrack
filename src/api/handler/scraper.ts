import { Request, Response } from "express";
import { runScheduledScraping } from "../../pkg/scraper/scheduler/index.js";
import { logger } from "../../pkg/logger/logger.js";

export const triggerScraper = async (req: Request, res: Response) => {
  try {
    // In production, protect this endpoint (e.g. secret token header or GCP cron auth)
    const result = await runScheduledScraping();
    res.status(200).json(result);
  } catch (error) {
    logger.error("Failed to run scraper pipeline", { error });
    res.status(500).json({ error: "Internal server error" });
  }
};
