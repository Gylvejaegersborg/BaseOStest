#!/usr/bin/env bash
# Runs on every Codespace start (devcontainer.json's postStartCommand):
# starts the agent-os gateway in the background, points BaseOStest at it,
# then starts BaseOStest's own dev server in the foreground.
set -euo pipefail

AGENT_OS_DIR="$HOME/agent-os"
GATEWAY_PORT=8787
# Small enough for a 2-core/8GB Codespace, and — unlike llama3.2:1b —
# actually documented as good at TOOL USE, which matters here: the
# gateway sends real tool definitions (shell, record-artifact, ...) and
# expects tool_calls back (see agent-os's models/real.ts). Override with
# a Codespace secret named OLLAMA_MODEL if you want a different one.
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.2:3b}"

# Ollama is the DEFAULT model provider on this Codespace specifically —
# real, zero-cost, no subscription/API-key complications. It only wins
# when nothing else is configured: agent-os's createModelFromEnvOrOllama()
# always prefers a real ANTHROPIC_TOKEN/ANTHROPIC_API_KEY/OPENAI_API_KEY
# over it, unchanged — so if you'd rather use a real provider, set that
# Codespace secret and Ollama steps aside automatically, nothing to edit
# here.
if command -v ollama >/dev/null 2>&1; then
  if ! pgrep -x "ollama" >/dev/null 2>&1; then
    echo "[start] Starting Ollama…"
    nohup ollama serve > /tmp/ollama.log 2>&1 &
    # Blocks briefly (server binds its port almost immediately, well
    # before it's done loading anything) so the gateway's OWN one-time
    # provider probe — a couple lines below — reliably finds it already
    # up, instead of racing it and permanently locking onto the stub
    # model for this whole gateway process because Ollama wasn't quite
    # listening yet the one time it checked.
    for _ in $(seq 1 15); do
      curl -sf http://localhost:11434/api/tags > /dev/null 2>&1 && break
      sleep 1
    done
  fi
  # The actual MODEL pull, unlike starting the server, genuinely is slow
  # (a ~2GB download the very first time — models aren't part of the
  # persisted /workspaces mount, so a real rebuild re-downloads) — that
  # one stays backgrounded so it never delays reaching the dev server
  # below. The gateway itself starts fine either way (it only needs the
  # server reachable, not this specific model pulled yet); a chat sent
  # before this finishes just errors with "model not found" until it
  # does — already-cached pulls (a plain restart, not a rebuild) are a
  # fast no-op.
  (
    echo "[start] Pulling Ollama model $OLLAMA_MODEL (background; first time only — this can take a few minutes)…"
    ollama pull "$OLLAMA_MODEL" >> /tmp/ollama.log 2>&1
    echo "[start] Ollama model $OLLAMA_MODEL ready."
  ) &
else
  echo "[start] Ollama not installed (postCreateCommand didn't run?) — falling back to whatever env vars/stub model resolve."
fi

if [ -d "$AGENT_OS_DIR" ]; then
  echo "[start] Starting Agent-OS gateway on :$GATEWAY_PORT…"
  # Falls back further to a deterministic stub model with zero config at
  # all (see agent-os's gateway/cli.ts) if even Ollama isn't reachable.
  (cd "$AGENT_OS_DIR" && AGENT_OS_GATEWAY_PORT="$GATEWAY_PORT" OLLAMA_MODEL="$OLLAMA_MODEL" nohup npm run gateway > /tmp/agent-os-gateway.log 2>&1 &)
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
