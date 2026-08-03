import { z } from "zod";

import { panelMemberSchema, voteTypeSchema } from "@/lib/types";

export const researchSourceSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(300),
  retrievedAt: z.string().datetime(),
  supports: z.array(z.string()).default([]),
  challenges: z.array(z.string()).default([]),
  relevantExcerpt: z.string().max(1_500),
});

export const researchContributionSchema = z.object({
  searchQueries: z.array(z.string().min(1).max(300)).max(3),
  positionMap: z.object({
    groups: z
      .array(
        z.array(
          z
            .string()
            .regex(/^[A-D]$/u)
            .min(1),
        ),
      )
      .min(1),
  }),
  positions: z
    .array(
      z.object({
        participantLabel: z.string().regex(/^[A-D]$/u),
        strongestCase: z.string().min(1).max(3_000),
        contraryEvidence: z.string().min(1).max(3_000),
        weaknesses: z.array(z.string().max(500)).max(6),
        sourceUrls: z.array(z.string().url()).max(5),
      }),
    )
    .min(2)
    .max(4),
  unresolvedQuestions: z.array(z.string().max(500)).max(8),
  sources: z.array(researchSourceSchema).max(5),
});
export type ResearchContribution = z.infer<typeof researchContributionSchema>;

export const judicialOpinionSchema = z.object({
  voteType: voteTypeSchema,
  positionGroupId: z.string().nullable().default(null),
  interpretation: z.string().min(1).max(2_500),
  decisiveConsiderations: z.array(z.string().max(750)).min(1).max(6),
  strongestEvidence: z.array(z.string().max(750)).min(1).max(6),
  strongestCounterargument: z.string().min(1).max(2_000),
  uncertainty: z.string().min(1).max(1_500),
  citedUrls: z.array(z.string().url()).max(10),
});
export type JudicialOpinion = z.infer<typeof judicialOpinionSchema>;

export const synthesisSchema = z.object({
  verdictKey: z.string().min(1),
  summary: z.string().min(1).max(3_000),
});
export type Synthesis = z.infer<typeof synthesisSchema>;

export type EvaluationParticipant = {
  label: string;
  position: string;
  submission: string;
  sourceUrls: string[];
};

export type EvaluationInput = {
  betId: string;
  evaluationRunId: string;
  publicId: string;
  title: string;
  question: string;
  decisionContext: string;
  stakeUsd: number;
  participants: EvaluationParticipant[];
};

export type ResearchResult = {
  panelMember: z.infer<typeof panelMemberSchema>;
  requestedModel: string;
  returnedModel: string;
  contribution: ResearchContribution;
  audit: ModelCallAudit;
};

export type ModelCallAudit = {
  providerResponseId: string;
  requestBody: unknown;
  responseBody: unknown;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostMicros: number;
};
