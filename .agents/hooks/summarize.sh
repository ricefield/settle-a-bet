#!/usr/bin/env bash
# Summarize the session transcript with haiku.
# Maintains an incremental summary file: creates it on first run,
# updates it in-place on subsequent runs by feeding the prior summary
# back in alongside the latest transcript tail.
#
# Args:
#   $1 = transcript path
#   $2 = summary path (will be created or updated in-place)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TRANSCRIPT_PATH="${1:-}"
SUMMARY_PATH="${2:-}"

if [[ -z "$TRANSCRIPT_PATH" || ! -f "$TRANSCRIPT_PATH" || -z "$SUMMARY_PATH" ]]; then
  exit 0
fi

mkdir -p "$(dirname "$SUMMARY_PATH")"

PRIOR_SUMMARY=""
if [[ -f "$SUMMARY_PATH" ]]; then
  PRIOR_SUMMARY="$(cat "$SUMMARY_PATH")"
fi

TRANSCRIPT_TAIL="$(tail -c 40000 "$TRANSCRIPT_PATH" 2>/dev/null || true)"

RAW="$("$SCRIPT_DIR/llm.sh" <<EOF
You maintain a running summary of an AI coding session for use by downstream
commit-message and PR-description generators.

Output ONLY the updated summary. No preamble, no markdown fences. Keep it under
~400 words. Use the following sections (omit any that are empty):

## Goal
The original request and overall objective.

## Decisions
Key design/scope decisions made during the session.

## Changes
What was actually built, edited, or removed (high level, not file-by-file).

## Open items
Anything still in progress, deferred, or flagged for follow-up.

Prior summary (may be empty on first run):
$PRIOR_SUMMARY

Latest transcript tail (most recent activity, may overlap with prior summary):
$TRANSCRIPT_TAIL
EOF
)"
CLEAN="$(printf '%s' "$RAW" | awk '
  /<system-reminder>/ { skip=1 }
  !skip { print }
  /<\/system-reminder>/ { skip=0 }
')"

if [[ -z "${CLEAN// /}" ]]; then
  exit 0
fi

printf '%s\n' "$CLEAN" > "$SUMMARY_PATH"
