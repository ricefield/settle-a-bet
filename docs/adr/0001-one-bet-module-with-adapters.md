---
status: accepted
---

# One deep Bet module with adapters

The web experience and durable evaluation workflow call one deep Bet module. The module owns participation, bearer authorization, locking, cancellation, evaluation state, vote aggregation, and publication; web, database, workflow, and model integrations are adapters at its seams. This keeps lifecycle rules local and lets production adapters be replaced by controlled adapters in tests.
