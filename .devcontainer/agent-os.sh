#!/usr/bin/env bash
# Updates agent-os to the latest main and (re)starts its gateway.
# start.sh runs this on every Codespace start; run it yourself after an
# agent-os PR is merged to pick it up without restarting the Codespace:
#
#   bash .devcontainer/agent-os.sh
#
# Before this existed, agent-os was cloned once (setup.sh) and never
# updated, so merged agent-os changes never reached a running Codespace.
set -uo pipefail

AGENT_OS_DIR="$HOME/agent-os"
GATEWAY_PORT="${AGENT_OS_GATEWAY_PORT:-8787}"
BASEOS_REPO_DIR="${BASEOS_REPO_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.2:3b}"

if [ ! -d "$AGENT_OS_DIR" ]; then
  echo "[agent-os] not found at $AGENT_OS_DIR (setup.sh didn't run?) — Workbench will fall back to mock data."
  exit 0
fi

cd "$AGENT_OS_DIR"
before=$(git rev-parse --short HEAD 2>/dev/null)
if git pull --ff-only --quiet; then
  after=$(git rev-parse --short HEAD)
  [ "$before" = "$after" ] && echo "[agent-os] up to date ($after)" || echo "[agent-os] updated $before → $after"
else
  echo "[agent-os] pull failed (local changes in $AGENT_OS_DIR?) — running what's there ($before)"
fi

# Re-install only when the lockfile changed since the last install.
if [ ! -f node_modules/.package-lock.json ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  echo "[agent-os] dependencies changed — npm install…"
  npm install --silent && touch node_modules/.package-lock.json
fi

# Stop a running gateway, then start the fresh one (npm run gateway builds first).
if pkill -f "[d]ist/gateway/cli.js"; then
  echo "[agent-os] stopped the old gateway"
  sleep 1
fi
echo "[agent-os] starting gateway on :$GATEWAY_PORT (log: /tmp/agent-os-gateway.log)…"
AGENT_OS_GATEWAY_PORT="$GATEWAY_PORT" OLLAMA_MODEL="$OLLAMA_MODEL" BASEOS_REPO_DIR="$BASEOS_REPO_DIR" \
  nohup npm run gateway > /tmp/agent-os-gateway.log 2>&1 &

# Wait until it answers (the TypeScript build takes a few seconds).
for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:$GATEWAY_PORT/health" > /dev/null 2>&1; then
    echo "[agent-os] gateway is up"
    exit 0
  fi
  sleep 1
done
echo "[agent-os] gateway didn't answer within 60s — see /tmp/agent-os-gateway.log"
