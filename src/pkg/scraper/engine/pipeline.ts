import { Adapter } from "../types.js";
import { normalize } from "../normalizer/index.js";
import { isDuplicate } from "../deduplicator/index.js";
import { CompetitionRepository } from "../../../repository/competition_repo.js";
import { logger } from "../../logger/logger.js";

const repo = new CompetitionRepository();

export class ScraperEngine {
  private adapters: Adapter[] = [];

  registerAdapter(adapter: Adapter) {
    this.adapters.push(adapter);
  }

  async runPipeline(): Promise<{ totalProcessed: number, newAdded: number, errors: number }> {
    let totalProcessed = 0;
    let newAdded = 0;
    let errors = 0;

    logger.info(`Starting Scraper Pipeline with ${this.adapters.length} adapters...`);

    for (const adapter of this.adapters) {
      try {
        const rawData = await adapter.fetchAndParse();
        logger.info(`Adapter [${adapter.name}] returned ${rawData.length} items`);

        for (const item of rawData) {
          totalProcessed++;
          try {
            // 1. Deduplicate
            const exists = await isDuplicate(item.source_id);
            if (exists) {
              logger.debug(`Skipping duplicate: ${item.source_id}`);
              continue;
            }

            // 2. Normalize
            const normalized = normalize(item);

            // 3. Validate
            if (!normalized.title || !normalized.official_url) {
              logger.warn(`Invalid item skipped from ${adapter.name}: missing title or url`);
              continue;
            }

            // 4. Upsert (Create)
            await repo.create(normalized);
            newAdded++;
          } catch (itemErr) {
            logger.error(`Error processing item ${item.source_id} from ${adapter.name}`, { error: itemErr });
            // Continue processing next items
          }
        }
      } catch (adapterErr) {
        // One adapter failure should not stop the pipeline
        logger.error(`Adapter [${adapter.name}] failed completely`, { error: adapterErr });
        errors++;
      }
    }

    logger.info(`Scraper Pipeline Finished. Processed: ${totalProcessed}, Added: ${newAdded}, Adapter Errors: ${errors}`);
    return { totalProcessed, newAdded, errors };
  }
}
