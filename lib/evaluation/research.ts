import type { ResearchContribution } from "./types";

export function stampResearchSources(
  contribution: ResearchContribution,
  retrievedAt: Date,
): ResearchContribution {
  const timestamp = retrievedAt.toISOString();
  return {
    ...contribution,
    sources: contribution.sources.map((source) => ({ ...source, retrievedAt: timestamp })),
  };
}
