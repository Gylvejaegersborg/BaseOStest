#!/usr/bin/env bash
# Runs on every Codespace start (devcontainer.json's postStartCommand):
# starts the agent-os gateway in the background, points BaseOStest at it,
# then starts BaseOStest's own dev server in the foreground.
set -euo pipefail

AGENT_OS_DIR="$HOME/agent-os"
GATEWAY_PORT=8787

if [ -d "$AGENT_OS_DIR" ]; then
  echo "[start] Starting Agent-OS gateway on :$GATEWAY_PORT…"
  # Falls back to a deterministic stub model with zero config (see
  # agent-os's gateway/cli.ts) — set ANTHROPIC_API_KEY as a Codespace
  # secret (repo/org settings, not committed anywhere) for real model
  # responses instead of the stub's canned acknowledgements.
  (cd "$AGENT_OS_DIR" && AGENT_OS_GATEWAY_PORT="$GATEWAY_PORT" nohup npm run gateway > /tmp/agent-os-gateway.log 2>&1 &)
else
  echo "[start] agent-os not found at $AGENT_OS_DIR (postCreateCommand didn't run?) — Workbench will fall back to mock data."
fi

# A plain "localhost:$GATEWAY_PORT" would resolve to the BROWSER's own
# machine, not this container — the browser (not this container) is what
# actually calls the gateway. CODESPACE_NAME and
# GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN are set automatically by
# Codespaces, so this computes the real forwarded URL; it's a no-op
# outside Codespaces (leaves .env.local, and thus mock-data fallback,
# untouched).
if [ -n "${CODESPACE_NAME:-}" ]; then
  GATEWAY_URL="https://${CODESPACE_NAME}-${GATEWAY_PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
  echo "VITE_AGENT_OS_GATEWAY_URL=$GATEWAY_URL" > .env.local
  echo "[start] Wrote .env.local -> $GATEWAY_URL"
  echo "[start] First time in this Codespace: open the Ports panel and set port $GATEWAY_PORT's visibility to Public —"
  echo "[start]   the gateway has no login of its own, so a Private port's GitHub-auth redirect breaks plain fetch() calls to it."
fi

echo "[start] Starting BaseOStest dev server…"
exec npm run dev -- --host 0.0.0.0
