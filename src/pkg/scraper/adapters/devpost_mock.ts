import { Adapter, ScrapedData } from "../types.js";
import { logger } from "../../logger/logger.js";
// import axios from "axios";
// import * as cheerio from "cheerio";

export class DevpostMockAdapter implements Adapter {
  name = "DevpostMock";
  
  async fetchAndParse(): Promise<ScrapedData[]> {
    logger.info(`Fetching data from ${this.name}...`);
    // Simulated fetch delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In reality:
    // const response = await axios.get("https://devpost.com/hackathons");
    // const $ = cheerio.load(response.data);
    // ... parse HTML to ScrapedData

    return [
      {
        title: "AI Hackathon Spring 2026",
        organizer: "AI Foundation",
        type: "hackathon",
        official_url: "https://example.com/ai-hackathon",
        source_id: "devpost-mock-1",
        prize_fund: "$100,000",
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        title: "Global Tech Championship",
        organizer: "TechCorp",
        type: "championship",
        official_url: "https://example.com/global-tech",
        source_id: "devpost-mock-2",
        prize_fund: "$50,000"
      }
    ];
  }
}
