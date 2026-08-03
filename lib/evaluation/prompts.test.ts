import { hashResearchRecord } from "@/lib/bet/domain";
import type { EvaluationInput } from "./types";
import { judgmentPrompt, researchPrompt } from "./prompts";

const input: EvaluationInput = {
  betId: "bet-1",
  evaluationRunId: "run-1",
  publicId: "public-1",
  title: "A test",
  question: "Which Position prevails?",
  decisionContext: "Use public evidence.",
  stakeUsd: 10,
  participants: [
    { label: "A", position: "Yes", submission: "Evidence for yes", sourceUrls: [] },
    { label: "B", position: "No", submission: "Evidence for no", sourceUrls: [] },
  ],
};

describe("evaluation prompts", () => {
  it("contains anonymized labels and no participant names", () => {
    const prompt = researchPrompt(input);
    expect(prompt.user).toContain('"label":"A"');
    expect(prompt.user).not.toContain("Ada Lovelace");
    expect(prompt.system).toContain("symmetrically");
  });

  it("serializes the exact same frozen Research Record and hash for every Judge", () => {
    const record = { contributions: [{ panelMember: "CLAUDE_OPUS", evidence: "x" }] };
    const hash = hashResearchRecord(record);
    const first = judgmentPrompt(
      input,
      record,
      [
        { id: "position-a", members: ["A"] },
        { id: "position-b", members: ["B"] },
      ],
      hash,
    );
    const second = judgmentPrompt(
      input,
      record,
      [
        { id: "position-a", members: ["A"] },
        { id: "position-b", members: ["B"] },
      ],
      hash,
    );
    expect(first.user).toBe(second.user);
    expect(first.user).toContain(hash);
    expect(first.system).toContain("no web tools");
  });
});
