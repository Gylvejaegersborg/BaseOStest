#!/usr/bin/env bash
# Commit and push team state from a workflow run.
# Usage: commit-state.sh "<commit message>" [path ...]   (paths default to team/)
set -euo pipefail

msg="${1:?usage: commit-state.sh \"message\" [paths...]}"
shift
paths=("$@")
[ ${#paths[@]} -eq 0 ] && paths=(team/)

git config user.name "isark-team"
git config user.email "team@isark.beats"

git add -A "${paths[@]}"
if git diff --cached --quiet; then
  echo "commit-state: nothing to commit"
  exit 0
fi
git commit -m "$msg"

# Another team workflow may have pushed while we ran — rebase and retry.
for delay in 2 4 8; do
  if git push; then exit 0; fi
  echo "commit-state: push rejected, rebasing and retrying in ${delay}s"
  git pull --rebase
  sleep "$delay"
done
git push
