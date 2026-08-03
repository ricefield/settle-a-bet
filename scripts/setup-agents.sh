#!/usr/bin/env bash
# By default, this repository is configured to work with Claude.
# This script makes the same setup (instructions, skills, ticket-mode stop hook)
# available to OpenAI Codex and Google Gemini.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# Hook scripts that are agent-agnostic and should be copied verbatim.
# (llm.sh and notify.sh are written per-agent below.)
SHARED_HOOKS=(stop.sh commit-and-pr.sh)

copy_shared_hooks() {
  local dest="$1"
  mkdir -p "$dest"
  for f in "${SHARED_HOOKS[@]}"; do
    cp ".agents/hooks/$f" "$dest/$f"
    chmod +x "$dest/$f"
  done
}

# --- Codex ---
# - Symlink-equivalent: tell Codex to read CLAUDE.md as project instructions
# - Copy skills from .claude to .codex
# - Mirror ticket-mode hooks; provide Codex-flavored llm.sh / notify.sh
# - Register the Stop hook in .codex/config.toml
mkdir -p .codex
cp -r .claude/skills .codex/skills 2>/dev/null || true
copy_shared_hooks .codex/hooks

cat > .codex/hooks/llm.sh <<'EOF'
#!/usr/bin/env bash
# One-shot prompt -> stdout via `codex exec`. Reads prompt from stdin.
set -euo pipefail
OUT="$(mktemp -t codex-llm.XXXXXX)"
trap 'rm -f "$OUT"' EXIT
codex exec \
  --disable hooks \
  --ignore-user-config \
  --ignore-rules \
  --model "${CODEX_HOOK_MODEL:-gpt-5.3-codex-spark}" \
  --sandbox read-only \
  --skip-git-repo-check \
  --ephemeral \
  --color never \
  --output-last-message "$OUT" \
  - >/dev/null 2>&1 || true
cat "$OUT"
EOF
chmod +x .codex/hooks/llm.sh

cat > .codex/hooks/notify.sh <<'EOF'
#!/usr/bin/env bash
# Codex Stop hooks must emit JSON on stdout; surface user-visible status on stderr.
set -euo pipefail
MSG="${1:-}"
[[ -z "$MSG" ]] && { printf '{}\n'; exit 0; }
printf '%s\n' "$MSG" >&2
printf '{}\n'
EOF
chmod +x .codex/hooks/notify.sh

cat > .codex/config.toml <<'EOF'
project_doc_fallback_filenames = ["CLAUDE.md"]

# Hooks must be explicitly enabled, otherwise the Stop hook never fires.
[features]
hooks = true

[[hooks.Stop]]
matcher = "*"

[[hooks.Stop.hooks]]
type = "command"
command = 'AGENT=codex /usr/bin/env bash "$(git rev-parse --show-toplevel)/.agents/hooks/stop.sh"'
timeout = 600
statusMessage = "Running ticket-mode Stop hook"
EOF

# --- Gemini ---
# - Configure Gemini to read CLAUDE.md as its instructions
# - Copy skills from .claude to .gemini
# - Mirror ticket-mode hooks; provide Gemini-flavored llm.sh / notify.sh
# - Register the AfterAgent hook (Gemini's per-turn equivalent of Stop)
mkdir -p .gemini
cp -r .claude/skills .gemini/skills 2>/dev/null || true
copy_shared_hooks .gemini/hooks

cat > .gemini/hooks/llm.sh <<'EOF'
#!/usr/bin/env bash
# One-shot prompt -> stdout via `gemini`. Reads prompt from stdin.
set -euo pipefail
PROMPT="$(cat)"
gemini \
  --model flash-lite \
  --approval-mode yolo \
  --output-format json \
  --prompt "$PROMPT" 2>/dev/null \
  | jq -r '.response // ""'
EOF
chmod +x .gemini/hooks/llm.sh

cat > .gemini/hooks/notify.sh <<'EOF'
#!/usr/bin/env bash
# Gemini hooks parse stdout as JSON; surface user-visible status on stderr.
set -euo pipefail
MSG="${1:-}"
[[ -z "$MSG" ]] && { printf '{}\n'; exit 0; }
printf '%s\n' "$MSG" >&2
printf '{}\n'
EOF
chmod +x .gemini/hooks/notify.sh

cat > .gemini/settings.json <<'EOF'
{
  "context": { "fileName": "CLAUDE.md" },
  "hooks": {
    "AfterAgent": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": ".gemini/hooks/stop.sh",
            "timeout": 600000
          }
        ]
      }
    ]
  }
}
EOF
