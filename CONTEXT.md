# Settle a Bet

Settle a Bet lets a small group submit a voluntary, nominal-stakes disagreement to a heterogeneous panel of AI Judges and receive a public, evidence-backed Judgment.

## Participation

**Bet**:
A disagreement that named Participants submit under one shared Decision Frame and nominal per-person Stake.
_Avoid_: Case, dispute

**Creator**:
The Participant who creates a Bet and commits the first sealed Submission.
_Avoid_: Owner, host

**Participant**:
A named person who consents to publication and commits one sealed Position and Submission.
_Avoid_: User, bettor, contestant

**Participant Slot**:
One reserved place in a Bet, represented before submission by a private bearer Invitation.
_Avoid_: Seat, account

**Organizer Link**:
The private bearer link that lets the Creator recover Invitations, see completion status, cancel an open Bet, and reach the result.
_Avoid_: Admin link, account

**Invitation**:
A private bearer link that permits exactly one immutable Participant Submission.
_Avoid_: Login, invitation account

**Decision Frame**:
The exact question, context, judging criteria, assumptions, and exclusions governing a Bet.
_Avoid_: Prompt, topic

**Position**:
A Participant's concise answer to the Decision Frame.
_Avoid_: Side, vote

**Submission**:
A Participant's sealed explanation and supporting public sources for a Position.
_Avoid_: Argument, evidence packet

**Bet Lock**:
The point at which every Participant Slot has a Submission and the Bet becomes immutable and ready for evaluation.
_Avoid_: Close, finalization

**Stake**:
The nominal per-person USD amount attached to a Bet for display only; the product never collects or pays it.
_Avoid_: Payment, balance

## Evaluation

**Research Contribution**:
One Judge model's blind, two-sided research into every Position, including supporting and contrary evidence, weaknesses, and unresolved questions.
_Avoid_: Private research, advocacy

**Position Map**:
The grouping of materially equivalent Positions used as vote targets when at least two Judge models propose the same complete grouping.
_Avoid_: Clustering, answer rewrite

**Research Record**:
The frozen, shared collection of all three attributed Research Contributions, their sources, and the Position Map.
_Avoid_: Synthesized evidence, private dossier

**Judge**:
One pinned model in the heterogeneous Judge Panel that contributes research and later casts one sealed Vote from the shared Research Record.
_Avoid_: Agent, arbiter

**Judge Panel**:
The required panel consisting of one Claude Opus model, one OpenAI Sol model, and one Grok model.
_Avoid_: Jury, configurable panel

**Judicial Opinion**:
A Judge's public explanation of its interpretation, decisive considerations, evidence, counterarguments, uncertainty, and Vote.
_Avoid_: Chain of thought, hidden reasoning

**Vote**:
A Judge's selection of one Position Map group or one non-prevailing Verdict type.
_Avoid_: Score, recommendation

**Verdict**:
The mechanically aggregated result of the three sealed Votes.
_Avoid_: Judgment, synthesis

**Judgment**:
The immutable public record containing the named Participants, Decision Frame, Submissions, nominal Stake, Research Record, Judicial Opinions, Verdict, synthesis, citations, and Transparency Record.
_Avoid_: Verdict, result page

**Transparency Record**:
The public provenance of model identities, prompts, model-visible inputs, searches, sources, outputs, retries, usage, failures, and aggregation rules used for a Judgment.
_Avoid_: Raw chain of thought, audit summary

## Outcomes

**Position Prevails**:
A Verdict in which at least two Judges select the same Position Map group.

**No Material Disagreement**:
A Verdict in which at least two Judges conclude that the submitted Positions are substantively compatible.

**No Submitted Position Prevails**:
A Verdict in which at least two Judges conclude that every submitted Position is materially flawed.

**Indeterminate**:
A Verdict in which at least two Judges choose Indeterminate or no two valid Votes align.

**Evaluation Failed**:
A technical outcome indicating that the required Judge Panel could not produce three valid Votes without model substitution.
_Avoid_: Indeterminate, rejected
