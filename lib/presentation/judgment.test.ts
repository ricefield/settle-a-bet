import { panelMemberName, verdictPresentation, verdictVoteLabel, voteSplit } from "./judgment";

const participants = [
  { label: "A", name: "Ada", position: "Venus is hotter." },
  { label: "B", name: "Grace", position: "Mercury is hotter." },
];
const positionMap = [
  { id: "position-a", members: ["A"] },
  { id: "position-b", members: ["B"] },
];

describe("Judgment presentation", () => {
  it("turns an internal Position ID into a public-facing winner", () => {
    expect(verdictPresentation("POSITION:position-a", positionMap, participants)).toEqual({
      eyebrow: "Ada's Position prevails",
      headline: "Venus is hotter.",
      detail: "The panel sided with Ada.",
      winningLabels: ["A"],
    });
    expect(verdictVoteLabel("POSITION:position-b", positionMap, participants)).toBe("Grace");
  });

  it("explains non-Position outcomes without leaking enum labels", () => {
    expect(verdictPresentation("INDETERMINATE", positionMap, participants).headline).toBe(
      "The panel could not settle it.",
    );
    expect(verdictVoteLabel("NO_MATERIAL_DISAGREEMENT", positionMap, participants)).toBe(
      "No material disagreement",
    );
  });

  it("summarizes the panel split", () => {
    expect(
      voteSplit("POSITION:position-a", [
        "POSITION:position-a",
        "POSITION:position-a",
        "POSITION:position-b",
      ]),
    ).toBe("Majority · 2–1");
    expect(
      voteSplit("POSITION:position-a", [
        "POSITION:position-a",
        "POSITION:position-a",
        "POSITION:position-a",
      ]),
    ).toBe("Unanimous · 3–0");
    expect(
      voteSplit("INDETERMINATE", [
        "POSITION:position-a",
        "POSITION:position-b",
        "NO_SUBMITTED_POSITION_PREVAILS",
      ]),
    ).toBe("No majority · split panel");
  });

  it("uses reader-friendly Judge names", () => {
    expect(panelMemberName("CLAUDE_OPUS")).toBe("Claude Opus");
    expect(panelMemberName("OPENAI_SOL")).toBe("OpenAI Sol");
    expect(panelMemberName("XAI_GROK")).toBe("Grok");
  });
});
