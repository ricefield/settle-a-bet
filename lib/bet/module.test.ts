import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import type { TokenVault } from "@/lib/security/tokens";
import type { CreateBetInput, ParticipantSubmissionInput } from "@/lib/types";
import { createBetModule } from "./module";
import type { BetStore } from "./store";

const submission: ParticipantSubmissionInput = {
  name: "Ada",
  position: "Position A",
  submission: "This is the complete case.",
  sourceUrls: ["https://example.com/source"],
  publicationConsent: true,
  nominalStakeAcknowledgement: true,
};

const bet: CreateBetInput = {
  title: "Test Bet",
  question: "Which Position should prevail?",
  decisionContext: "Use the stated evidence and criteria.",
  participantCount: 3,
  stakeUsd: 25,
  creator: submission,
};

function harness() {
  let generated = 0;
  const tokens: TokenVault = {
    generate: () => `token-${++generated}`,
    hash: (value) => `hash:${value}`,
    hashIp: (value) => `ip:${value}`,
    encrypt: (value) => `encrypted:${value}`,
    decrypt: (value) => value.replace("encrypted:", ""),
  };
  const store = {
    consumeCreationRateLimit: jest.fn(async () => undefined),
    createBet: jest.fn(async () => undefined),
    getInvitation: jest.fn(),
    submitInvitation: jest.fn(),
    getOrganizer: jest.fn(),
    cancel: jest.fn(),
    listPublic: jest.fn(async () => []),
    getPublic: jest.fn(),
    hidePublication: jest.fn(),
  } as unknown as jest.Mocked<BetStore>;
  const queue = { enqueue: jest.fn(async () => undefined) };
  return {
    module: createBetModule({ store, tokens, queue, now: () => new Date("2026-08-03T12:00:00Z") }),
    store,
    queue,
  };
}

describe("Bet module", () => {
  it("creates every slot atomically with one organizer link and one link per invitee", async () => {
    const { module, store } = harness();
    const result = await module.create(bet, { ip: "192.0.2.1", baseUrl: "https://bets.example/" });
    expect(result.organizerUrl).toBe("https://bets.example/organize/token-1");
    expect(result.invitationUrls).toEqual([
      "https://bets.example/invite/token-2",
      "https://bets.example/invite/token-3",
    ]);
    expect(store.createBet).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorIpHash: "ip:192.0.2.1",
        organizerTokenHash: "hash:token-1",
        bet,
        slots: [
          expect.objectContaining({ ordinal: 0, label: "A", submission }),
          expect.objectContaining({ ordinal: 1, label: "B", invitationTokenHash: "hash:token-2" }),
          expect.objectContaining({ ordinal: 2, label: "C", invitationTokenHash: "hash:token-3" }),
        ],
      }),
    );
  });

  it("queues evaluation exactly when the store locks the final submission", async () => {
    const { module, store, queue } = harness();
    store.submitInvitation.mockResolvedValue({
      betId: "bet-1",
      publicId: "public-1",
      status: "QUEUED",
      submittedCount: 2,
      participantCount: 2,
      shouldQueue: true,
    });
    await module.submit("invite-token", submission);
    expect(store.submitInvitation).toHaveBeenCalledTimes(1);
    expect(queue.enqueue).toHaveBeenCalledWith("bet-1");
  });

  it("does not enqueue before the final participant", async () => {
    const { module, store, queue } = harness();
    store.submitInvitation.mockResolvedValue({
      betId: "bet-1",
      publicId: "public-1",
      status: "OPEN",
      submittedCount: 2,
      participantCount: 3,
      shouldQueue: false,
    });
    await module.submit("invite-token", submission);
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it("recovers only invitation links from the organizer bearer token", async () => {
    const { module, store } = harness();
    store.getOrganizer.mockResolvedValue({
      publicId: "public-1",
      status: "OPEN",
      title: "Test",
      question: "Q?",
      participantCount: 2,
      stakeUsd: 10,
      failureReason: null,
      slots: [
        { label: "A", name: "Ada", submitted: true, invitationTokenCiphertext: null },
        {
          label: "B",
          name: null,
          submitted: false,
          invitationTokenCiphertext: "encrypted:invite-b",
        },
      ],
    });
    const organizer = await module.getOrganizer("organizer", "https://bets.example");
    expect(organizer.invitationUrls).toEqual(["https://bets.example/invite/invite-b"]);
  });

  it("enforces cancellation and takedown authorization at the module boundary", async () => {
    const { module, store } = harness();
    store.cancel.mockResolvedValue(false);
    await expect(module.cancel("organizer")).rejects.toBeInstanceOf(ConflictError);
    await expect(
      module.hide("public-1", "wrong", "correct-secret-that-is-long"),
    ).rejects.toBeInstanceOf(ForbiddenError);
    store.getPublic.mockResolvedValue(null);
    await expect(module.getPublic("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
