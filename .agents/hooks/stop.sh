#!/usr/bin/env bash
# Stop-hook entry point for ticket mode.
#
# This is the only script wired directly into Codex/Claude Stop hooks. Keep it
# small: it decides whether ticket mode should run, stages changes, delegates
# the expensive commit/PR work, and prints a small JSON systemMessage back to
# the host app.
#
# Normal ticket-mode flow:
#   1. Ignore non-ticket-mode stops, subagent stops, and re-entrant stop hooks.
#   2. Refuse to run on the target branch before staging anything.
#   3. Stage all changes and exit quickly if there is no staged diff.
#   4. Ask commit-and-pr.sh to generate text, commit, push, and create/update PR.
#   5. Surface the short SHA and PR URL as a systemMessage.

set -euo pipefail

DEFAULT_PR_BASE_BRANCH="main"

if [[ "${TICKET_MODE:-}" != "1" ]]; then
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$REPO_ROOT" ]]; then
  exit 0
fi
cd "$REPO_ROOT"

HOOKS_DIR="$REPO_ROOT/.agents/hooks"

PAYLOAD="$(cat || true)"
STOP_HOOK_ACTIVE="false"
HOOK_EVENT=""
AGENT_ID=""

# Parse only the fields needed to avoid duplicate or nested commits.
if [[ -n "$PAYLOAD" ]]; then
  PARSED_PAYLOAD="$(
    printf '%s' "$PAYLOAD" | jq -r '
      [
        (.stop_hook_active // false | tostring),
        .hook_event_name // "",
        .agent_id // ""
      ] | @tsv
    ' 2>/dev/null || printf 'false\t\t'
  )"
  IFS=$'\t' read -r STOP_HOOK_ACTIVE HOOK_EVENT AGENT_ID <<EOF
$PARSED_PAYLOAD
EOF
fi

if [[ "$HOOK_EVENT" == "SubagentStop" || -n "$AGENT_ID" ]]; then
  exit 0
fi
if [[ "$STOP_HOOK_ACTIVE" == "true" ]]; then
  exit 0
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
TARGET_BRANCH="${TICKET_MODE_TARGET_BRANCH:-$DEFAULT_PR_BASE_BRANCH}"

if [[ "$CURRENT_BRANCH" == "$TARGET_BRANCH" || "$CURRENT_BRANCH" == "HEAD" ]]; then
  echo "[ticket-mode] refusing to commit on target branch '$TARGET_BRANCH'" >&2
  exit 0
fi

git add -A

if git diff --staged --quiet; then
  exit 0
fi

COMMIT_STDERR_FILE="$(mktemp)"
trap 'rm -f "$COMMIT_STDERR_FILE"' EXIT

set +e
RESULT="$("$HOOKS_DIR/commit-and-pr.sh" "$TARGET_BRANCH" "$CURRENT_BRANCH" 2>"$COMMIT_STDERR_FILE")"
COMMIT_EXIT=$?
set -e

if [[ $COMMIT_EXIT -eq 2 ]]; then
  {
    echo "ticket-mode could not commit your changes - a git hook rejected them."
    echo "Fix the errors below, then finish the turn; the next stop will retry the commit."
    echo
    cat "$COMMIT_STDERR_FILE"
  } >&2
  exit 2
elif [[ $COMMIT_EXIT -ne 0 ]]; then
  cat "$COMMIT_STDERR_FILE" >&2
  exit 1
fi

SHORT_SHA="$(printf '%s' "$RESULT" | awk '{print $1}')"
PR_URL="$(printf '%s' "$RESULT" | awk '{print $2}')"

if [[ -n "$PR_URL" ]]; then
  MSG="ticket-mode: pushed $SHORT_SHA, PR $PR_URL"
else
  MSG="ticket-mode: pushed $SHORT_SHA"
fi
jq -nc --arg m "$MSG" '{systemMessage: $m}'
