import { z } from "zod";

export const BET_LIMITS = {
  titleCharacters: 120,
  questionCharacters: 500,
  contextWords: 2_000,
  positionCharacters: 280,
  submissionWords: 1_500,
  sourceUrls: 5,
  minParticipants: 2,
  maxParticipants: 4,
  minStakeUsd: 1,
  maxStakeUsd: 10_000,
} as const;

export const betStatusSchema = z.enum([
  "OPEN",
  "QUEUED",
  "EVALUATING",
  "PUBLISHED",
  "EVALUATION_FAILED",
  "CANCELLED",
]);
export type BetStatus = z.infer<typeof betStatusSchema>;

export const panelMemberSchema = z.enum(["CLAUDE_OPUS", "OPENAI_SOL", "XAI_GROK"]);
export type PanelMember = z.infer<typeof panelMemberSchema>;

export const sourceUrlsSchema = z
  .array(
    z
      .string()
      .url()
      .refine((value) => value.startsWith("https://"), "Sources must use HTTPS"),
  )
  .max(BET_LIMITS.sourceUrls)
  .default([]);

function wordLimited(maxWords: number, label: string) {
  return z
    .string()
    .trim()
    .min(1)
    .refine((value) => value.split(/\s+/u).filter(Boolean).length <= maxWords, {
      message: `${label} must be ${maxWords.toLocaleString()} words or fewer`,
    });
}

export const participantSubmissionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  position: z.string().trim().min(1).max(BET_LIMITS.positionCharacters),
  submission: wordLimited(BET_LIMITS.submissionWords, "Submission"),
  sourceUrls: sourceUrlsSchema,
  publicationConsent: z.literal(true),
  nominalStakeAcknowledgement: z.literal(true),
});
export type ParticipantSubmissionInput = z.infer<typeof participantSubmissionSchema>;

export const createBetSchema = z.object({
  title: z.string().trim().min(1).max(BET_LIMITS.titleCharacters),
  question: z.string().trim().min(1).max(BET_LIMITS.questionCharacters),
  decisionContext: wordLimited(BET_LIMITS.contextWords, "Context"),
  participantCount: z
    .number()
    .int()
    .min(BET_LIMITS.minParticipants)
    .max(BET_LIMITS.maxParticipants),
  stakeUsd: z.number().int().min(BET_LIMITS.minStakeUsd).max(BET_LIMITS.maxStakeUsd),
  creator: participantSubmissionSchema,
});
export type CreateBetInput = z.infer<typeof createBetSchema>;

export const createBetResponseSchema = z.object({
  publicId: z.string(),
  organizerUrl: z.string(),
  invitationUrls: z.array(z.string()),
});
export type CreateBetResponse = z.infer<typeof createBetResponseSchema>;

export const submissionResponseSchema = z.object({
  publicId: z.string(),
  status: betStatusSchema,
  submittedCount: z.number().int(),
  participantCount: z.number().int(),
});

export const voteTypeSchema = z.enum([
  "POSITION",
  "NO_MATERIAL_DISAGREEMENT",
  "NO_SUBMITTED_POSITION_PREVAILS",
  "INDETERMINATE",
]);
export type VoteType = z.infer<typeof voteTypeSchema>;

export type PositionGroup = { id: string; members: string[] };

export type PublicFeedItem = {
  publicId: string;
  title: string;
  question: string;
  participantNames: string[];
  stakeUsd: number;
  participantCount: number;
  verdictKey: string;
  publishedAt: Date;
};
