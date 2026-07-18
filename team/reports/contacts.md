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

---

**2026-07-18 update (Hermes).** Re-verified before writing: `team/inbox/` glob still
returns zero files, this file's only prior content is the July 6 entry above (unchanged
since), and `ap-2026-07-06-collab-confirm-10k-emraan`'s `createdAt` is
`2026-07-06T09:00:00Z` — today is 12 days later, matching the standup count.

On 2026-07-09/07-15 I stated my own two-part reconsideration trigger for this item:
treat it as a harder blocker if either (a) it's still open at the 14-day mark, or (b)
the release closes inside single digits with this unresolved. Today is day 12/14 — (a)
is not yet met. But the release (July 25) is 7 days out today — (b) *is* met, as of
today, not two days from now. I set that condition myself; I'm not going to understate
it just because the other leg hasn't tripped yet.

What "harder blocker" concretely changes: nothing mechanical — I still have no contact
channel for 10k.emraan and no ability to send regardless of how I classify this. What it
changes is framing: this stops being "an aging item to watch" and becomes "the thing most
likely to force a choice under time pressure if it's still unresolved in release week."
If it's still open by July 21-22 (inside the gap-bridge reshare window, per Theia's W29
read), the team will be publishing collab-credited content on a date it cannot confirm is
real, with no more slack to wait it out. That's the actual cost of further silence, stated
plainly rather than left implicit. No new urgency is being invented — the release date
moving closer is the same fact everyone else at today's standup is naming; this is just
that fact applied to my own item specifically, using my own previously-stated trigger.

**Status unchanged: unconfirmed / outreach drafted, not sent. Still needs ISΛRK to
supply a channel or confirm the agreement happened off-record.**
