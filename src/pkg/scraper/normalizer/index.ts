import { ScrapedData } from "../types.js";
import { Competition } from "../../../repository/competition_repo.js";

export const normalize = (data: ScrapedData): Omit<Competition, "id" | "created_at" | "updated_at"> => {
  return {
    title: data.title.trim(),
    organizer: data.organizer.trim(),
    type: data.type,
    official_url: data.official_url,
    source_id: data.source_id,
    prize_fund: data.prize_fund,
    deadline: data.deadline,
    start_at: data.start_at,
    status: "published"
  };
};
