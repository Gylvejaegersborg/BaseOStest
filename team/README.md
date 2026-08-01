# team/ — state store for the ISΛRK AI management team

Everything the agent team knows, decides and produces lives in this directory as
JSON + Markdown, committed by the `team-*` GitHub Actions workflows. The dashboard
(`src/features/team/`) reads these files via the GitHub contents API. Humans may edit
them too — agents must tolerate hand edits.

## Layout

```
state/agents.json      live agent roster: status + current task per agent
state/tasks.json       the shared task board
state/cursors.json     intake watermarks (Discord message id, IMAP uid, copyparty SHAs)
meetings/<date>.json   structured meeting record   (+ <date>.md transcript, latest.json copy)
briefs/<date>.md       daily brief for ISΛRK       (+ latest.md copy)
inbox/audio/<id>.<ext> raw incoming beats
inbox/<id>.json        intake record (source, features, analysis)
library/beats.json     cataloged beats
approvals/queue.json   outward-facing actions awaiting user approval
approvals/archive/     resolved approval entries, one file per id
drafts/content/<id>.md post copy / captions / art prompts
drafts/booking/<id>.md email reply drafts (frontmatter: to, subject, inReplyTo)
drafts/uploads/<id>/   upload packages (metadata.json, description.md, checklist.md)
reports/market/        weekly market/social reads + deep-dives (Theia)
reports/pipeline/      run-by-run oversight / health reports (Argus, <date>.md)
reports/analysis/      per-beat musical analyses (<beatId>.md)
os/overlay.json        the user-facing OS write surface (see below)
```

## The team (7 agents)

- **Hemera** — Manager · Strategy (chairs the meeting)
- **Nyx** — Execution · Content
- **Aether** — A&R · Sound (interprets measured beat features)
- **Hermes** — Booking · Outreach
- **Mnemosyne** — Archive · Ops (writes minutes, keeps schema true)
- **Theia** — Market · Research (trends/social; reports to ISΛRK via Hemera)
- **Argus** — Oversight · Pipeline (audits the team; reports to ISΛRK directly)

## os/overlay.json — feeding the user's dashboard

The dashboard merges this file over its built-in data so agent output shows up where
ISΛRK already looks (Notes, Calendar reminders/tasks, Projects, Song Tracker, Beat DB,
the in-OS beat store + artist page, Lab). It is INTERNAL to the user's OS, so writing
here is NOT approval-gated — only outward-facing publishing is.

Shape (every key is an array; items need a stable `id`; matching ids merge/override the
built-in item, new ids are added):
```json
{ "updatedAt": "ISO-8601",
  "notes":     [ { "id": "os-note-…", "title": "…", "folder": "Team", "tags": ["…"],
                   "updated": "ISO-8601", "body": "markdown" } ],
  "reminders": [ { "id": "os-rem-…", "title": "…", "dayOffset": 0, "time": 9.5,
                   "notes": "…" } ],
  "tasks":     [ { "id": "os-task-…", "title": "…", "status": "todo|doing|done",
                   "priority": "low|med|high", "dayOffset": 0, "dueTime": "14:00" } ],
  "projects":  [ { "id": "<existing or new>", "lastMove": "…", "nextMove": "…",
                   "progress": 0 } ],
  "songs":     [ { "id": "…", "title": "…", "stage": "record|mix|master|tag|upload|distribute",
                   "bpm": 0, "musicalKey": "…", "accent": "#hex", "note": "…",
                   "tasks": [ { "id": "…", "label": "…", "done": false, "today": true } ] } ],
  "library":   [ { "id": "…", "title": "…", "category": "beat|song|…", "artist": "ISΛRK",
                   "date": "YYYY-MM-DD", "tags": ["…"], "fileType": "mp3", "bpm": 0,
                   "musicalKey": "…", "durationSec": 0, "audioFile": "/…", "gradient": ["#a","#b"] } ],
  "beats":     [ { "id": "…", "title": "…", "artist": "ISΛRK", "bpm": 0, "musicalKey": "…",
                   "mood": ["…"], "durationSec": 0, "gradient": ["#a","#b"], "plays": 0,
                   "licenses": [], "audioFile": "/…" } ],
  "lab":       [ { "id": "…", "name": "…", "kind": "…", "status": "live|staging|local",
                   "description": "…", "stack": ["…"], "url": "https://…" } ] }
```
Prefix agent-created ids with `os-` so they never collide with built-in items. To patch
an existing project/song/lab item, reuse its existing id and include only the fields you
change plus `id`.

## JSON shapes (contract — keep these exact)

