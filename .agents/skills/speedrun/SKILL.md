---
name: speedrun
description: "Implement a sequence of pre-scoped tickets back-to-back, each in an isolated non-interactive Codex or Claude sub-session, while the main agent manages branches, merges PRs, and patches quick issues. Triggers ONLY when the user explicitly asks to speed run / speedrun through a set of tickets, e.g. 'speed run tickets 41 through 46', '/speedrun 41, 42, 44', '/speedrun 41-44'."
allowed-tools: Bash, Read, Edit, Skill(linear)
---

# Speedrun

Drive a sequence of **pre-scoped, execution-ready** tickets to completion, one after another. Each ticket is implemented by a fresh **non-interactive Codex or Claude sub-session**; the main agent (you) is the babysitter — it sets up branches, hands each sub-session its ticket, waits for CI, merges the resulting PR, patches small problems, and moves on.

**Core assumption:** these tickets have already been carefully scoped and reviewed. This is an _execution_ run, not research or debugging. If a ticket turns out to need real exploration or design, that is a signal to **stop and hand back to the human**, not to grind through it.

## How a sub-session works (the machinery)

Choose the executor before starting:

- If the user explicitly asks for `codex` or `claude`, use that executor.
- If the user does not specify an executor, use the CLI that is available and configured for ticket-mode hooks in this repo. Prefer Codex when running from Codex unless the repo convention or user request points to Claude.
- Verify the selected CLI has a Stop hook configured to run `.agents/hooks/stop.sh`; in this repo, Codex is configured by `.codex/config.toml` and Claude by `.claude/settings.json`.

Each ticket is implemented by one of these equivalent non-interactive commands:

**Codex:**

```bash
TICKET_MODE=1 TICKET_MODE_TARGET_BRANCH='<feature-branch>' \
  codex exec --dangerously-bypass-approvals-and-sandbox \
    --dangerously-bypass-hook-trust - <<'PROMPT'
<ticket prompt>
PROMPT
```

**Claude:**

```bash
TICKET_MODE=1 TICKET_MODE_TARGET_BRANCH='<feature-branch>' \
  claude -p --dangerously-skip-permissions "<ticket prompt>"
```

- `codex exec` / `claude -p` → non-interactive; the sub-session's final message is printed to stdout (you read it).
- `--dangerously-bypass-approvals-and-sandbox` / `--dangerously-skip-permissions` → no permission prompt can stall the run. Safe here because the work is pre-scoped execution only.
- `--dangerously-bypass-hook-trust` lets Codex run the configured Stop hook in automation. Omit it only if hook trust is already persisted and the command works without it.
- `TICKET_MODE=1` → the repo's **Stop hook** (`.agents/hooks/stop.sh`) fires _after_ the sub-session ends: it typechecks, commits all changes, pushes the current branch, and opens/updates a PR. The sub-session itself never commits and is unaware the PR exists.
- `TICKET_MODE_TARGET_BRANCH` → the **base** for that PR. Always set it to the **feature branch**, so sub-PRs target the feature branch — never the default branch.

The Stop hook commits onto whatever branch is **currently checked out**, and refuses to commit if that is the target/default branch. So you MUST check out a fresh per-ticket branch _before_ launching each sub-session.

### Background terminal discipline

Sub-sessions routinely take 5–10+ minutes. Run them in a persistent **background terminal/session** so the main agent stays responsive and the command survives ordinary tool-call timeouts.

- Record the terminal/session handle returned when the command starts and reuse that handle until the process exits. Do not launch a duplicate command just because it is still running.
- Prefer an automatic completion notification when the environment provides one. Otherwise poll the background terminal **no more than once every five minutes**: wait at least five minutes between output/status reads. The initial command launch is not a poll.
- Use a blocking poll of up to five minutes when supported. Do not create shorter polling loops, repeatedly inspect the process with `ps`, or use `sleep` to simulate background execution.
- Do not switch branches, look for the sub-PR, or start the next ticket until the sub-session exits and its Stop hook finishes. When it exits, read the accumulated output and verify the exit status before continuing.
- If the environment cannot provide a persistent background terminal/session, stop and tell the user rather than running a long sub-session in a fragile foreground call.

## Step 0 — Parse the ticket list

Expand the user's argument into an ordered list of ticket numbers:

- `41-44` or `41 through 46` → `41, 42, 43, 44, [45, 46]`
- `41, 42, 44, 47` → `41, 42, 44, 47`

Use bare numbers throughout — the `linear` CLI resolves them against the team configured in `.linear.toml`, so the skill stays generic across projects. Preserve the given order; never silently sort or dedupe — if you adjust the list, say so.

Confirm the expanded list back to the user before doing anything destructive.

## Step 1 — Establish the feature branch + placeholder PR

The whole run targets **one feature branch**, so the human can review everything before it reaches `main`.

1. Check the current branch: `git rev-parse --abbrev-ref HEAD`.
2. **If already on a feature branch** (not `main`): use it as the feature branch. Push it if it has no upstream.
3. **If on `main`**: create a feature branch first. Match the repo's convention — branches here look like `fkodom-feature/<slug>`. Pick a slug describing the ticket range, push it, and open a **placeholder PR into `main`**:

   ```bash
   git checkout -b fkodom-feature/<slug>
   git push -u origin fkodom-feature/<slug>
   gh pr create --base main --head fkodom-feature/<slug> \
     --title "Speedrun: <ticket range>" \
     --body $'## Summary\nAggregates tickets XX..YY (speedrun).\n\n## Tickets\n- [ ] 41\n- [ ] 42\n\nCollects the per-ticket sub-PRs merged into this branch. Do not merge until reviewed.'
   ```

