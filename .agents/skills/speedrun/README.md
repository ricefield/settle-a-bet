# speedrun

Implement a series of **pre-scoped tickets** back-to-back, each in its own isolated, non-interactive Claude sub-session. The main Claude session acts as a babysitter — it sets up branches, hands each ticket to a sub-session, waits for CI, merges the PR, patches small issues, and moves to the next.

> **This is an execution tool, not a research tool.** It assumes every ticket has already been carefully scoped. If a ticket needs real debugging or design work, the run stops and hands back to you.

## Usage

Invoke from a feature branch (recommended):

```
/speedrun 41-44
speed run tickets 41 through 46
/speedrun 41, 42, 44, 47
```

Ticket numbers are bare — Linear resolves them against the team in `.linear.toml`.

## What happens

Per ticket, in order:

- branch off the feature branch
- launch a sub-session
- the Stop hook commits, pushes, and opens a PR
- wait for green CI → merge
- If CI fails, Claude attempts a quick patch, else stops

All work lands on the feature branch; the feature→default PR is left open for **you** to review and merge.

Each sub-session runs as:

```bash
TICKET_MODE=1 TICKET_MODE_TARGET_BRANCH='<feature-branch>' \
  claude -p --dangerously-skip-permissions "<ticket prompt>"
```

`-p` is non-interactive, `--dangerously-skip-permissions` stops prompts stalling the run, and `TICKET_MODE` tells the repo Stop hook to commit + open a PR (based on `TICKET_MODE_TARGET_BRANCH`, always the feature branch) after the session ends.

## Safety

- Sub-PRs always target the feature branch, never the default branch.
- The feature→default PR is the single human review gate; speedrun never merges it.
- PRs merge only once CI is green; the run halts the moment a ticket stops being pure execution.

See [`SKILL.md`](./SKILL.md) for the full workflow Claude follows.
