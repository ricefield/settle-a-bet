export type PositionGroup = { id?: string; members?: string[] };

export type PublicParticipant = {
  label: string;
  name: string;
  position: string;
};

const OUTCOME_COPY: Record<string, { eyebrow: string; headline: string; detail: string }> = {
  NO_MATERIAL_DISAGREEMENT: {
    eyebrow: "No material disagreement",
    headline: "You were closer than you thought.",
    detail: "The panel found the submitted Positions substantively compatible.",
  },
  NO_SUBMITTED_POSITION_PREVAILS: {
    eyebrow: "No Position prevailed",
    headline: "The panel rejected every submitted answer.",
    detail: "At least two Judges found every submitted Position materially flawed.",
  },
  INDETERMINATE: {
    eyebrow: "Indeterminate",
    headline: "The panel could not settle it.",
    detail: "No two Judges aligned on a prevailing outcome.",
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
      return member?.replaceAll("_", " ") ?? "Unknown Judge";
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

  if (!names.length) return "A submitted Position";
  if (names.length === 1) return names[0] ?? "A submitted Position";
  return names.join(" + ");
}

export function verdictPresentation(
  verdictKey: string,
  positionMap: PositionGroup[],
  participants: PublicParticipant[],
): { eyebrow: string; headline: string; detail: string; winningLabels: string[] } {
  if (!verdictKey.startsWith("POSITION:")) {
    const copy = OUTCOME_COPY[verdictKey] ?? {
      eyebrow: "Panel result",
      headline: verdictKey.toLowerCase().replaceAll("_", " "),
      detail: "The Judge Panel has published its decision.",
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
      eyebrow: "A Position prevailed",
      headline: "The panel reached a majority decision.",
      detail: "See the Judge votes below for the winning Position.",
      winningLabels: members,
    };
  }

  const names = winners.map((winner) => winner.name);
  const positions = [...new Set(winners.map((winner) => winner.position.trim()))];
  return {
    eyebrow:
      names.length === 1 ? `${names[0]}'s Position prevails` : `${names.join(" + ")} prevail`,
    headline: positions[0] ?? "A submitted Position prevailed.",
    detail:
      names.length > 1 && positions.length > 1
        ? "The panel treated these Positions as materially equivalent."
        : `The panel sided with ${names.join(" and ")}.`,
    winningLabels: members,
  };
}

export function voteSplit(verdictKey: string, voteKeys: Array<string | undefined>): string {
  const matchingVotes = voteKeys.filter((voteKey) => voteKey === verdictKey).length;
  if (matchingVotes === 3) return "Unanimous · 3–0";
  if (matchingVotes === 2) return "Majority · 2–1";
  return "No majority · split panel";
}
