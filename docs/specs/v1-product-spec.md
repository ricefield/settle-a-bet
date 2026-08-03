# Settle a Bet MVP Product Specification

Status: Approved for implementation

## Product promise

Settle a Bet gives 2–4 named Participants a procedurally consistent way to settle a voluntary, low-stakes disagreement. Every Participant submits a sealed Position and explanation. Claude Opus, OpenAI Sol, and Grok each contribute blind, two-sided research to one shared record, independently vote from that same evidence, and produce a public, auditable Judgment.

The product promises a transparent process and provider-diverse panel. It does not promise objective correctness and must not be used for consequential medical, legal, financial, employment, safety, or reputational decisions.

The Stake is nominal. No money is collected, held, transferred, or paid.

## Goals

- Turn an informal disagreement into an exact, shared Decision Frame.
- Keep Participant Submissions sealed until publication.
- Give every Position symmetric research resources.
- Ensure all three required Judge models contribute to one shared Research Record.
- Make the Verdict mechanical, reproducible, and inspectable.
- Produce a useful public Judgment that names consenting Participants.
- Keep creation and participation account-free.

## Non-goals

- Authentication, accounts, email, notifications, profiles, or private Judgments.
- Payments, balances, escrow, fees, or payouts.
- X or other social-network integrations.
- AI-assisted framing, rebuttal rounds, appeals, or comments.
- Manual approval before evaluation.
- File, image, audio, video, or PDF uploads.

## Creation and participation

The Creator provides:

- A title up to 120 characters.
- The exact question or premise up to 500 characters.
- Context, criteria, assumptions, and exclusions up to 2,000 words.
- A total Participant count from 2 to 4, including the Creator.
- A whole-dollar per-person nominal Stake from $1 to $10,000.
- Their required public name, Position, Submission, and up to five HTTPS source URLs.
- Explicit consent to public publication and acknowledgement that no money is processed.

Creation commits the Creator's Submission atomically and returns:

- One private Organizer Link.
- One private, one-use Invitation for every remaining Participant Slot.

The organizer view can recover Invitations, display slot completion without revealing sealed content, cancel an open Bet, and later open the Judgment.

An invited Participant reviews the immutable Decision Frame and Stake, then provides a required public name, Position, Submission, up to five HTTPS sources, and publication consent. The product shows an explicit preview before the one-shot submission. A successful submission cannot be revised, withdrawn, or replaced.

Positions are limited to 280 characters and Submissions to 1,500 words. Until publication, Participants cannot inspect anyone else's Position or Submission. The Creator has no privileged access to sealed content.

There is no submission deadline. The Creator may cancel only while the Bet is open. The final Participant Submission locks the Bet and starts or queues evaluation exactly once.

## Evaluation

Evaluation runs durably and exposes stable progress without streaming provisional conclusions.

### Research

1. Replace names with stable labels Participant A through Participant D.
2. Give the same Decision Frame and sealed Submissions to pinned Claude Opus, OpenAI Sol, and Grok models.
3. Run all three research calls concurrently and blind. No model sees another model's contribution.
4. Each model researches every Position with the same search and output limits. It must include supporting evidence, contrary evidence, weaknesses, unresolved questions, citations, and a proposed complete Position Map.
5. Use low reasoning effort, low search context, and no more than five retrieved results per contribution.
6. Preserve each contribution with provider attribution. Build a shared source index by normalizing and deduplicating URLs; do not ask another model to rewrite the evidence.
7. Use a proposed Position Map only when at least two models return the same complete partition. Otherwise every original Position remains a separate vote target.
8. Serialize and freeze the resulting Research Record.

### Judging

1. Give the identical frozen Research Record, Decision Frame, anonymized Submissions, and Position Map to all three Judges.
2. Run the three calls concurrently and blind with no web or other tools.
3. Each Judge returns one structured Vote and Judicial Opinion using medium reasoning effort.
4. A Judicial Opinion states its interpretation, decisive considerations, strongest evidence, strongest counterargument, uncertainty, and limitations without exposing hidden chain of thought.

