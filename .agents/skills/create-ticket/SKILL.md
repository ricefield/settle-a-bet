---
name: create-ticket
description: Plan and create well-structured Linear tickets from a feature discussion or implementation plan. Use when the user asks to break work into tickets, create Linear issues, plan implementation tasks, or scope engineering work. Triggers on phrases like "create tickets", "break this into tasks", "make Linear issues", "plan the tickets", "scope this work".
---

# Create Ticket

Plan and create Linear tickets from a feature discussion. Tickets follow a consistent structure with clear scope, acceptance criteria, and dependency tracking.

## Process

1. **Understand the work** — Review the discussion, plan, or feature description. Identify distinct units of work.
2. **Scope tickets** — Each ticket should be 2-4 human engineering hours. If a unit of work is larger, split it. If smaller, combine with related work.
3. **Identify dependencies** — Determine which tickets block others. Order ticket creation so dependency references (ticket IDs) are available.
4. **Draft tickets** — Present all tickets to the user for feedback before creating in Linear.
5. **Create in Linear** — Use `linear issue create` (with `--no-interactive` and `dangerouslyDisableSandbox: true`) to create approved tickets.

## Ticket Format

### Title

`{project-number}-{sequence}: {imperative description}`

Example: `17-3: Add existing client config fields to schema, types, and API`

- Project number comes from the parent ticket (e.g., PI-125 is "17-0", so children are 17-1, 17-2, etc.)
- Use imperative mood ("Add", "Update", "Rename", not "Adding" or "Added")
- Keep concise but specific

### Body Structure

```markdown
{One-sentence summary of what this ticket accomplishes and why.}

## Work

- {Concrete task with specific file paths or components}
- {Another task — be explicit about what changes where}

## Acceptance Criteria

- [ ] {Observable, verifiable outcome}
- [ ] {Another outcome}
- [ ] `bun run typecheck` passes
- [ ] `bun run test` passes

## Dependencies

- {ticket-number} / {PI-ID} ({short description of what it provides})
```

## Writing Guidelines

### Work Section

- Use bullet points, not numbered lists
- Reference specific files, models, functions, or components by name
- Bold key terms on first mention when clarifying scope (e.g., **renames** the column, not drop + add)
- Include enough detail that an engineer unfamiliar with the discussion can pick up the ticket
- Do not include implementation details that are obvious to any competent engineer

### Acceptance Criteria

- Write as checkbox items (`- [ ]`)
- Each criterion must be independently verifiable
- Include typecheck and test passing when the ticket involves code changes
- Focus on observable outcomes, not process ("Migration preserves existing data" not "Developer runs migration carefully")
- Include negative/edge cases when relevant ("No CMS UI visible for orgs without a connection")

### Dependencies

- Reference both the sequence number and Linear ID: `17-2 / PI-127`
- Include a parenthetical explaining what the dependency provides
- Only list direct dependencies, not transitive ones

## Scoping Heuristics

- **2-4 hours** of human engineering work per ticket
- A ticket should be completable by one engineer without needing to context-switch
- Prefer splitting by layer (schema, API, UI, pipeline) when layers are independently testable
- Group very small, tightly coupled changes together even if they span layers (e.g., a column rename touches schema + types + API + UI, but it's one small, atomic change)
- Tickets that can be parallelized should not depend on each other

## Linear CLI Usage

Create tickets with the `linear` CLI. Always use `dangerouslyDisableSandbox: true` since the CLI needs network access.

```bash
linear issue create \
  --title "{title}" \
  --description "$(cat <<'EOF'
{body}
EOF
)" \
  --parent {parent-ticket-id} \
  --project "{project-name}" \
  --team PI \
  --no-interactive
```

- `--parent`: The parent/epic ticket ID (e.g., PI-125)
- `--project`: The project name from the parent ticket
- `--no-interactive`: Prevents interactive prompts
- Create tickets sequentially so dependency IDs are available for later tickets
