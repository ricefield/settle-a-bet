# Settle a Bet

Settle a Bet is a fun social prototype for friends and online debaters who want to let a neutral AI-generated arbitration process decide an argument. The product vision intentionally supports real-money wager flows for the prototype, while making clear that this is not a serious legal arbitration tool and not a production-ready regulated betting product.

## Product stance

- **No future or predictive bets.** Bets should be about disputes that are already resolvable. The arbitration model can reject topics that depend on future outcomes.
- **AI-generated arbitration, not guaranteed truth.** Participants agree that the AI panel is a neutral robotic arbitrator for the game, not an infallible source of truth.
- **Fun social use case.** The tone should feel appropriate for friends, group chats, and online debates rather than formal legal proceedings.
- **Option D prototype.** The design keeps the full wager flow in scope: collect participant stakes, take a platform cut, and pay the winner after judgment.

## Intended flow

1. A creator starts a bet with a topic, number of participants, judging mode, and per-person wager.
2. The app generates a private invite link.
3. Each participant enters an email, submits an argument, optionally adds citations or voice transcription, and provides payment details.
4. Before final submission, participants confirm that AI will evaluate the arguments and that the result may be wrong.
5. Once every participant has submitted, the app locks the record and runs a multi-agent evaluation.
6. A final judgment link is emailed to everyone with the arguments, panel votes, rationale summaries, caveats, and payout outcome.

## AI arbitration model

The evaluation process should include several roles rather than a single one-shot model response:

- **Intake validator:** rejects predictive, unsafe, junk, nonsensical, or unresolvable bets.
- **Factual referee:** checks claims, citations, and whether the dispute can be resolved from available evidence.
- **Argument scorer:** evaluates clarity, relevance, evidence quality, and who satisfied the agreed rubric.
- **Adversarial reviewer:** challenges the draft result for prompt injection, missing context, hallucinated evidence, and unfair weighting.
- **Final arbiter:** synthesizes the panel into a social judgment, winner, confidence level, caveats, and payout instruction.

The judgment page should expose rationale summaries, citations, confidence, dissenting votes, and caveats, but should not promise raw hidden chain-of-thought.

## V2 design space

Leave room for appeals after v1 by modeling judgment runs separately from bets. Appeals may introduce new evidence, trigger a stronger panel, require an appeal fee, or overturn the original result before final payout depending on the selected policy.

## Development

```sh
pnpm i
pnpm dev
```

## Testing

```sh
pnpm test
pnpm build
```
