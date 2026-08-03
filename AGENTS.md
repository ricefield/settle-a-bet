# Settle a Bet

## Development environment

- Use Bun: `bun install`, `bun run dev`, `bun run test`, and `bun run build`.
- Use Oxfmt, Oxlint, and `bun run typecheck` before publishing changes.
- Tests use Jest; browser tests use Playwright.
- PostgreSQL is accessed through Prisma. Generate the client after schema changes with `bun run db:generate`.
- Do not apply or reset a shared database. Commit migrations and let a human apply them outside local development.

## Architecture

- Read `CONTEXT.md` and relevant files in `docs/adr/` before changing domain behavior.
- Keep the `Bet` module deep: web routes and workflow steps call its interface rather than reimplementing lifecycle rules.
- OpenRouter is a true external dependency behind an injected adapter. Production uses the HTTP adapter; tests use controlled adapters.
- Never add cross-model fallback. Claude Opus, OpenAI Sol, and Grok are required panel members.
- Names are public after publication but must never enter model-visible inputs.
- No money is collected or paid. Do not add payment concepts to the Bet module.

## Issue tracker

Issues are tracked in GitHub Issues for `tower-research-ventures/settle-a-bet`. See `docs/agents/issue-tracker.md`.
