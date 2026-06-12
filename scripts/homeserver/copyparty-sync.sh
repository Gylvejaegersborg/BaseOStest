#!/usr/bin/env bash
# Runs on the homeserver (cron, e.g. */10 * * * *): pushes new audio files from the
# copyparty drop folder into the repo via the GitHub contents API, then fires a
# repository_dispatch so team-intake.yml processes them immediately.
#
# Env (put in /etc/isark-sync.env and `set -a; source` it from cron):
#   GITHUB_TOKEN   fine-grained PAT, this repo only, Contents: read+write
#   REPO           default Gylvejaegersborg/BaseOStest
#   BRANCH         branch holding team/ state (the repo's default branch)
#   WATCH_DIR      copyparty drop folder, e.g. /srv/copyparty/beat-drop
#   LEDGER         seen-file ledger, default ~/.isark-sync-ledger
set -euo pipefail

REPO="${REPO:-Gylvejaegersborg/BaseOStest}"
BRANCH="${BRANCH:?set BRANCH to the repo default branch}"
WATCH_DIR="${WATCH_DIR:?set WATCH_DIR to the copyparty drop folder}"
LEDGER="${LEDGER:-$HOME/.isark-sync-ledger}"
API="https://api.github.com/repos/$REPO"
touch "$LEDGER"

pushed=0
shopt -s nullglob nocaseglob
for f in "$WATCH_DIR"/*.{mp3,wav,m4a,aac,ogg,flac,aif,aiff}; do
  sha=$(sha256sum "$f" | cut -d' ' -f1)
  grep -q "$sha" "$LEDGER" && continue

  name=$(basename "$f")
  # 100MB contents-API limit; beats are far smaller, but guard anyway.
  if [ "$(stat -c%s "$f")" -gt 99000000 ]; then
    echo "skip (too large for contents API): $name"
    continue
  fi

  echo "uploading: $name"
  payload=$(mktemp)
  printf '{"message":"team(intake): copyparty drop %s","branch":"%s","content":"' "$name" "$BRANCH" >"$payload"
  base64 -w0 "$f" >>"$payload"
  printf '"}' >>"$payload"

  code=$(curl -sS -o /tmp/isark-sync-resp.json -w '%{http_code}' -X PUT \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    --data-binary @"$payload" \
    "$API/contents/team/inbox/audio/$name")
  rm -f "$payload"

  if [ "$code" = "201" ] || [ "$code" = "200" ]; then
    echo "$sha  $name" >>"$LEDGER"
    pushed=$((pushed + 1))
  else
    echo "upload failed ($code) for $name:" && cat /tmp/isark-sync-resp.json
  fi
done

if [ "$pushed" -gt 0 ]; then
  echo "dispatching beat-drop event ($pushed file(s))"
  curl -sS -X POST \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -d '{"event_type":"beat-drop"}' \
    "$API/dispatches" >/dev/null
fi
echo "copyparty-sync: done ($pushed pushed)"
