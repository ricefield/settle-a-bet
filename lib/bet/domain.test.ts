import {
  aggregateVotes,
  consensusPositionMap,
  hashResearchRecord,
  hypotheticalPot,
  participantLabels,
  validateSynthesis,
} from "./domain";

describe("Bet domain", () => {
  it("creates stable participant labels", () => {
    expect(participantLabels(4)).toEqual(["A", "B", "C", "D"]);
    expect(() => participantLabels(5)).toThrow(RangeError);
  });

  it("accepts a complete position partition only with two matching proposals", () => {
    expect(
      consensusPositionMap(
        [
          { groups: [["A", "B"], ["C"]] },
          { groups: [["C"], ["B", "A"]] },
          { groups: [["A"], ["B"], ["C"]] },
        ],
        ["A", "B", "C"],
      ),
    ).toEqual([
      { id: "position-a-b", members: ["A", "B"] },
      { id: "position-c", members: ["C"] },
    ]);
  });

  it("falls back to identity positions without a majority partition", () => {
    expect(
      consensusPositionMap(
        [{ groups: [["A", "B"], ["C"]] }, { groups: [["A"], ["B", "C"]] }],
        ["A", "B", "C"],
      ),
    ).toEqual([
      { id: "position-a", members: ["A"] },
      { id: "position-b", members: ["B"] },
      { id: "position-c", members: ["C"] },
    ]);
  });

  it("mechanically aggregates matching votes", () => {
    expect(
      aggregateVotes([
        { panelMember: "CLAUDE_OPUS", voteType: "POSITION", positionGroupId: "position-a" },
        { panelMember: "OPENAI_SOL", voteType: "POSITION", positionGroupId: "position-a" },
        { panelMember: "XAI_GROK", voteType: "INDETERMINATE" },
      ]),
    ).toEqual({ verdictKey: "POSITION:position-a", prevailingGroup: "position-a" });
  });

  it("returns Indeterminate when no two votes align", () => {
    expect(
      aggregateVotes([
        { panelMember: "CLAUDE_OPUS", voteType: "POSITION", positionGroupId: "position-a" },
        { panelMember: "OPENAI_SOL", voteType: "NO_MATERIAL_DISAGREEMENT" },
        { panelMember: "XAI_GROK", voteType: "NO_SUBMITTED_POSITION_PREVAILS" },
      ]),
    ).toEqual({ verdictKey: "INDETERMINATE" });
  });

  it.each(["NO_MATERIAL_DISAGREEMENT", "NO_SUBMITTED_POSITION_PREVAILS", "INDETERMINATE"] as const)(
    "aggregates a %s majority",
    (voteType) => {
      expect(
        aggregateVotes([
          { panelMember: "CLAUDE_OPUS", voteType },
          { panelMember: "OPENAI_SOL", voteType },
          { panelMember: "XAI_GROK", voteType: "NO_MATERIAL_DISAGREEMENT" },
        ]),
      ).toEqual({ verdictKey: voteType });
    },
  );

  it("requires three valid votes and a group for Position votes", () => {
    expect(() =>
      aggregateVotes([
        { panelMember: "CLAUDE_OPUS", voteType: "INDETERMINATE" },
        { panelMember: "OPENAI_SOL", voteType: "INDETERMINATE" },
      ]),
    ).toThrow("Exactly three");
    expect(() =>
      aggregateVotes([
        { panelMember: "CLAUDE_OPUS", voteType: "POSITION" },
        { panelMember: "OPENAI_SOL", voteType: "INDETERMINATE" },
        { panelMember: "XAI_GROK", voteType: "INDETERMINATE" },
      ]),
    ).toThrow("require a position group");
  });

  it("hashes equivalent records identically and calculates the hypothetical pot", () => {
    expect(hashResearchRecord({ b: 2, a: 1 })).toBe(hashResearchRecord({ a: 1, b: 2 }));
    expect(hypotheticalPot(25, 3)).toBe(75);
  });

  it("does not let synthesis alter the locked Verdict", () => {
    expect(
      validateSynthesis("POSITION:position-a", {
        verdictKey: "POSITION:position-a",
        summary: "Position A prevailed.",
      }),
    ).toBe("Position A prevailed.");
    expect(() =>
      validateSynthesis("POSITION:position-a", {
        verdictKey: "POSITION:position-b",
        summary: "Position B prevailed.",
      }),
    ).toThrow("alter the Verdict");
  });
});
