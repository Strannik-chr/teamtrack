import { runScheduledScraping } from "./src/pkg/scraper/scheduler/index.js";
runScheduledScraping().then(console.log).catch(console.error);
