# Intake analysis — instructions

New material has arrived in `team/inbox/`. The deterministic pipeline has already
downloaded files and, for audio, written a `features` object (real signal analysis:
BPM, key estimate, LUFS, true peak, spectral stats) into each `team/inbox/<id>.json`.
The list of new intake IDs is in the `NEW_INTAKE_IDS` environment variable
(comma-separated).

Read `team/README.md` first. Then, for each new record:

**Audio records (`kind: "audio"`)** — convene the **aether** subagent (Task tool):
- Fill the record's `analysis` object (summary, mood, suggestedTitle, suggestedTags,
  verdict keep|maybe|pass) and set `status` (`cataloged` on keep — with a new entry in
  `team/library/beats.json` — otherwise `analyzed` or `rejected`).
- Write the full read to `team/reports/analysis/<id>.md`, comparing against the
  existing catalog.
- On a `keep`, also add the beat to the OS overlay so ISΛRK sees it in his dashboard:
  a `library` entry (so it appears in Beat DB) using the measured features, and — when
  it's release-worthy — a `beats` entry (so it appears in the in-OS store/artist page).
  Use `os-`-prefixed ids. This is internal, not approval-gated.

**Message records (`kind: "message"`)** — convene the **hermes** subagent:
- Triage; for anything reply-worthy, draft `team/drafts/booking/<id>.md` and append a
  `pending` `booking_reply` entry to `team/approvals/queue.json`; update
  `team/reports/contacts.md`.

Afterwards, for every kept beat, add a task to `team/state/tasks.json` for **nyx**
("prepare content/upload package for <title>", owner nyx, status backlog,
handedFrom aether) so the next meeting picks it up. Refresh `updatedAt` stamps.

Hard rules: only write under `team/`; keep JSON exactly on schema; analyses interpret
the measured features — no invented listening impressions; no publishing, ever.
