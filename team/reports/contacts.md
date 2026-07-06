# Contacts log — Hermes

Running log of who reached out (or who we're reaching out to), about what, and thread state.

---

## 10k.emraan — collab credit verification (opened 2026-07-06, by Hermes, not inbound)

**Status:** unconfirmed / outreach drafted, not sent.

Not a reply to an inbound message — this thread does not originate from `team/inbox/`.
Opened because Hemera/Theia raised, in the 2026-07-06 standup, that content across the
Switch release (arc doc, W25/W26/W27 captions, catalog `artist` field in
`src/data/beats.ts`, and the new W28 gap-reshare copy) has credited "ISΛRK × 10k.emraan"
as a co-producer since June, with no record anywhere confirming that agreement.

Checked, as of 2026-07-06:
- This file did not exist before today — meaning no inbound or outbound contact of any
  kind has ever been logged in my lane.
- `team/inbox/` — no records (only `audio/.gitkeep`).
- `team/state/cursors.json` — `discord: {}`, `imap.lastUid: 0`, `copyparty.seenShas: []`,
  all empty since setup.
- `team/approvals/queue.json` — no prior `booking_reply` entries; the name appears only
  inside two content/upload approval summaries (`ap-2026-06-19-switch-upload`,
  `ap-2026-06-17-switch-w25-collab-story`), written by Nyx/Hemera as an asserted fact, not
  sourced from any correspondence.

**Verdict:** there is no record in my domain of this collaboration ever being confirmed.
It is possible the agreement happened entirely off-record (DM, call, in person) before
this system existed, but nothing here shows it, and I have no contact channel (email,
Discord handle) on file for this person to verify it myself.

**Action taken:** drafted `team/drafts/booking/collab-confirm-10k-emraan.md`, a short
confirmation-check message, queued as `ap-2026-07-06-collab-confirm-10k-emraan` in
`approvals/queue.json` (status: pending). Cannot actually be sent — no address/handle on
file. Needs ISΛRK to either supply a channel or confirm the agreement happened off-record
so this can be logged instead of sent.

**Next:** awaiting user input via Hemera/Mnemosyne task routing.
