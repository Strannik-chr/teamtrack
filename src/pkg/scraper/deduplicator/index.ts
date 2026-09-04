import { CompetitionRepository } from "../../../repository/competition_repo.js";

const repo = new CompetitionRepository();

export const isDuplicate = async (sourceId: string): Promise<boolean> => {
  const existing = await repo.findBySourceId(sourceId);
  return existing !== null;
};
