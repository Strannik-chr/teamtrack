import express from "express";
import { createServer } from "node:http";
import { config } from "./src/config/config.js";
import { logger } from "./src/pkg/logger/logger.js";
import { createRouter } from "./src/api/router.js";
import path from "path";
import fs from "fs";

const app = express();
app.use("/", createRouter());

// Serve static frontend in production
const clientPath = path.join(process.cwd(), "dist/client");
if (fs.existsSync(clientPath)) {
  app.use(express.static(clientPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });
}

const server = createServer(app);

const startServer = () => {
  server.listen(config.port, "0.0.0.0", () => {
    logger.info(`TeamTrack server running on http://0.0.0.0:${config.port}`);
  });
};

// Graceful Shutdown
const shutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  
  server.close(() => {
    logger.info("HTTP server closed.");
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds if connections remain
  setTimeout(() => {
    logger.error("Forceful shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer();
