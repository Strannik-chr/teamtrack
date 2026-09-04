import { describe, it, expect } from "vitest";
import { normalize } from "./index.js";
import { ScrapedData } from "../types.js";

describe("Scraper Normalizer", () => {
  it("should normalize scraped data correctly", () => {
    const rawData: ScrapedData = {
      title: "  Hackathon 2026  ",
      organizer: "  TechCorp  \n",
      type: "hackathon",
      official_url: "https://example.com",
      source_id: "src-1",
      prize_fund: "$100",
    };

    const normalized = normalize(rawData);

    expect(normalized.title).toBe("Hackathon 2026");
    expect(normalized.organizer).toBe("TechCorp");
    expect(normalized.type).toBe("hackathon");
    expect(normalized.official_url).toBe("https://example.com");
    expect(normalized.source_id).toBe("src-1");
    expect(normalized.status).toBe("published");
  });
});
