import { Prisma } from "@/lib/generated/prisma/client";
import type { PanelMember } from "@/lib/types";
import type {
  EvaluationInput,
  JudicialOpinion,
  ModelCallAudit,
  ResearchContribution,
} from "@/lib/evaluation/types";
import { getPrismaClient } from "./common";

const json = (value: unknown) => value as Prisma.InputJsonValue;

export async function claimDailySlot({
  betId,
  workflowRunId,
  maxDaily,
  now,
}: {
  betId: string;
  workflowRunId: string;
  maxDaily: number;
  now: Date;
}): Promise<"CLAIMED" | "WAIT" | "ALREADY_HANDLED"> {
  return getPrismaClient().$transaction(
    async (tx) => {
      const run = await tx.evaluationRun.findFirst({
        where: { betId, status: "QUEUED" },
        orderBy: { createdAt: "desc" },
      });
      if (!run) {
        const active = await tx.evaluationRun.findFirst({
          where: { betId, status: { in: ["EVALUATING", "PUBLISHED"] } },
        });
        return active?.workflowRunId === workflowRunId ? "CLAIMED" : "ALREADY_HANDLED";
      }
      const oldestQueued = await tx.evaluationRun.findFirst({
        where: { status: "QUEUED" },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true },
      });
      if (oldestQueued?.id !== run.id) return "WAIT";
      const utcDate = now.toISOString().slice(0, 10);
      await tx.evaluationBudget.upsert({
        where: { utcDate },
        create: { utcDate, startedCount: 0 },
        update: {},
      });
      const claimedBudget = await tx.evaluationBudget.updateMany({
        where: { utcDate, startedCount: { lt: maxDaily } },
        data: { startedCount: { increment: 1 } },
      });
      if (claimedBudget.count !== 1) return "WAIT";

      const claimedRun = await tx.evaluationRun.updateMany({
        where: { id: run.id, status: "QUEUED" },
        data: { status: "EVALUATING", workflowRunId, startedAt: now },
      });
      if (claimedRun.count !== 1) return "ALREADY_HANDLED";
      await tx.bet.update({
        where: { id: betId },
        data: { status: "EVALUATING", evaluationStartedAt: now },
      });
      return "CLAIMED";
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function loadInput(betId: string): Promise<EvaluationInput> {
  const bet = await getPrismaClient().bet.findUniqueOrThrow({
    where: { id: betId },
    include: {
      slots: { orderBy: { ordinal: "asc" } },
      evaluationRuns: { where: { status: "EVALUATING" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const run = bet.evaluationRuns[0];
  if (!run) throw new Error("No active evaluation run");
  const participants = bet.slots.map((slot) => {
    if (!slot.position || !slot.submission)
      throw new Error(`Participant ${slot.label} is incomplete`);
    return {
      label: slot.label,
      position: slot.position,
      submission: slot.submission,
      sourceUrls: Array.isArray(slot.sourceUrls) ? (slot.sourceUrls as string[]) : [],
    };
  });
  return {
    betId: bet.id,
    evaluationRunId: run.id,
    publicId: bet.publicId,
    title: bet.title,
    question: bet.question,
    decisionContext: bet.decisionContext,
    stakeUsd: bet.stakeUsd,
    participants,
  };
}

export async function startModelCall(input: {
  evaluationRunId: string;
  phase: "RESEARCH" | "JUDGMENT" | "SYNTHESIS";
  panelMember: PanelMember | "SYNTHESIZER";
  attempt: number;
  requestedModel: string;
  requestBody: unknown;
}): Promise<string> {
  const call = await getPrismaClient().modelCall.upsert({
    where: {
      evaluationRunId_phase_panelMember_attempt: {
        evaluationRunId: input.evaluationRunId,
        phase: input.phase,
        panelMember: input.panelMember,
        attempt: input.attempt,
      },
    },
    create: { ...input, requestBody: json(input.requestBody) },
    update: {
      status: "STARTED",
      error: null,
      requestBody: json(input.requestBody),
      startedAt: new Date(),
    },
  });
  return call.id;
}

export async function succeedModelCall(
  callId: string,
  returnedModel: string,
  audit: ModelCallAudit,
) {
  await getPrismaClient().modelCall.update({
    where: { id: callId },
    data: {
      status: "SUCCEEDED",
      returnedModel,
      requestBody: json(audit.requestBody),
      responseBody: json(audit.responseBody),
      providerResponseId: audit.providerResponseId,
      inputTokens: audit.inputTokens,
      outputTokens: audit.outputTokens,
      totalTokens: audit.totalTokens,
      estimatedCostMicros: audit.estimatedCostMicros,
      completedAt: new Date(),
    },
  });
}

export async function failModelCall(
  callId: string,
  error: unknown,
  response?: { returnedModel: string; audit: ModelCallAudit },
) {
  await getPrismaClient().modelCall.update({
    where: { id: callId },
    data: {
      status: "FAILED",
      error: error instanceof Error ? error.message.slice(0, 2_000) : "Unknown provider failure",
      ...(response
        ? {
            returnedModel: response.returnedModel,
            requestBody: json(response.audit.requestBody),
            responseBody: json(response.audit.responseBody),
            providerResponseId: response.audit.providerResponseId,
            inputTokens: response.audit.inputTokens,
            outputTokens: response.audit.outputTokens,
            totalTokens: response.audit.totalTokens,
            estimatedCostMicros: response.audit.estimatedCostMicros,
          }
        : {}),
      completedAt: new Date(),
    },
  });
}

export async function saveContribution(input: {
  evaluationRunId: string;
  modelCallId: string;
  panelMember: PanelMember;
  contribution: ResearchContribution;
}) {
  await getPrismaClient().researchContribution.upsert({
    where: {
      evaluationRunId_panelMember: {
        evaluationRunId: input.evaluationRunId,
        panelMember: input.panelMember,
      },
    },
    create: {
      evaluationRunId: input.evaluationRunId,
      modelCallId: input.modelCallId,
      panelMember: input.panelMember,
      content: json(input.contribution),
      searchQueries: json(input.contribution.searchQueries),
      sources: json(input.contribution.sources),
    },
    update: {
      modelCallId: input.modelCallId,
      content: json(input.contribution),
      searchQueries: json(input.contribution.searchQueries),
      sources: json(input.contribution.sources),
    },
  });
}

export async function saveResearchRecord(input: {
  evaluationRunId: string;
  record: unknown;
  recordHash: string;
  positionMap: unknown;
}) {
  await getPrismaClient().evaluationRun.update({
    where: { id: input.evaluationRunId },
    data: {
      researchRecord: json(input.record),
      researchRecordHash: input.recordHash,
      positionMap: json(input.positionMap),
    },
  });
}

export async function saveVote(input: {
  evaluationRunId: string;
  modelCallId: string;
  panelMember: PanelMember;
  voteKey: string;
  prevailingPositionGroup?: string;
  opinion: JudicialOpinion;
}) {
  await getPrismaClient().judgeVote.upsert({
    where: {
      evaluationRunId_panelMember: {
        evaluationRunId: input.evaluationRunId,
        panelMember: input.panelMember,
      },
    },
    create: { ...input, opinion: json(input.opinion) },
    update: {
      modelCallId: input.modelCallId,
      voteKey: input.voteKey,
      prevailingPositionGroup: input.prevailingPositionGroup,
      opinion: json(input.opinion),
    },
  });
}

export async function publish(input: {
  betId: string;
  evaluationRunId: string;
  verdictKey: string;
  prevailingGroup?: string;
  synthesis: string;
  now: Date;
}) {
  const prisma = getPrismaClient();
  await prisma.$transaction(async (tx) => {
    const run = await tx.evaluationRun.findUniqueOrThrow({
      where: { id: input.evaluationRunId },
      include: {
        researchContributions: { orderBy: { panelMember: "asc" } },
        judgeVotes: { orderBy: { panelMember: "asc" } },
        modelCalls: { orderBy: [{ phase: "asc" }, { panelMember: "asc" }, { attempt: "asc" }] },
      },
    });
    const publicData = {
      positionMap: run.positionMap,
      researchRecord: run.researchRecord,
      votes: run.judgeVotes.map((vote) => ({
        panelMember: vote.panelMember,
        voteKey: vote.voteKey,
        opinion: vote.opinion,
      })),
    };
    const transparencyData = {
      promptVersion: run.promptVersion,
      aggregationPolicyVersion: run.aggregationPolicyVersion,
      researchRecordHash: run.researchRecordHash,
      totalEstimatedCostMicros: run.modelCalls.reduce(
        (total, call) => total + (call.estimatedCostMicros ?? 0),
        0,
      ),
      modelCalls: run.modelCalls.map((call) => ({
        phase: call.phase,
        panelMember: call.panelMember,
        attempt: call.attempt,
        status: call.status,
        requestedModel: call.requestedModel,
        returnedModel: call.returnedModel,
        requestBody: call.requestBody,
        responseBody: call.responseBody,
        providerResponseId: call.providerResponseId,
        inputTokens: call.inputTokens,
        outputTokens: call.outputTokens,
        totalTokens: call.totalTokens,
        estimatedCostMicros: call.estimatedCostMicros,
        error: call.error,
        startedAt: call.startedAt.toISOString(),
        completedAt: call.completedAt?.toISOString() ?? null,
      })),
    };
    await tx.judgment.create({
      data: {
        betId: input.betId,
        evaluationRunId: input.evaluationRunId,
        verdictKey: input.verdictKey,
        prevailingGroup: input.prevailingGroup,
        synthesis: input.synthesis,
        publicData: json(publicData),
        transparencyData: json(transparencyData),
      },
    });
    await tx.evaluationRun.update({
      where: { id: input.evaluationRunId },
      data: { status: "PUBLISHED", verdictKey: input.verdictKey, completedAt: input.now },
    });
    await tx.bet.update({
      where: { id: input.betId },
      data: { status: "PUBLISHED", publishedAt: input.now },
    });
  });
}

export async function fail(betId: string, reason: string, now: Date) {
  const prisma = getPrismaClient();
  await prisma.$transaction([
    prisma.bet.update({
      where: { id: betId },
      data: { status: "EVALUATION_FAILED", failureReason: reason.slice(0, 2_000) },
    }),
    prisma.evaluationRun.updateMany({
      where: { betId, status: { in: ["QUEUED", "EVALUATING"] } },
      data: { status: "FAILED", failureReason: reason.slice(0, 2_000), completedAt: now },
    }),
  ]);
}
