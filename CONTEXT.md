# Settle a Bet

Settle a Bet lets a small group submit a voluntary, low-stakes disagreement to an independent panel of AI Judges and receive a public, evidence-backed Judgment.

## Cases and participation

**Case**:
A disagreement that Participants submit for evaluation under one agreed Decision Frame.
_Avoid_: Bet, dispute

**Creator**:
The Participant who starts a Case, defines its initial framing, and submits before inviting anyone else.
_Avoid_: Owner, host

**Participant**:
A person who accepts a Case's Decision Frame by submitting one sealed Position and Submission.
_Avoid_: User, bettor, contestant

**Decision Frame**:
The approved question, definitions, scope, judging standard, assumptions, and exclusions that govern a Case.
_Avoid_: Prompt, topic, premise

**Position**:
A Participant's concise answer to the question established by the Decision Frame.
_Avoid_: Side, answer

**Submission**:
A Participant's sealed explanation and supporting public sources for their Position.
_Avoid_: Argument, evidence

**Case Lock**:
The point at which every expected Participant has submitted and no Position or Submission may change.
_Avoid_: Close, finalization

**Sincerity Review**:
The private operator review of a locked Case to decide whether its Participants made a genuine attempt to address the Decision Frame.
_Avoid_: Quality review, argument grading

## Evaluation

**Position Map**:
The transparent mapping from original Positions to materially equivalent normalized Positions.
_Avoid_: Clustering, answer grouping

**Research Record**:
The shared body of sourced research, strongest cases, weaknesses, and unresolved conflicts prepared before judging.
_Avoid_: Evidence packet, research summary

**Position Researcher**:
An AI research role that develops the strongest supported case for one normalized Position while recording its weaknesses.
_Avoid_: Advocate, Judge

**Cross-Examiner**:
An AI research role that compares Position research, challenges unsupported claims, and identifies unresolved conflicts before judging.
_Avoid_: Judge, Synthesizer

**Judge**:
An independently run AI model that researches the Case, evaluates every Position, and casts one sealed Vote.
_Avoid_: Agent, arbiter

**Panel Policy**:
The product-wide rules that automatically select the three Judges used for an evaluation.
_Avoid_: Case-specific panel, judge selection

**Judge Panel**:
The three Judges selected automatically under the product-wide Panel Policy for a Case.
_Avoid_: Jury, model ensemble

**Judicial Opinion**:
A Judge's structured explanation of its interpretation, decisive considerations, evidence, counterarguments, uncertainty, and Vote.
_Avoid_: Chain of thought, analysis

**Vote**:
A Judge's selection of one normalized Position or one non-prevailing Verdict type.
_Avoid_: Score, recommendation

**Verdict**:
The mechanically aggregated result of the Judge Panel's sealed Votes.
_Avoid_: Judgment, answer

**Synthesizer**:
The AI reporter that explains the locked Verdict and preserves majority and dissenting Judicial Opinions without changing the result.
_Avoid_: Final Judge, tie-breaker

**Judgment**:
The immutable public record containing the Decision Frame, anonymized Positions and Submissions, Research Record, Judicial Opinions, Verdict, synthesis, citations, and Transparency Record.
_Avoid_: Verdict, result page

**Transparency Record**:
The public provenance record of the models, configurations, prompts, searches, sources, outputs, retries, failures, and available reasoning artifacts used to produce a Judgment.
_Avoid_: Raw chain of thought, audit summary

## Outcomes

**Position Prevails**:
A Verdict in which at least two Judges select the same normalized Position.

**No Material Disagreement**:
A Verdict in which at least two Judges conclude that the submitted Positions are substantively compatible or equivalent.

**No Submitted Position Prevails**:
A Verdict in which at least two Judges conclude that every submitted Position is materially flawed; the Judgment may include a synthesized alternative conclusion.

**Indeterminate**:
A Verdict in which at least two Judges find the Case responsibly undecidable, or no two valid Votes align.

**Ineligible**:
A Case outcome indicating that the subject is outside the product's permitted low-stakes scope and must not receive a substantive Verdict.
_Avoid_: Rejected

**Rejected**:
A private operator decision not to evaluate a locked Case after Sincerity Review.
_Avoid_: Ineligible, failed

**Evaluation Failed**:
A technical outcome indicating that the required Judge Panel could not produce three valid Votes.
_Avoid_: Indeterminate, Rejected
