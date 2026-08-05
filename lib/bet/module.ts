import { randomBytes, timingSafeEqual } from "node:crypto";

import { ConflictError, ForbiddenError, NotFoundError, RateLimitError } from "@/lib/errors";
import type { TokenVault } from "@/lib/security/tokens";
import {
  createBetSchema,
  participantSubmissionSchema,
  type CreateBetInput,
  type CreateBetResponse,
  type ParticipantSubmissionInput,
} from "@/lib/types";
import { AGGREGATION_POLICY_VERSION, participantLabels, PROMPT_VERSION } from "./domain";
import type { BetStore, InvitationView, OrganizerView, PublicBetView } from "./store";

export type EvaluationQueue = { enqueue(betId: string): Promise<void> };

export type BetModule = {
  create(
    input: CreateBetInput,
    context: { ip: string; baseUrl: string },
  ): Promise<CreateBetResponse>;
  getInvitation(token: string): Promise<InvitationView>;
  submit(
    token: string,
    input: ParticipantSubmissionInput,
  ): Promise<{
    publicId: string;
    status: string;
    submittedCount: number;
    participantCount: number;
  }>;
  getOrganizer(
    token: string,
    baseUrl: string,
  ): Promise<OrganizerView & { invitationUrls: string[] }>;
  cancel(token: string): Promise<void>;
  listPublic(): ReturnType<BetStore["listPublic"]>;
  getPublic(publicId: string): Promise<PublicBetView>;
  hide(publicId: string, suppliedSecret: string, expectedSecret: string): Promise<void>;
};

export function createBetModule({
  store,
  tokens,
  queue,
  now = () => new Date(),
}: {
  store: BetStore;
  tokens: TokenVault;
  queue: EvaluationQueue;
  now?: () => Date;
}): BetModule {
  return {
    async create(rawInput, context) {
      const input = createBetSchema.parse(rawInput);
      const timestamp = now();
      const ipHash = tokens.hashIp(context.ip);
      const hour = timestamp.toISOString().slice(0, 13);
      try {
        await store.consumeCreationRateLimit({
          key: `create:${ipHash}:${hour}`,
          windowStart: new Date(`${hour}:00:00.000Z`),
          limit: 5,
        });
      } catch (error) {
        if (error instanceof RateLimitError) throw error;
        throw error;
      }

      const organizerToken = tokens.generate();
      const publicId = randomBytes(9).toString("base64url");
      const labels = participantLabels(input.participantCount);
      const invitationTokens = labels.slice(1).map(() => tokens.generate());
      await store.createBet({
        publicId,
        organizerTokenHash: tokens.hash(organizerToken),
        creatorIpHash: ipHash,
        bet: input,
        slots: labels.map((label, ordinal) => {
          if (ordinal === 0) return { ordinal, label, submission: input.creator };
          const invitationToken = invitationTokens[ordinal - 1];
          return {
            ordinal,
            label,
            invitationTokenHash: tokens.hash(invitationToken),
            invitationTokenCiphertext: tokens.encrypt(invitationToken),
          };
        }),
      });

      const baseUrl = context.baseUrl.replace(/\/$/u, "");
      return {
        publicId,
        organizerUrl: `${baseUrl}/organize/${organizerToken}`,
        invitationUrls: invitationTokens.map((token) => `${baseUrl}/invite/${token}`),
      };
    },

    async getInvitation(token) {
      const invitation = await store.getInvitation(tokens.hash(token));
      if (!invitation) throw new NotFoundError("Invitation not found");
      return invitation;
    },

    async submit(token, rawInput) {
      const submission = participantSubmissionSchema.parse(rawInput);
      const result = await store.submitInvitation({
        tokenHash: tokens.hash(token),
        submission,
        now: now(),
        promptVersion: PROMPT_VERSION,
        aggregationPolicyVersion: AGGREGATION_POLICY_VERSION,
      });
      if (!result) throw new NotFoundError("Invitation not found");
      if (result.shouldQueue) await queue.enqueue(result.betId);
      return {
        publicId: result.publicId,
        status: result.status,
        submittedCount: result.submittedCount,
        participantCount: result.participantCount,
      };
    },

    async getOrganizer(token, baseUrl) {
      const organizer = await store.getOrganizer(tokens.hash(token));
      if (!organizer) throw new NotFoundError("Organizer link not found");
      const root = baseUrl.replace(/\/$/u, "");
      return {
        ...organizer,
        invitationUrls: organizer.slots
          .filter((slot) => slot.invitationTokenCiphertext)
          .map((slot) => `${root}/invite/${tokens.decrypt(slot.invitationTokenCiphertext!)}`),
      };
    },

    async cancel(token) {
      const cancelled = await store.cancel(tokens.hash(token), now());
      if (!cancelled) throw new ConflictError("Only an open Bet can be cancelled");
    },

    listPublic: () => store.listPublic(),

    async getPublic(publicId) {
      const bet = await store.getPublic(publicId);
      if (!bet || bet.status !== "PUBLISHED") throw new NotFoundError("Judgment not found");
      return bet;
    },

    async hide(publicId, suppliedSecret, expectedSecret) {
      const supplied = Buffer.from(suppliedSecret);
      const expected = Buffer.from(expectedSecret);
      if (
        !expectedSecret ||
        supplied.length !== expected.length ||
        !timingSafeEqual(supplied, expected)
      ) {
        throw new ForbiddenError();
      }
      const hidden = await store.hidePublication(publicId, now());
      if (!hidden) throw new NotFoundError("Judgment not found");
    },
  };
}