### state/agents.json
```json
{ "updatedAt": "ISO-8601",
  "agents": [ { "id": "hemera", "name": "Hemera", "role": "Manager · Strategy",
                "status": "working|thinking|idle|offline",
                "task": "one line: what the agent is on right now",
                "lastActive": "ISO-8601" } ] }
```

### state/tasks.json
```json
{ "updatedAt": "ISO-8601",
  "tasks": [ { "id": "t-<slug>", "title": "...",
               "owner": "hemera|nyx|aether|hermes|mnemosyne|user",
               "status": "backlog|doing|review|blocked|done",
               "createdBy": "agent id", "createdAt": "ISO-8601",
               "handedFrom": "agent id (optional)", "due": "YYYY-MM-DD (optional)",
               "notes": "short context", "links": ["team/... paths (optional)"] } ] }
```

### state/cursors.json
```json
{ "discord": { "<channelId>": "<lastMessageId>" },
  "imap": { "lastUid": 0 },
  "copyparty": { "seenShas": [] } }
```

### meetings/<date>.json (and latest.json)
```json
{ "date": "YYYY-MM-DD", "agenda": ["..."],
  "turns": [ { "agent": "hemera", "text": "what the agent said" } ],
  "decisions": ["..."],
  "handoffs": ["hemera → nyx: draft captions for 'switch'"],
  "actionItems": ["..."] }
```
`meetings/<date>.md` is the same content as a readable transcript (`### Name` headers).

### inbox/<id>.json
```json
{ "id": "in-<date>-<slug>", "source": "discord|email|copyparty",
  "kind": "audio|message", "receivedAt": "ISO-8601", "filename": "inbox/audio/<file>",
  "from": "sender if known", "subject": "email subject / message text excerpt",
  "features": { "durationSec": 0, "bpm": 0, "key": "A minor", "lufs": 0, "truePeakDb": 0,
                "loudnessRange": 0, "spectralCentroidHz": 0, "onsetsPerSec": 0,
                "rmsMean": 0, "sampleRate": 0, "bitrateKbps": 0 },
  "analysis": { "summary": "...", "mood": ["..."], "suggestedTitle": "...",
                "suggestedTags": ["..."], "verdict": "keep|maybe|pass" },
  "status": "new|analyzed|cataloged|rejected" }
```
`features` is written by `scripts/team/extract-features.py` (real signal analysis);
`analysis` is Aether's interpretation of those numbers. Records with `kind: "message"`
(booking/collab emails) have no `features` and are triaged by Hermes.

### library/beats.json
```json
{ "updatedAt": "ISO-8601",
  "beats": [ { "id": "...", "title": "...", "bpm": 0, "musicalKey": "...",
               "mood": ["..."], "durationSec": 0, "sourceFile": "team/inbox/audio/...",
               "intakeId": "in-...", "addedAt": "ISO-8601", "public": false } ] }
```

### approvals/queue.json
```json
{ "updatedAt": "ISO-8601",
  "items": [ { "id": "ap-<date>-<slug>",
               "type": "youtube_upload|soundcloud_upload|social_post|booking_reply|site_publish",
               "title": "...", "summary": "what will happen if approved, one paragraph",
               "draftPaths": ["team/drafts/..."], "draftedBy": "agent id",
               "createdAt": "ISO-8601",
               "status": "pending|approved|rejected|published|published (manual)|failed",
               "resolvedAt": "ISO-8601 (after resolution)", "result": "free text (after)" } ] }
```
Agents may ONLY append `pending` items. Status transitions are owned by the
`team-publish` workflow, which the user dispatches from the dashboard or GitHub UI.

## Governance rules (binding — added 2026-08-01)

Fixes for the 2026-07-30 incident: Hemera overwrote `os/overlay.json` with a full `Write`
(561 lines collapsed to 33, wiping prior entries) and wrote `meetings/2026-07-30.*` and
`briefs/2026-07-30.*` mid-meeting, before the rest of the team had taken their turns. Both
were caught and fixed same-day. These two rules exist so the failure does not recur:

1. **`os/overlay.json` is always edited read-then-merge, never a full `Write`.** Read the
   current file first. Merge new or changed entries in by `id` (matching ids override the
   existing item in place; new ids are appended). A full `Write` that regenerates the whole
   file from a partial in-memory copy is prohibited — it silently clobbers any entry the
   writer didn't happen to be carrying. This applies to every agent, every turn.
2. **`meetings/<date>.*` and `briefs/<date>.*` are written only by the closing
   (Mnemosyne) step of a meeting, never mid-meeting by any other persona.** Other agents
   report their turn's content verbally in the transcript; only the close assembles and
   writes the meeting record and the daily brief. An agent who writes these files ahead of
   its own close is out of lane regardless of whether the content is accurate.
