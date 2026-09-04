import dotenv from "dotenv";
dotenv.config();

export const config = {
  // PORT is hardcoded to 3000 as required by the AI Studio environment
  port: 3000,
  env: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",
};
