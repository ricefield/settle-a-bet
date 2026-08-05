# Settle a Bet — Product Design Context

## Product register

Settle a Bet is primarily a product: an account-free tool for creating, joining, and evaluating a nominal-stakes disagreement. Its published Judgment is the public, brand-facing payoff. That page should feel like a crisp verdict reveal and a compelling case recap, not like an administration screen or a raw model log.

## Users and their jobs

- Participants want a fair conclusion they can understand, share, and trust.
- Public readers want to learn what the disagreement was, see who won, understand why, and decide whether the panel was persuasive.
- Skeptical or technical readers want to inspect the evidence and model provenance without making everyone else read it first.

## Purpose

Turn a small disagreement into an entertaining, evidence-backed public Judgment while making the mechanical decision process fully inspectable.

## Personality

- Sharp: the result is immediate and plainly stated.
- Fair-minded: every Position and dissent gets respectful treatment.
- Slightly theatrical: the reveal has tension and momentum, without becoming sensational.
- Transparent: supporting records are complete and easy to find, but do not overpower the story.

## Avoid

- Casino, sportsbook, or gambling visual language.
- A dry audit dashboard as the primary reading experience.
- Faux-newspaper ornament, generic editorial beige, or AI-SaaS card grids.
- Internal identifiers such as `position-a` in reader-facing headlines.
- Hiding uncertainty, dissent, costs, or the fact that the Stake is hypothetical.

## Design principles

1. **Verdict first.** The winner, winning Position, vote split, and synthesis belong above the fold.
2. **Explain before documenting.** Show decisive reasons next; place full Research and Transparency Records later.
3. **Preserve the drama of disagreement.** Introduce the opposing Positions clearly before presenting each Judge's opinion.
4. **Progressive disclosure builds trust.** Keep the full record available in native expandable sections instead of forcing a long wall of data on every reader.
5. **Translate machinery into human language.** Show participant names, Position text, friendly Judge names, and concise vote labels while retaining exact identifiers in the detailed record.
6. **Accessibility is part of credibility.** Meet WCAG AA contrast, preserve semantic heading order, support keyboard navigation, and respect reduced-motion preferences.
