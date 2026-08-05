import { ConflictError, RateLimitError } from "@/lib/errors";
import { Prisma } from "@/lib/generated/prisma/client";
import type { BetStore } from "@/lib/bet/store";
import type { BetStatus } from "@/lib/types";
import { getPrismaClient } from "./common";

const json = (value: unknown) => value as Prisma.InputJsonValue;

export const consumeCreationRateLimit: BetStore["consumeCreationRateLimit"] = async ({
  key,
  windowStart,
  limit,
}) => {
  const bucket = await getPrismaClient().rateLimitBucket.upsert({
    where: { key },
    create: { key, count: 1, windowStart },
    update: { count: { increment: 1 } },
  });
  if (bucket.count > limit) throw new RateLimitError("You can create at most five Bets per hour");
};

export const createBet: BetStore["createBet"] = async ({
  publicId,
  organizerTokenHash,
  creatorIpHash,
  bet,
  slots,
}) => {
  await getPrismaClient().bet.create({
    data: {
      publicId,
      organizerTokenHash,
      creatorIpHash,
      title: bet.title,
      question: bet.question,
      decisionContext: bet.decisionContext,
      participantCount: bet.participantCount,
      stakeUsd: bet.stakeUsd,
      slots: {
        create: slots.map((slot) => ({
          ordinal: slot.ordinal,
          label: slot.label,
          invitationTokenHash: slot.invitationTokenHash,
          invitationTokenCiphertext: slot.invitationTokenCiphertext,
          name: slot.submission?.name,
          position: slot.submission?.position,
          submission: slot.submission?.submission,
          sourceUrls: json(slot.submission?.sourceUrls ?? []),
          submittedAt: slot.submission ? new Date() : undefined,
        })),
      },
    },
  });
};

export const getInvitation: BetStore["getInvitation"] = async (tokenHash) => {
  const slot = await getPrismaClient().participantSlot.findUnique({
    where: { invitationTokenHash: tokenHash },
    include: { bet: true },
  });
  if (!slot) return null;
  return {
    publicId: slot.bet.publicId,
    status: slot.bet.status,
    title: slot.bet.title,
    question: slot.bet.question,
    decisionContext: slot.bet.decisionContext,
    participantCount: slot.bet.participantCount,
    stakeUsd: slot.bet.stakeUsd,
    label: slot.label,
    alreadySubmitted: Boolean(slot.submittedAt),
  };
};

export const submitInvitation: BetStore["submitInvitation"] = async ({
  tokenHash,
  submission,
  now,
  promptVersion,
  aggregationPolicyVersion,
}) => {
  const prisma = getPrismaClient();
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const slot = await tx.participantSlot.findUnique({
            where: { invitationTokenHash: tokenHash },
            include: { bet: true },
          });
          if (!slot) return null;
          if (slot.bet.status !== "OPEN")
            throw new ConflictError("This Bet is no longer accepting submissions");

          const updated = await tx.participantSlot.updateMany({
            where: { id: slot.id, submittedAt: null },
            data: {
              name: submission.name,
              position: submission.position,
              submission: submission.submission,
              sourceUrls: json(submission.sourceUrls),
              submittedAt: now,
            },
          });
          if (updated.count !== 1)
            throw new ConflictError("This invitation has already been submitted");

          const submittedCount = await tx.participantSlot.count({
            where: { betId: slot.betId, submittedAt: { not: null } },
          });
          let shouldQueue = false;
          let status: BetStatus = slot.bet.status;
          if (submittedCount === slot.bet.participantCount) {
            const locked = await tx.bet.updateMany({
              where: { id: slot.betId, status: "OPEN" },
              data: { status: "QUEUED", lockedAt: now },
            });
            if (locked.count === 1) {
              await tx.evaluationRun.create({
                data: {
                  betId: slot.betId,
                  promptVersion,
                  aggregationPolicyVersion,
                },
              });
              shouldQueue = true;
              status = "QUEUED";
            }
          }

          return {
            betId: slot.betId,
            publicId: slot.bet.publicId,
            status,
            submittedCount,
            participantCount: slot.bet.participantCount,
            shouldQueue,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      const retryable =
        typeof error === "object" && error !== null && "code" in error && error.code === "P2034";
      if (!retryable || attempt === 3) throw error;
    }
  }
  throw new Error("Unreachable submission retry state");
};

