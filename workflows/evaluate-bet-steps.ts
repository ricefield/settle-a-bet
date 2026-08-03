import * as db from "@/lib/db";
import { getEvaluationEnv, getOpenRouterEnv } from "@/lib/env";
import {
  aggregateVotes,
  consensusPositionMap,
  hashResearchRecord,
  validateSynthesis,
  voteKey,
} from "@/lib/bet/domain";
import { getPanelModels, type PanelModel } from "@/lib/evaluation/models";
import { createOpenRouterAdapter, type StructuredModelRequest } from "@/lib/evaluation/openrouter";
import { judgmentPrompt, researchPrompt, synthesisPrompt } from "@/lib/evaluation/prompts";
import {
  judicialOpinionSchema,
  researchContributionSchema,
  synthesisSchema,
  type EvaluationInput,
  type JudicialOpinion,
  type ResearchContribution,
} from "@/lib/evaluation/types";
import type { JudgeVoteValue } from "@/lib/bet/domain";
import type { PositionGroup } from "@/lib/types";

type StoredResearch = {
  panelMember: PanelModel["member"];
  model: string;
  modelCallId: string;
  contribution: ResearchContribution;
};

type StoredVote = {
  panelMember: PanelModel["member"];
  model: string;
  modelCallId: string;
  voteKey: string;
  opinion: JudicialOpinion;
};

