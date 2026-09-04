import { Adapter, ScrapedData } from "../types.js";
import { logger } from "../../logger/logger.js";

export class ErrorMockAdapter implements Adapter {
  name = "ErrorSource";
  
  async fetchAndParse(): Promise<ScrapedData[]> {
    logger.info(`Fetching data from ${this.name}...`);
    throw new Error("Simulated network failure on fetch");
  }
}
