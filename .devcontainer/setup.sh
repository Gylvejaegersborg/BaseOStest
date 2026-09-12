#!/usr/bin/env bash
# One-time Codespace setup (devcontainer.json's postCreateCommand): installs
# BaseOStest's own deps, then clones and installs agent-os as a sibling repo
# so the Workbench (and everything else under src/features/agentos/) has a
# real gateway to talk to instead of falling back to mock data. See
# start.sh for what runs on every Codespace start.
set -euo pipefail

echo "[setup] Installing BaseOStest dependencies…"
npm install

AGENT_OS_DIR="$HOME/agent-os"
if [ ! -d "$AGENT_OS_DIR" ]; then
  echo "[setup] Cloning agent-os…"
  git clone https://github.com/Gylvejaegersborg/agent-os.git "$AGENT_OS_DIR"
else
  echo "[setup] agent-os already present at $AGENT_OS_DIR — pulling latest…"
  git -C "$AGENT_OS_DIR" pull --ff-only || echo "[setup] pull failed (local changes in $AGENT_OS_DIR?) — leaving it as-is"
fi

echo "[setup] Installing agent-os dependencies…"
npm install --prefix "$AGENT_OS_DIR"

# Ollama gives the gateway a real, zero-cost local model to fall back on —
# see start.sh for why this is the DEFAULT here specifically (no
# ANTHROPIC_TOKEN/ANTHROPIC_API_KEY/OPENAI_API_KEY set on this Codespace).
# The installer needs zstd to unpack itself, which the base devcontainer
# image doesn't ship. Both steps are idempotent (skip if already present)
# so a rebuild doesn't redo them unnecessarily — though the model itself
# still gets re-pulled on a real rebuild, since ~/.ollama isn't part of
# the persisted /workspaces mount.
if ! command -v ollama >/dev/null 2>&1; then
  echo "[setup] Installing Ollama (zstd first — its installer needs it to unpack)…"
  sudo apt-get update -qq && sudo apt-get install -y -qq zstd
  curl -fsSL https://ollama.com/install.sh | sh
else
  echo "[setup] Ollama already installed."
fi

echo "[setup] Done. The gateway + Ollama start automatically on every Codespace start (see start.sh)."
