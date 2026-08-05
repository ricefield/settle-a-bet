-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('OPEN', 'QUEUED', 'EVALUATING', 'PUBLISHED', 'EVALUATION_FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PublicationVisibility" AS ENUM ('PUBLIC', 'HIDDEN');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('QUEUED', 'EVALUATING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "ModelPhase" AS ENUM ('RESEARCH', 'JUDGMENT', 'SYNTHESIS');

-- CreateEnum
CREATE TYPE "PanelMember" AS ENUM ('CLAUDE_OPUS', 'OPENAI_SOL', 'XAI_GROK', 'SYNTHESIZER');

-- CreateEnum
CREATE TYPE "ModelCallStatus" AS ENUM ('STARTED', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "Bet" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "status" "BetStatus" NOT NULL DEFAULT 'OPEN',
    "visibility" "PublicationVisibility" NOT NULL DEFAULT 'PUBLIC',
    "title" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "decisionContext" TEXT NOT NULL,
    "participantCount" INTEGER NOT NULL,
    "stakeUsd" INTEGER NOT NULL,
    "organizerTokenHash" TEXT NOT NULL,
    "creatorIpHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "evaluationStartedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "hiddenAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantSlot" (
    "id" TEXT NOT NULL,
    "betId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "invitationTokenHash" TEXT,
    "invitationTokenCiphertext" TEXT,
    "name" TEXT,
    "position" TEXT,
    "submission" TEXT,
    "sourceUrls" JSONB NOT NULL DEFAULT '[]',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationRun" (
    "id" TEXT NOT NULL,
    "betId" TEXT NOT NULL,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'QUEUED',
    "workflowRunId" TEXT,
    "promptVersion" TEXT NOT NULL,
    "aggregationPolicyVersion" TEXT NOT NULL,
    "researchRecord" JSONB,
    "researchRecordHash" TEXT,
    "positionMap" JSONB,
    "verdictKey" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "EvaluationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelCall" (
    "id" TEXT NOT NULL,
    "evaluationRunId" TEXT NOT NULL,
    "phase" "ModelPhase" NOT NULL,
    "panelMember" "PanelMember" NOT NULL,
    "attempt" INTEGER NOT NULL,
    "status" "ModelCallStatus" NOT NULL DEFAULT 'STARTED',
    "requestedModel" TEXT NOT NULL,
    "returnedModel" TEXT,
    "requestBody" JSONB NOT NULL,
    "responseBody" JSONB,
    "providerResponseId" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "estimatedCostMicros" INTEGER,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ModelCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchContribution" (
    "id" TEXT NOT NULL,
    "evaluationRunId" TEXT NOT NULL,
    "modelCallId" TEXT NOT NULL,
    "panelMember" "PanelMember" NOT NULL,
    "content" JSONB NOT NULL,
    "searchQueries" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JudgeVote" (
    "id" TEXT NOT NULL,
    "evaluationRunId" TEXT NOT NULL,
    "modelCallId" TEXT NOT NULL,
    "panelMember" "PanelMember" NOT NULL,
    "voteKey" TEXT NOT NULL,
    "prevailingPositionGroup" TEXT,
    "opinion" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JudgeVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Judgment" (
    "id" TEXT NOT NULL,
    "betId" TEXT NOT NULL,
    "evaluationRunId" TEXT NOT NULL,
    "verdictKey" TEXT NOT NULL,
    "prevailingGroup" TEXT,
    "synthesis" TEXT NOT NULL,
    "publicData" JSONB NOT NULL,
    "transparencyData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Judgment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "EvaluationBudget" (
    "utcDate" TEXT NOT NULL,
    "startedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationBudget_pkey" PRIMARY KEY ("utcDate")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bet_publicId_key" ON "Bet"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Bet_organizerTokenHash_key" ON "Bet"("organizerTokenHash");

-- CreateIndex
CREATE INDEX "Bet_status_createdAt_idx" ON "Bet"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Bet_visibility_publishedAt_idx" ON "Bet"("visibility", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantSlot_invitationTokenHash_key" ON "ParticipantSlot"("invitationTokenHash");

-- CreateIndex
CREATE INDEX "ParticipantSlot_betId_submittedAt_idx" ON "ParticipantSlot"("betId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantSlot_betId_ordinal_key" ON "ParticipantSlot"("betId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantSlot_betId_label_key" ON "ParticipantSlot"("betId", "label");

-- CreateIndex
CREATE INDEX "EvaluationRun_betId_createdAt_idx" ON "EvaluationRun"("betId", "createdAt");

-- CreateIndex
CREATE INDEX "EvaluationRun_status_createdAt_idx" ON "EvaluationRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ModelCall_evaluationRunId_startedAt_idx" ON "ModelCall"("evaluationRunId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ModelCall_evaluationRunId_phase_panelMember_attempt_key" ON "ModelCall"("evaluationRunId", "phase", "panelMember", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchContribution_modelCallId_key" ON "ResearchContribution"("modelCallId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchContribution_evaluationRunId_panelMember_key" ON "ResearchContribution"("evaluationRunId", "panelMember");

-- CreateIndex
CREATE UNIQUE INDEX "JudgeVote_modelCallId_key" ON "JudgeVote"("modelCallId");

-- CreateIndex
CREATE UNIQUE INDEX "JudgeVote_evaluationRunId_panelMember_key" ON "JudgeVote"("evaluationRunId", "panelMember");

-- CreateIndex
CREATE UNIQUE INDEX "Judgment_betId_key" ON "Judgment"("betId");

-- CreateIndex
CREATE UNIQUE INDEX "Judgment_evaluationRunId_key" ON "Judgment"("evaluationRunId");

-- AddForeignKey
ALTER TABLE "ParticipantSlot" ADD CONSTRAINT "ParticipantSlot_betId_fkey" FOREIGN KEY ("betId") REFERENCES "Bet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationRun" ADD CONSTRAINT "EvaluationRun_betId_fkey" FOREIGN KEY ("betId") REFERENCES "Bet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelCall" ADD CONSTRAINT "ModelCall_evaluationRunId_fkey" FOREIGN KEY ("evaluationRunId") REFERENCES "EvaluationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchContribution" ADD CONSTRAINT "ResearchContribution_evaluationRunId_fkey" FOREIGN KEY ("evaluationRunId") REFERENCES "EvaluationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchContribution" ADD CONSTRAINT "ResearchContribution_modelCallId_fkey" FOREIGN KEY ("modelCallId") REFERENCES "ModelCall"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgeVote" ADD CONSTRAINT "JudgeVote_evaluationRunId_fkey" FOREIGN KEY ("evaluationRunId") REFERENCES "EvaluationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgeVote" ADD CONSTRAINT "JudgeVote_modelCallId_fkey" FOREIGN KEY ("modelCallId") REFERENCES "ModelCall"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Judgment" ADD CONSTRAINT "Judgment_betId_fkey" FOREIGN KEY ("betId") REFERENCES "Bet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Judgment" ADD CONSTRAINT "Judgment_evaluationRunId_fkey" FOREIGN KEY ("evaluationRunId") REFERENCES "EvaluationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
