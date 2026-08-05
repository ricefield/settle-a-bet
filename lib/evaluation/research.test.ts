import { stampResearchSources } from "./research";
import type { ResearchContribution } from "./types";

it("records source retrieval time mechanically", () => {
  const contribution = {
    searchQueries: [],
    positionMap: { groups: [["A"], ["B"]] },
    positions: [],
    unresolvedQuestions: [],
    sources: [
      {
        url: "https://example.com/source",
        title: "Example",
        retrievedAt: "2020-01-01T00:00:00.000Z",
        supports: ["A"],
        challenges: ["B"],
        relevantExcerpt: "Evidence",
      },
    ],
  } as ResearchContribution;

  const stamped = stampResearchSources(contribution, new Date("2026-08-05T21:30:00.000Z"));

  expect(stamped.sources[0].retrievedAt).toBe("2026-08-05T21:30:00.000Z");
  expect(contribution.sources[0].retrievedAt).toBe("2020-01-01T00:00:00.000Z");
});