This feature→main PR is the **human review gate**. It updates automatically as sub-PRs merge into the feature branch; keep its checklist current as you complete tickets.

Record the feature branch name — it is the `TICKET_MODE_TARGET_BRANCH` for every sub-session.

## Step 2 — Per-ticket loop

For each ticket id, in order:

### 2a. Fetch the ticket (you, not the sub-session)

```bash
linear issue view <n>
```

(`linear` needs network access — run with `dangerouslyDisableSandbox: true`.) Read the title, description, work items, and acceptance criteria. You embed these into the sub-session's prompt so the sub-session never has to touch Linear.

### 2b. Make sure the feature branch is current, then branch off it

```bash
git checkout <feature-branch>
git pull
git checkout -b speedrun/<n>
```

Branching off the _updated_ feature branch is what lets each ticket build on the work merged before it.

### 2c. Launch the sub-session

Use the executor selected at the start of the run. For Codex:

```bash
TICKET_MODE=1 TICKET_MODE_TARGET_BRANCH='<feature-branch>' \
  codex exec --dangerously-bypass-approvals-and-sandbox \
    --dangerously-bypass-hook-trust - <<'PROMPT'
You are implementing a single, pre-scoped ticket. Do exactly this ticket — no
more, no less. Do NOT commit, push, or open a PR; that is handled for you after
you finish. When done, end with a short summary of what you changed and any
caveats.

Ticket <n>: <title>

<full description, work items, acceptance criteria pasted from linear>

Acceptance: bun run typecheck and bun run test must pass. Follow AGENTS.md
conventions (custom error classes, withErrorHandling, Zod validation, mocking
the db layer in tests).
PROMPT
```

For Claude:

```bash
TICKET_MODE=1 TICKET_MODE_TARGET_BRANCH='<feature-branch>' \
  claude -p --dangerously-skip-permissions "$(cat <<'PROMPT'
You are implementing a single, pre-scoped ticket. Do exactly this ticket — no
more, no less. Do NOT commit, push, or open a PR; that is handled for you after
you finish. When done, end with a short summary of what you changed and any
caveats.

Ticket <n>: <title>

<full description, work items, acceptance criteria pasted from linear>

Acceptance: bun run typecheck and bun run test must pass. Follow AGENTS.md
conventions (custom error classes, withErrorHandling, Zod validation, mocking
the db layer in tests).
PROMPT
)"
```

Run this with `dangerouslyDisableSandbox: true` (it spawns processes, hits the network, and pushes) in a persistent background terminal as described above. Read the printed final message after the process exits to understand what the sub-session believes it did.

### 2d. Find the sub-PR, then watch CI

The Stop hook will have pushed `speedrun/<n>` and opened a PR into the feature branch. Find it and watch its checks (CI runs the `Test` workflow on every branch push):

```bash
gh pr list --head speedrun/<n> --state open --json number,url -q '.[0]'
gh pr checks <pr-number> --watch=true
```

Run `gh pr checks --watch=true` directly with `dangerouslyDisableSandbox: true`; these checks normally finish quickly and do not need a background terminal.

### 2e. Green → merge with a merge commit

```bash
gh pr merge <pr-number> --merge
git checkout <feature-branch> && git pull
```

Always use `--merge` (merge commit), never squash or rebase. Then tick the ticket off the placeholder PR's checklist and continue to the next ticket.

### 2f. Red or sub-session failure → patch, else stop

If CI fails, the sub-session errored, or no PR was created:

1. **Try a quick, obvious fix yourself** — this is the main agent's job. Inspect the failure (`gh pr checks <n>`, `gh run view`, read the diff). For trivial issues (a missed import, a lint nit, a small type error, a stale snapshot), edit directly on `speedrun/<n>`, commit, and push; CI re-runs.
2. **For something slightly larger but still mechanical**, launch another non-interactive sub-session with the selected executor, scoped narrowly to the fix (same `TICKET_MODE`/`TICKET_MODE_TARGET_BRANCH` invocation, on the same branch).
3. **If the fix is not quick or obvious** — it needs real debugging, design, or rethinking the ticket — **STOP**. Do not merge. Leave the branch and PR in place, report exactly where and why you stopped, and hand back to the human. Do not start later tickets, since they may depend on this one.

Only merge a PR once its checks are green.

## Step 3 — Wrap up

When the list is exhausted (or you stopped early):

- Refresh the feature→main placeholder PR body: final checklist state, one line per merged ticket, and a note of anything skipped or halted.
- Report to the user: which tickets merged, which (if any) are blocked and why, and the feature→main PR URL for their review. **Do not merge the feature branch into `main`** — that is the human's call.

## Guardrails

- Never set a sub-PR's base to a default branch — always the feature branch.
- Never run a sub-session on the feature or default branch directly (the Stop hook will refuse, and you lose isolation). One fresh `speedrun/<n>` branch per ticket.
- Never merge a PR with failing or pending checks.
- Stop the moment a ticket stops being pure execution. The premise is babysitting smooth runs, not rescuing under-scoped tickets.
