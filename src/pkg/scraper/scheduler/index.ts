import { ScraperEngine } from "../engine/pipeline.js";
import { DevpostAdapter } from "../adapters/devpost_adapter.js";
import { ErrorMockAdapter } from "../adapters/error_mock.js";

export const runScheduledScraping = async () => {
  const engine = new ScraperEngine();
  
  // Register adapters
  engine.registerAdapter(new DevpostAdapter());
  engine.registerAdapter(new ErrorMockAdapter()); // Simulates failure isolation

  return await engine.runPipeline();
};
