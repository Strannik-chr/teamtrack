import dotenv from "dotenv";
dotenv.config();

export const config = {
  // Use process.env.PORT or default to 3000. During dev, API runs on 3001.
  port: parseInt(process.env.PORT || "3000", 10),
  env: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",
  jwtSecret: process.env.JWT_SECRET || "super-secret-fallback-key-for-dev",
};
