export interface ScrapedData {
  title: string;
  organizer: string;
  type: string;
  official_url: string;
  source_id: string; // unique ID from the source
  prize_fund?: string;
  start_at?: Date;
  deadline?: Date;
}

export interface Adapter {
  name: string;
  fetchAndParse(): Promise<ScrapedData[]>;
}
