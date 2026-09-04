import { Adapter, ScrapedData } from "../types.js";
import { logger } from "../../logger/logger.js";
import axios from "axios";

export class DevpostAdapter implements Adapter {
  name = "Devpost API";
  
  async fetchAndParse(): Promise<ScrapedData[]> {
    logger.info(`Fetching data from ${this.name}...`);
    
    try {
      const response = await axios.get("https://devpost.com/api/hackathons?status[]=open&status[]=upcoming");
      const hackathons = response.data.hackathons || [];

      return hackathons.map((h: any) => {
        // Devpost prize amount often comes as HTML like `$<span data-currency-value>75,000</span>`
        const rawPrize = h.prize_amount || "";
        const cleanPrize = rawPrize.replace(/<[^>]*>?/gm, '').trim();

        // Parse dates roughly from "Aug 15 - Sep 11, 2026"
        let deadline: Date | undefined;
        try {
          if (h.submission_period_dates) {
            const parts = h.submission_period_dates.split("-");
            if (parts.length === 2) {
              const dateStr = parts[1].trim(); 
              // Assuming parts[1] is like "Sep 11, 2026"
              deadline = new Date(dateStr);
            }
          }
        } catch (e) {
          // ignore date parsing issues
        }

        return {
          title: h.title,
          organizer: h.organization_name || "Unknown",
          type: "hackathon",
          official_url: h.url,
          source_id: `devpost-${h.id}`,
          prize_fund: cleanPrize,
          deadline: deadline && !isNaN(deadline.getTime()) ? deadline : undefined
        };
      });
    } catch (error) {
      logger.error(`Error fetching from ${this.name}`, { error });
      throw error;
    }
  }
}
