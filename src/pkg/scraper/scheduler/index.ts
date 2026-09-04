import { ScraperEngine } from "../engine/pipeline.js";
import { DevpostMockAdapter } from "../adapters/devpost_mock.js";
import { ErrorMockAdapter } from "../adapters/error_mock.js";

export const runScheduledScraping = async () => {
  const engine = new ScraperEngine();
  
  // Register adapters
  engine.registerAdapter(new DevpostMockAdapter());
  engine.registerAdapter(new ErrorMockAdapter()); // Simulates failure isolation

  return await engine.runPipeline();
};
