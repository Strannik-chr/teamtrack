import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request payload",
            details: (error as any).errors
          }
        });
      }
      return res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Validation error" } });
    }
  };
};