async function callWithRetries<T>({
  evaluationRunId,
  phase,
  panelMember,
  request,
}: {
  evaluationRunId: string;
  phase: "RESEARCH" | "JUDGMENT" | "SYNTHESIS";
  panelMember: PanelModel["member"] | "SYNTHESIZER";
  request: StructuredModelRequest<T>;
}) {
  const adapter = createOpenRouterAdapter();
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const modelCallId = await db.evaluations.startModelCall({
      evaluationRunId,
      phase,
      panelMember,
      attempt,
      requestedModel: request.model,
      requestBody: {
        model: request.model,
        system: request.system,
        user: request.user,
        reasoningEffort: request.reasoningEffort,
        maxTokens: request.maxTokens,
        webSearch: request.webSearch,
      },
    });
    try {
      const result = await adapter.runStructured(request);
      await db.evaluations.succeedModelCall(modelCallId, result.returnedModel, result.audit);
      return { ...result, modelCallId };
    } catch (error) {
      lastError = error;
      await db.evaluations.failModelCall(modelCallId, error);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Model call failed after three attempts");
}

export async function claimEvaluationStep(
  betId: string,
  workflowRunId: string,
): Promise<"CLAIMED" | "WAIT" | "ALREADY_HANDLED"> {
  "use step";
  return db.evaluations.claimDailySlot({
    betId,
    workflowRunId,
    maxDaily: getEvaluationEnv().MAX_DAILY_EVALUATIONS,
    now: new Date(),
  });
}

export async function loadEvaluationInputStep(betId: string): Promise<EvaluationInput> {
  "use step";
  return db.evaluations.loadInput(betId);
}

export async function researchStep(
  input: EvaluationInput,
  panel: PanelModel,
): Promise<StoredResearch> {
  "use step";
  const prompt = researchPrompt(input);
  const result = await callWithRetries({
    evaluationRunId: input.evaluationRunId,
    phase: "RESEARCH",
    panelMember: panel.member,
    request: {
      model: panel.model,
      schemaName: "research_contribution",
      schema: researchContributionSchema,
      system: prompt.system,
      user: prompt.user,
      reasoningEffort: "low",
      maxTokens: 1_800,
      webSearch: true,
    },
  });
  const labels = input.participants.map((participant) => participant.label).sort();
  const researchedLabels = result.value.positions
    .map((position) => position.participantLabel)
    .sort();
  if (JSON.stringify(labels) !== JSON.stringify(researchedLabels)) {
    throw new Error(`${panel.displayName} did not research every Position exactly once`);
  }
  await db.evaluations.saveContribution({
    evaluationRunId: input.evaluationRunId,
    modelCallId: result.modelCallId,
    panelMember: panel.member,
    contribution: result.value,
  });
  return {
    panelMember: panel.member,
    model: panel.model,
    modelCallId: result.modelCallId,
    contribution: result.value,
  };
}

export async function assembleResearchRecordStep(
  input: EvaluationInput,
  results: StoredResearch[],
) {
  "use step";
  const positionMap = consensusPositionMap(
    results.map((result) => result.contribution.positionMap),
    input.participants.map((participant) => participant.label),
  );
  const sourceIndex = [
    ...new Map(
      results.flatMap((result) =>
        result.contribution.sources.map(
          (source) =>
            [
              new URL(source.url).toString(),
              { ...source, contributedBy: result.panelMember },
            ] as const,
        ),
      ),
    ).values(),
  ];
  const record = {
    version: "mvp-1",
    positionMap,
    contributions: results.map((result) => ({
      panelMember: result.panelMember,
      model: result.model,
      contribution: result.contribution,
    })),
    sourceIndex,
  };
  const recordHash = hashResearchRecord(record);
  await db.evaluations.saveResearchRecord({
    evaluationRunId: input.evaluationRunId,
    record,
    recordHash,
    positionMap,
  });
  return { record, recordHash, positionMap };
}

export async function judgmentStep(
  input: EvaluationInput,
  researchRecord: unknown,
  researchRecordHash: string,
  positionMap: PositionGroup[],
  panel: PanelModel,
): Promise<StoredVote> {
  "use step";
  const prompt = judgmentPrompt(input, researchRecord, positionMap, researchRecordHash);
  const result = await callWithRetries({
    evaluationRunId: input.evaluationRunId,
    phase: "JUDGMENT",
    panelMember: panel.member,
    request: {
      model: panel.model,
      schemaName: "judicial_opinion",
      schema: judicialOpinionSchema,
      system: prompt.system,
      user: prompt.user,
      reasoningEffort: "medium",
      maxTokens: 1_200,
      webSearch: false,
    },
  });
  const positionGroupId = result.value.positionGroupId ?? undefined;
  if (result.value.voteType === "POSITION") {
    if (!positionGroupId || !positionMap.some((group) => group.id === positionGroupId)) {
      throw new Error(`${panel.displayName} returned an invalid Position group`);
    }
  } else if (positionGroupId) {
    throw new Error(`${panel.displayName} attached a Position group to a non-Position Vote`);
  }
  const key = voteKey({ voteType: result.value.voteType, positionGroupId });
  await db.evaluations.saveVote({
    evaluationRunId: input.evaluationRunId,
    modelCallId: result.modelCallId,
    panelMember: panel.member,
    voteKey: key,
    prevailingPositionGroup: positionGroupId,
    opinion: result.value,
  });
  return {
    panelMember: panel.member,
    model: panel.model,
    modelCallId: result.modelCallId,
    voteKey: key,
    opinion: result.value,
  };
}

export async function synthesisStep(
  input: EvaluationInput,
  verdictKey: string,
  research: StoredResearch[],
  votes: StoredVote[],
) {
  "use step";
  const env = getOpenRouterEnv();
  const prompt = synthesisPrompt({
    verdictKey,
    contributions: research.map((item) => ({
      panelMember: item.panelMember,
      contribution: item.contribution,
    })),
    opinions: votes.map((item) => ({
      panelMember: item.panelMember,
      voteKey: item.voteKey,
      opinion: item.opinion,
    })),
  });
  try {
    const result = await callWithRetries({
      evaluationRunId: input.evaluationRunId,
      phase: "SYNTHESIS",
      panelMember: "SYNTHESIZER",
      request: {
        model: env.SYNTHESIS_MODEL,
        schemaName: "judgment_synthesis",
        schema: synthesisSchema,
        system: prompt.system,
        user: prompt.user,
        reasoningEffort: "low",
        maxTokens: 800,
        webSearch: false,
      },
    });
    return validateSynthesis(verdictKey, result.value);
  } catch {
    return `The panel's mechanically aggregated Verdict is ${verdictKey}. The individual Judicial Opinions below contain the majority reasoning, dissent, and uncertainty.`;
  }
}

export async function publishStep(input: EvaluationInput, votes: StoredVote[], synthesis: string) {
  "use step";
  const voteValues: JudgeVoteValue[] = votes.map((vote) => ({
    panelMember: vote.panelMember,
    voteType: vote.opinion.voteType,
    positionGroupId: vote.opinion.positionGroupId ?? undefined,
  }));
  const verdict = aggregateVotes(voteValues);
  await db.evaluations.publish({
    betId: input.betId,
    evaluationRunId: input.evaluationRunId,
    verdictKey: verdict.verdictKey,
    prevailingGroup: verdict.prevailingGroup,
    synthesis,
    now: new Date(),
  });
  return verdict;
}

export async function failEvaluationStep(betId: string, error: unknown) {
  "use step";
  const safeReason = error instanceof Error ? error.message : "Evaluation failed";
  await db.evaluations.fail(betId, safeReason, new Date());
}

export async function panelModelsStep(): Promise<PanelModel[]> {
  "use step";
  return getPanelModels();
}