Valid Votes are:

- One Position Map group.
- No Material Disagreement.
- No Submitted Position Prevails.
- Indeterminate.

Two matching Votes determine the Verdict. If no two valid Votes align, the Verdict is Indeterminate. Confidence or prose cannot override Votes.

### Synthesis

A pinned, low-cost OpenAI Luna model may explain the locked result but cannot choose or alter it. The output is accepted only when its encoded Verdict matches the mechanical aggregation. After repeated synthesis failure, publish a deterministic summary instead.

### Failure

Every malformed or failed provider call is retried up to three times using the exact same model and configuration. OpenRouter auto-routing, model arrays, and cross-model fallbacks are prohibited. The returned model identity must match the configured Judge. If the workflow cannot obtain all three valid Votes, the Bet becomes Evaluation Failed and receives no substantive Judgment.

## Judgment and feed

Every completed Judgment is public, indexable, immutable, and appears in a reverse-chronological feed. It displays:

1. Verdict and prevailing Position group, when applicable.
2. Majority explanation and any dissent.
3. Named Participants, Positions, and Submissions.
4. Per-person Stake and hypothetical pot with “No money was collected or paid.”
5. Position Map and the three attributed Research Contributions.
6. Shared citations and source index.
7. Every Judge's Vote and Judicial Opinion.
8. The detailed Transparency Record.

Private bearer pages are noindex, no-store, and no-referrer. Public pages are unavailable until publication. A report link is available on every Judgment. A deployment-secret-protected takedown can hide content behind a notice without rewriting the Verdict.

## Transparency Record

Publish:

- Requested and returned model identifiers.
- Model, prompt, and aggregation-policy versions.
- Anonymized model-visible inputs.
- Search queries, retrieved sources, citations, and retrieval times.
- Research Contributions, Judicial Opinions, Votes, synthesis, and available provider outputs.
- API response identifiers and timestamps.
- Retries, failures, token usage, and estimated cost.
- The frozen Research Record hash received by every Judge.

Never claim hidden reasoning is available and never manufacture text labeled as raw chain of thought.

## Architecture

One deep Bet module owns creation, slots, bearer authorization, submission, locking, cancellation, evaluation state, Position Map consensus, Vote aggregation, stake calculations, and publication. Web pages, Prisma/Postgres, Vercel Workflow, and OpenRouter are adapters at its seams.

The only model/search credential is `OPENROUTER_API_KEY`. Initial pinned model IDs are:

- `anthropic/claude-opus-5`
- `openai/gpt-5.6-sol`
- `x-ai/grok-4.5`
- `openai/gpt-5.6-luna` for synthesis only

Model upgrades require an explicit configuration change. Prompt and model versions are retained with each Evaluation Run.

Bearer tokens are high entropy. Verification uses hashes; recoverable Invitation material is encrypted at rest with a separate server-side key.

## Cost and abuse controls

- Limit creation to five Bets per IP hash per hour.
- Allow at most twenty evaluations per UTC day by default.
- Queue locked Bets in FIFO order when daily capacity is exhausted.
- Bound model output, reasoning effort, search context, and retrieved results.
- Record usage and estimated cost for every model call.
- Configure an OpenRouter account spending limit as the final failsafe.
- Treat Submissions and retrieved content as untrusted input and defend prompts against instruction injection.

## Acceptance criteria

- A 2–4 Participant Bet can be created, joined through unique links, locked, evaluated, and published without an account.
- The Creator submits during creation; every later Participant gets one immutable submission.
- No Participant can inspect another sealed Submission before publication.
- Names are present publicly but absent from every model-visible input.
- All three pinned model families contribute blind research under equal limits.
- All Judges receive the exact same Research Record hash and have no web access while voting.
- Two matching Votes mechanically determine the Verdict; the Synthesizer cannot change it.
- A model failure cannot be mistaken for an Indeterminate substantive Vote.
- The Judgment exposes citations, opinions, votes, model provenance, retries, usage, and cost.
- Stripe, payment processing, authentication, email, uploads, voice, approval, and X are absent.
