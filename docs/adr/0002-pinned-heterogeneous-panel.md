---
status: accepted
---

# Pinned heterogeneous panel with deterministic Verdicts

Every Bet uses one pinned Claude Opus Judge, one pinned OpenAI Sol Judge, and one pinned Grok Judge through OpenRouter. Each contributes blind research to one shared Research Record and then votes independently from that identical record. Two matching Votes determine the Verdict, the Synthesizer cannot alter it, and unavailable models are retried but never substituted.
