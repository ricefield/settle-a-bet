# Settle a Bet

Settle a Bet is an account-free web app for settling a nominal-stakes disagreement with a transparent panel of Claude Opus, OpenAI Sol, and Grok judges.

## Local development

1. Install [Bun](https://bun.sh/) and Docker Desktop.
2. Copy `.env.example` to `.env` and fill in the token secrets. `OPENROUTER_API_KEY` is only required for a real evaluation.
3. Run `bun install`.
4. Run `./start.sh`.

The app is available at <http://localhost:3000>. PostgreSQL is exposed on port 5432.

## Commands

- `bun run dev` — run Next.js without starting PostgreSQL.
- `bun run build` — generate Prisma Client and create a production build.
- `bun run test` — run Jest tests.
- `bun run test:e2e` — run Playwright tests.
- `bun run lint` — run Oxlint.
- `bun run format` — format with Oxfmt.
- `bun run typecheck` — run tsgo.
- `bun run db:migrate` — create and apply local development migrations.
- `bun run db:deploy` — apply committed migrations in production.

The product specification is in [`docs/specs/v1-product-spec.md`](docs/specs/v1-product-spec.md). Domain language is defined in [`CONTEXT.md`](CONTEXT.md).

## Preview deployment

Configure a Vercel project with managed Postgres and Vercel Workflow, then set every variable in `.env.example`. The three Judge model slugs and Luna synthesizer are deliberately explicit; do not replace them with auto-routing aliases. Set a hard spending limit on the OpenRouter key before running a real Bet. OpenRouter inference is passed through at provider rates, while credit purchases currently carry a 5.5% fee.

Apply `prisma/migrations` with `bun run db:deploy` before serving the preview. A real acceptance run requires all three research contributions, all three independent votes, and matching requested/returned model identities in the published Transparency Record.
