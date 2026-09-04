import { Request, Response } from "express";

export const healthCheck = (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    app: "TeamTrack",
    version: "1.0.0",
    phase: 19,
    stage: "Release",
    timestamp: new Date().toISOString(),
  });
};