export const getOrganizer: BetStore["getOrganizer"] = async (tokenHash) => {
  const bet = await getPrismaClient().bet.findUnique({
    where: { organizerTokenHash: tokenHash },
    include: { slots: { orderBy: { ordinal: "asc" } } },
  });
  if (!bet) return null;
  return {
    publicId: bet.publicId,
    status: bet.status,
    title: bet.title,
    question: bet.question,
    participantCount: bet.participantCount,
    stakeUsd: bet.stakeUsd,
    slots: bet.slots.map((slot) => ({
      label: slot.label,
      name: slot.name,
      submitted: Boolean(slot.submittedAt),
      invitationTokenCiphertext: slot.invitationTokenCiphertext,
    })),
    failureReason: bet.failureReason,
  };
};

export const cancel: BetStore["cancel"] = async (tokenHash, now) => {
  const result = await getPrismaClient().bet.updateMany({
    where: { organizerTokenHash: tokenHash, status: "OPEN" },
    data: { status: "CANCELLED", cancelledAt: now },
  });
  return result.count === 1;
};

export const listPublic: BetStore["listPublic"] = async () => {
  const bets = await getPrismaClient().bet.findMany({
    where: { status: "PUBLISHED", visibility: "PUBLIC" },
    orderBy: { publishedAt: "desc" },
    include: { slots: { orderBy: { ordinal: "asc" } }, judgment: true },
    take: 100,
  });
  return bets.flatMap((bet) => {
    if (!bet.judgment || !bet.publishedAt) return [];
    return [
      {
        publicId: bet.publicId,
        title: bet.title,
        question: bet.question,
        participantNames: bet.slots.map((slot) => slot.name ?? slot.label),
        stakeUsd: bet.stakeUsd,
        participantCount: bet.participantCount,
        verdictKey: bet.judgment.verdictKey,
        publishedAt: bet.publishedAt,
      },
    ];
  });
};

export const getPublic: BetStore["getPublic"] = async (publicId) => {
  const bet = await getPrismaClient().bet.findUnique({
    where: { publicId },
    include: { slots: { orderBy: { ordinal: "asc" } }, judgment: true },
  });
  if (!bet) return null;
  return {
    publicId: bet.publicId,
    status: bet.status,
    visibility: bet.visibility,
    title: bet.title,
    question: bet.question,
    decisionContext: bet.decisionContext,
    participantCount: bet.participantCount,
    stakeUsd: bet.stakeUsd,
    publishedAt: bet.publishedAt,
    hiddenAt: bet.hiddenAt,
    slots: bet.slots.flatMap((slot) =>
      slot.name && slot.position && slot.submission
        ? [
            {
              label: slot.label,
              name: slot.name,
              position: slot.position,
              submission: slot.submission,
              sourceUrls: Array.isArray(slot.sourceUrls) ? (slot.sourceUrls as string[]) : [],
            },
          ]
        : [],
    ),
    judgment: bet.judgment
      ? {
          verdictKey: bet.judgment.verdictKey,
          prevailingGroup: bet.judgment.prevailingGroup,
          synthesis: bet.judgment.synthesis,
          publicData: bet.judgment.publicData,
          transparencyData: bet.judgment.transparencyData,
        }
      : null,
  };
};

export const hidePublication: BetStore["hidePublication"] = async (publicId, now) => {
  const result = await getPrismaClient().bet.updateMany({
    where: { publicId, status: "PUBLISHED" },
    data: { visibility: "HIDDEN", hiddenAt: now },
  });
  return result.count === 1;
};
