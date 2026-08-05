---
name: linear
description: "Manage Linear issues: view, create, update, assign, and create PRs. Triggers on Linear ticket references (e.g. PI-123), or phrases like 'create tickets', 'work on ticket', 'implement issue'."
allowed-tools: Bash(linear:*), Bash(curl:*), Bash(gh:*)
---

# Linear

Use the `linear` CLI to manage issues. All commands require `dangerouslyDisableSandbox: true` (network access needed).

Run `linear <command> --help` to discover flags and options.

## Project Config

- **Team:** (Defined by Linear CLI)
- **PR base branch:** main

## Key Commands

```bash
linear issue view <id>                          # View issue details
linear issue list                               # List your issues
linear issue url <id>                           # Get issue URL
linear issue update <id> -a self -s started     # Assign to self + start
linear issue update <id> -s completed           # Mark completed
linear issue create --title "..." --description "..." --team <team> --no-interactive
linear issue create --parent <id> --project "..." --team <team> --no-interactive

linear project list                              # List projects
linear project view <id>                         # View project details
linear project create --name "..." --team <team> --no-interactive
```

## Ticket Workflow

### Working on a ticket

1. Understand the ticket: `linear issue view <id>`
2. Implement the solution
3. Verify: `bun run test && bun typecheck`

Do not commit, push, or create a PR unless prompted to. If prompted by the user:

4. Commit, push, create PR (see below)
5. Report PR URL + ticket URL to user. Do NOT merge without explicit approval.
6. On merge: `linear issue update <id> -s completed`

#### Creating a PR

```bash
gh pr create --base main --title "<id>: <title>" --body $'## Summary\n<bullets>\n\n## Test plan\n- [ ] <steps>\n\nFixes <id>\nLinear: <ticket-url>\n\n Generated with [Claude Code](https://claude.com/claude-code)'
```

### Creating tickets

1. Review the feature/plan. Split into tickets scoped to ~2-4 hours each.
2. Draft all tickets and present to user for approval before creating.
3. Create sequentially (so dependency IDs are available).

**Ticket body format:**

```markdown
{One-sentence summary.}

## Work

_apps/web_

- {Concrete task with specific files/components}

_apps/mobile_

- {Concrete task with specific files/components}

_packages/shared_

- {Concrete task with specific files/components}

(Only include the relevant apps/packages, but include all that apply. Be as specific as possible about what needs to be done and where.)

## Acceptance Criteria

- [ ] {Verifiable outcome}
- [ ] `bun typecheck` passes
- [ ] `bun run test` passes

## Dependencies

- {PI-ID} ({what it provides})
```

## Ticket States

| State     | When                          |
| --------- | ----------------------------- |
| triage    | Needs review/prioritization   |
| backlog   | Queued for future work        |
| unstarted | Planned but not started       |
| started   | Actively working              |
| completed | PR merged, work done          |
| canceled  | Abandoned or no longer needed |
