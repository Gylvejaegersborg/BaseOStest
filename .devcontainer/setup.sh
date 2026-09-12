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

echo "[setup] Done. The gateway starts automatically on every Codespace start (see start.sh)."
