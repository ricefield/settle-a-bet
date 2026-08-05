import type { CreateBetInput, ParticipantSubmissionInput, PublicFeedItem } from "@/lib/types";

export type NewSlot = {
  ordinal: number;
  label: string;
  invitationTokenHash?: string;
  invitationTokenCiphertext?: string;
  submission?: ParticipantSubmissionInput;
};

export type InvitationView = {
  publicId: string;
  status: string;
  title: string;
  question: string;
  decisionContext: string;
  participantCount: number;
  stakeUsd: number;
  label: string;
  alreadySubmitted: boolean;
};

export type OrganizerView = {
  publicId: string;
  status: string;
  title: string;
  question: string;
  participantCount: number;
  stakeUsd: number;
  slots: Array<{
    label: string;
    name: string | null;
    submitted: boolean;
    invitationTokenCiphertext: string | null;
  }>;
  failureReason: string | null;
};

export type PublicBetView = {
  publicId: string;
  status: string;
  visibility: string;
  title: string;
  question: string;
  decisionContext: string;
  participantCount: number;
  stakeUsd: number;
  publishedAt: Date | null;
  hiddenAt: Date | null;
  slots: Array<{
    label: string;
    name: string;
    position: string;
    submission: string;
    sourceUrls: string[];
  }>;
  judgment: {
    verdictKey: string;
    prevailingGroup: string | null;
    synthesis: string;
    publicData: unknown;
    transparencyData: unknown;
  } | null;
};

export type SubmissionResult = {
  betId: string;
  publicId: string;
  status: string;
  submittedCount: number;
  participantCount: number;
  shouldQueue: boolean;
};

export type BetStore = {
  consumeCreationRateLimit(input: { key: string; windowStart: Date; limit: number }): Promise<void>;
  createBet(input: {
    publicId: string;
    organizerTokenHash: string;
    creatorIpHash: string;
    bet: CreateBetInput;
    slots: NewSlot[];
  }): Promise<void>;
  getInvitation(tokenHash: string): Promise<InvitationView | null>;
  submitInvitation(input: {
    tokenHash: string;
    submission: ParticipantSubmissionInput;
    now: Date;
    promptVersion: string;
    aggregationPolicyVersion: string;
  }): Promise<SubmissionResult | null>;
  getOrganizer(tokenHash: string): Promise<OrganizerView | null>;
  cancel(tokenHash: string, now: Date): Promise<boolean>;
  listPublic(): Promise<PublicFeedItem[]>;
  getPublic(publicId: string): Promise<PublicBetView | null>;
  hidePublication(publicId: string, now: Date): Promise<boolean>;
};
