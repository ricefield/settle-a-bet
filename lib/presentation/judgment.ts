export type PositionGroup = { id?: string; members?: string[] };

export type PublicParticipant = {
  label: string;
  name: string;
  position: string;
};

const OUTCOME_COPY: Record<string, { eyebrow: string; headline: string; detail: string }> = {
  NO_MATERIAL_DISAGREEMENT: {
    eyebrow: "Basically a tie",
    headline: "You’re saying the same thing.",
    detail: "At least two panelists found that the answers agree where it matters.",
  },
  NO_SUBMITTED_POSITION_PREVAILS: {
    eyebrow: "Neither answer won",
    headline: "The panel wasn’t sold on either take.",
    detail: "At least two panelists found that every submitted answer had a major problem.",
  },
  INDETERMINATE: {
    eyebrow: "Too close to call",
    headline: "The panel couldn’t settle this one.",
    detail: "No two panelists landed on the same result.",
  },
};

export function panelMemberName(member: string | undefined): string {
  switch (member) {
    case "CLAUDE_OPUS":
      return "Claude Opus";
    case "OPENAI_SOL":
      return "OpenAI Sol";
    case "XAI_GROK":
      return "Grok";
    default:
      return member?.replaceAll("_", " ") ?? "Unknown panelist";
  }
}

export function verdictVoteLabel(
  voteKey: string | undefined,
  positionMap: PositionGroup[],
  participants: PublicParticipant[],
): string {
  if (!voteKey) return "No valid vote";
  if (!voteKey.startsWith("POSITION:")) {
    return OUTCOME_COPY[voteKey]?.eyebrow ?? voteKey.toLowerCase().replaceAll("_", " ");
  }

  const groupId = voteKey.slice("POSITION:".length);
  const group = positionMap.find((item) => item.id === groupId);
  const members = group?.members ?? [];
  const names = members
    .map((label) => participants.find((participant) => participant.label === label)?.name)
    .filter((name): name is string => Boolean(name));

  if (!names.length) return "One answer";
  if (names.length === 1) return names[0] ?? "One answer";
  return names.join(" + ");
}

export function verdictPresentation(
  verdictKey: string,
  positionMap: PositionGroup[],
  participants: PublicParticipant[],
): { eyebrow: string; headline: string; detail: string; winningLabels: string[] } {
  if (!verdictKey.startsWith("POSITION:")) {
    const copy = OUTCOME_COPY[verdictKey] ?? {
      eyebrow: "Final result",
      headline: verdictKey.toLowerCase().replaceAll("_", " "),
      detail: "The AI panel has posted its result.",
    };
    return { ...copy, winningLabels: [] };
  }

  const groupId = verdictKey.slice("POSITION:".length);
  const group = positionMap.find((item) => item.id === groupId);
  const members = group?.members ?? [];
  const winners = members
    .map((label) => participants.find((participant) => participant.label === label))
    .filter((participant): participant is PublicParticipant => Boolean(participant));

  if (!winners.length) {
    return {
      eyebrow: "We have a winner",
      headline: "The panel picked one answer.",
      detail: "See the panel votes below for the winning take.",
      winningLabels: members,
    };
  }

  const names = winners.map((winner) => winner.name);
  const positions = [...new Set(winners.map((winner) => winner.position.trim()))];
  return {
    eyebrow: names.length === 1 ? `${names[0]} wins` : `${names.join(" + ")} win`,
    headline: positions[0] ?? "One answer won.",
    detail:
      names.length > 1 && positions.length > 1
        ? "The panel treated these answers as meaningfully the same."
        : `The panel picked ${names.join(" and ")}'s answer.`,
    winningLabels: members,
  };
}

export function voteSplit(verdictKey: string, voteKeys: Array<string | undefined>): string {
  const matchingVotes = voteKeys.filter((voteKey) => voteKey === verdictKey).length;
  if (matchingVotes === 3) return "Unanimous · 3–0";
  if (matchingVotes === 2) return "Majority · 2–1";
  return "No majority · split panel";
}
