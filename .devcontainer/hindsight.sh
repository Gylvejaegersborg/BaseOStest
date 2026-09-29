#!/usr/bin/env bash
# Starts Hindsight (github.com/vectorize-io/hindsight), the agents' optional
# long-term memory, when the Codespace has HINDSIGHT_ENABLED=1 (a Codespace
# secret). start.sh runs this in the background and points the gateway at
# it (HINDSIGHT_URL); agent-os treats a down or still-starting Hindsight as
# "no recall", so nothing waits on it.
#
# No Docker in this Codespace, so it runs the Python server through uvx.
# The first start downloads the server plus its local embedding/reranker
# models (a few GB, several minutes); later starts reuse the cache.
#
# Fact extraction needs an LLM. Default: this Codespace's own Ollama with
# the same model the agents use. Override with Codespace secrets:
#   HINDSIGHT_LLM_PROVIDER  e.g. "claude-code" (your Claude login), "openai"
#   HINDSIGHT_LLM_MODEL     model name for that provider
#   HINDSIGHT_LLM_API_KEY   only for providers that need a key
#
# Memory footprint is roughly 1.5 GB on top of Ollama — fine on the 8 GB
# Codespace, tight on anything smaller. Log: /tmp/hindsight.log
set -uo pipefail

PORT="${HINDSIGHT_PORT:-8888}"
VERSION="0.10.1"

if curl -sf "http://127.0.0.1:$PORT/health" > /dev/null 2>&1; then
  echo "[hindsight] already running on :$PORT"
  exit 0
fi

if ! command -v uvx > /dev/null 2>&1; then
  echo "[hindsight] installing uv…"
  curl -LsSf https://astral.sh/uv/install.sh | sh > /tmp/hindsight.log 2>&1
  export PATH="$HOME/.local/bin:$PATH"
fi

export HINDSIGHT_API_LLM_PROVIDER="${HINDSIGHT_LLM_PROVIDER:-ollama}"
export HINDSIGHT_API_LLM_MODEL="${HINDSIGHT_LLM_MODEL:-${OLLAMA_MODEL:-llama3.2:3b}}"
if [ "$HINDSIGHT_API_LLM_PROVIDER" = "ollama" ]; then
  export HINDSIGHT_API_LLM_BASE_URL="${HINDSIGHT_LLM_BASE_URL:-http://localhost:11434/v1}"
fi
[ -n "${HINDSIGHT_LLM_API_KEY:-}" ] && export HINDSIGHT_API_LLM_API_KEY="$HINDSIGHT_LLM_API_KEY"

echo "[hindsight] starting on :$PORT (LLM: $HINDSIGHT_API_LLM_PROVIDER/$HINDSIGHT_API_LLM_MODEL; first start downloads models — log: /tmp/hindsight.log)…"
# --host 127.0.0.1: Hindsight's default is 0.0.0.0 and it has no auth unless a key
# is set. Only the gateway (same machine) talks to it, so keep it off the network.
nohup uvx --from "hindsight-api==$VERSION" hindsight-api --host 127.0.0.1 --port "$PORT" --idle-timeout 0 >> /tmp/hindsight.log 2>&1 &

for _ in $(seq 1 300); do
  if curl -sf "http://127.0.0.1:$PORT/health" > /dev/null 2>&1; then
    echo "[hindsight] up on :$PORT — agents now recall from it"
    exit 0
  fi
  sleep 2
done
echo "[hindsight] not up after 10 minutes — see /tmp/hindsight.log (agents keep working without it)"
