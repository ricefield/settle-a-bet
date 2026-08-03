#!/usr/bin/env bash
# Produces a commit message, PR title, and PR body in one model call, then
# commits, pushes, and creates or updates the pull request.
#
# Args:
#   $1 = base branch
#   $2 = head branch
#
# Stdout: one line, "<short_sha> <pr_url_or_empty>"
# Stderr: human-readable logs and failures

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DEFAULT_PR_BASE_BRANCH="main"
BASE_BRANCH="${1:-$DEFAULT_PR_BASE_BRANCH}"
HEAD_BRANCH="${2:-$(git rev-parse --abbrev-ref HEAD)}"

FILES="$(git diff --staged --name-only)"
DIFF_FULL="$(git diff --staged)"
DIFF="$(git diff --staged --stat)
${DIFF_FULL:0:30000}"

PRIOR_COMMITS="$(git log "origin/$BASE_BRANCH..HEAD" --pretty=format:'%h %s%n%b' 2>/dev/null || echo "")"

PR_META="$(gh pr list --head "$HEAD_BRANCH" --state open --limit 1 --json number,title,body,url -q '.[0] // empty' 2>/dev/null || echo "")"
PR_NUMBER=""
EXISTING_TITLE=""
EXISTING_BODY=""
EXISTING_URL=""
if [[ -n "$PR_META" ]]; then
  PR_NUMBER="$(printf '%s' "$PR_META" | jq -r '.number // ""' 2>/dev/null || echo "")"
  EXISTING_TITLE="$(printf '%s' "$PR_META" | jq -r '.title // ""' 2>/dev/null || echo "")"
  EXISTING_BODY="$(printf '%s' "$PR_META" | jq -r '.body // ""' 2>/dev/null || echo "")"
  EXISTING_URL="$(printf '%s' "$PR_META" | jq -r '.url // ""' 2>/dev/null || echo "")"
fi

RAW="$("$SCRIPT_DIR/llm.sh" <<EOF
You produce three artifacts for an in-progress branch in a single response:
a git commit message, a PR title, and a PR body.

Output format (strict, exact delimiter lines, nothing else):
---COMMIT---
<commit message: imperative subject <=72 chars; optional blank line + 1-3 short bullets>
---PR_TITLE---
<PR title, <=70 chars, no quotes, no markdown>
---PR_BODY---
<PR body in GitHub-flavored markdown with sections: ## Summary, ## Changes, ## Test plan as a checklist>

Guidelines:
- Commit message describes ONLY the staged diff for this turn.
- PR title and body cover the WHOLE branch (prior commits + this turn).
- Be concise. No "Generated with" footer. No surrounding prose.

Branch: $HEAD_BRANCH -> $BASE_BRANCH

Prior commits on this branch (may be empty for first commit):
$PRIOR_COMMITS

Existing PR title (refine but keep stable when reasonable):
$EXISTING_TITLE

Existing PR body (refresh with new info if updating):
$EXISTING_BODY

Files staged this turn:
$FILES

Staged diff this turn (truncated):
$DIFF
EOF
)"

CLEAN="$(printf '%s' "$RAW" | awk '
  /<system-reminder>/ { skip=1 }
  !skip { print }
  /<\/system-reminder>/ { skip=0 }
')"

extract() {
  local start="$1" end="$2"
  if [[ -n "$end" ]]; then
    printf '%s' "$CLEAN" | awk -v s="$start" -v e="$end" '
      $0==s {p=1; next}
      $0==e {p=0}
      p {print}
    '
  else
    printf '%s' "$CLEAN" | awk -v s="$start" '
      $0==s {p=1; next}
      p {print}
    '
  fi
}

trim() {
  sed -e 's/[[:space:]]*$//' |
    awk 'NF{f=1} f' |
    awk 'BEGIN{n=0} {a[n++]=$0} END{while(n>0 && a[n-1]=="") n--; for(i=0;i<n;i++) print a[i]}'
}

COMMIT_MSG="$(extract '---COMMIT---' '---PR_TITLE---' | trim)"
PR_TITLE="$(extract '---PR_TITLE---' '---PR_BODY---' | trim)"
PR_BODY="$(extract '---PR_BODY---' '' | trim)"

if [[ -z "${COMMIT_MSG// /}" || -z "${PR_TITLE// /}" || -z "${PR_BODY// /}" ]]; then
  echo "[ticket-mode] could not parse model output; aborting" >&2
  exit 1
fi

case "${AGENT:-codex}" in
  codex)
    COAUTHOR="Codex <noreply@openai.com>"
    ;;
  *)
    COAUTHOR="Claude <noreply@anthropic.com>"
    ;;
esac

COMMIT_MSG_WITH_TRAILER="$(printf '%s\n\nCo-Authored-By: %s\n' "$COMMIT_MSG" "$COAUTHOR")"

if ! COMMIT_OUTPUT="$(git commit -m "$COMMIT_MSG_WITH_TRAILER" 2>&1)"; then
  printf '%s\n' "$COMMIT_OUTPUT" >&2
  exit 2
fi
SHORT_SHA="$(git rev-parse --short HEAD)"

if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  git push >/dev/null
else
  git push -u origin "$HEAD_BRANCH" >/dev/null
fi

PR_URL=""
if [[ -n "$PR_NUMBER" ]]; then
  gh pr edit "$PR_NUMBER" --title "$PR_TITLE" --body "$PR_BODY" >/dev/null
  PR_URL="$EXISTING_URL"
else
  PR_URL="$(gh pr create --base "$BASE_BRANCH" --head "$HEAD_BRANCH" --title "$PR_TITLE" --body "$PR_BODY" 2>/dev/null || echo "")"
fi

printf '%s %s\n' "$SHORT_SHA" "$PR_URL"
