#!/usr/bin/env bash
# One-shot prompt -> stdout for hook helper scripts. Reads prompt from stdin.
#
# This wrapper keeps provider-specific CLI details out of the hook logic.
# Provider failures produce empty output; commit-and-pr.sh validates the response
# and aborts if it cannot parse the generated artifacts.

set -euo pipefail

case "${AGENT:-codex}" in
  codex)
    CODEX_HOOK_MODEL="${CODEX_HOOK_MODEL:-gpt-5.3-codex-spark}"
    OUT="$(mktemp -t codex-hook-llm.XXXXXX)"
    trap 'rm -f "$OUT"' EXIT
    codex exec \
      --disable hooks \
      --ignore-user-config \
      --ignore-rules \
      --model "$CODEX_HOOK_MODEL" \
      --sandbox read-only \
      --skip-git-repo-check \
      --ephemeral \
      --color never \
      --output-last-message "$OUT" \
      - >/dev/null 2>&1 || true
    cat "$OUT"
    ;;
  claude | *)
    CLAUDE_HOOK_MODEL="${CLAUDE_HOOK_MODEL:-haiku}"
    claude --bare -p --model "$CLAUDE_HOOK_MODEL" --permission-mode bypassPermissions 2>/dev/null || true
    ;;
esac
