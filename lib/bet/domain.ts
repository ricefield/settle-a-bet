import { createHash } from "node:crypto";

import type { PanelMember, PositionGroup, VoteType } from "@/lib/types";

export const PARTICIPANT_LABELS = ["A", "B", "C", "D"] as const;
export const PROMPT_VERSION = "mvp-1";
export const AGGREGATION_POLICY_VERSION = "mvp-1";

export type PositionMapProposal = { groups: string[][] };
export type JudgeVoteValue = {
  panelMember: PanelMember;
  voteType: VoteType;
  positionGroupId?: string;
};

export function participantLabels(count: number): string[] {
  if (!Number.isInteger(count) || count < 2 || count > PARTICIPANT_LABELS.length) {
    throw new RangeError("Participant count must be between 2 and 4");
  }
  return PARTICIPANT_LABELS.slice(0, count);
}

function normalizePartition(proposal: PositionMapProposal, labels: string[]): string[][] | null {
  const expected = [...labels].sort();
  const groups = proposal.groups
    .map((group) => [...new Set(group)].sort())
    .filter((group) => group.length > 0)
    .sort((left, right) => left.join("").localeCompare(right.join("")));
  const flattened = groups.flat().sort();
  if (JSON.stringify(flattened) !== JSON.stringify(expected)) return null;
  return groups;
}

export function consensusPositionMap(
  proposals: PositionMapProposal[],
  labels: string[],
): PositionGroup[] {
  const identity = labels.map((label) => [label]);
  const partitions = proposals
    .map((proposal) => normalizePartition(proposal, labels))
    .filter((partition): partition is string[][] => partition !== null);
  const counts = new Map<string, number>();
  for (const partition of partitions) {
    const key = JSON.stringify(partition);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const winner = [...counts.entries()].find(([, count]) => count >= 2)?.[0];
  const groups: string[][] = winner ? JSON.parse(winner) : identity;
  return groups.map((members) => ({
    id: `position-${members.map((member) => member.toLowerCase()).join("-")}`,
    members,
  }));
}

export function voteKey(vote: Pick<JudgeVoteValue, "voteType" | "positionGroupId">): string {
  if (vote.voteType === "POSITION") {
    if (!vote.positionGroupId) throw new Error("Position votes require a position group");
    return `POSITION:${vote.positionGroupId}`;
  }
  return vote.voteType;
}

export function aggregateVotes(votes: JudgeVoteValue[]): {
  verdictKey: string;
  prevailingGroup?: string;
} {
  if (votes.length !== 3) throw new Error("Exactly three valid Judge votes are required");
  const counts = new Map<string, number>();
  for (const vote of votes) {
    const key = voteKey(vote);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const majority = [...counts.entries()].find(([, count]) => count >= 2)?.[0] ?? "INDETERMINATE";
  return majority.startsWith("POSITION:")
    ? { verdictKey: majority, prevailingGroup: majority.slice("POSITION:".length) }
    : { verdictKey: majority };
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashResearchRecord(record: unknown): string {
  return createHash("sha256").update(stableJson(record), "utf8").digest("hex");
}

export function hypotheticalPot(stakeUsd: number, participantCount: number): number {
  return stakeUsd * participantCount;
}

export function validateSynthesis(
  lockedVerdictKey: string,
  candidate: { verdictKey: string; summary: string },
): string {
  if (candidate.verdictKey !== lockedVerdictKey) {
    throw new Error("Synthesizer attempted to alter the Verdict");
  }
  return candidate.summary;
}
