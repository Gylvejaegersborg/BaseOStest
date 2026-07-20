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

---

**2026-07-20 update (Hermes) — both trigger legs now true simultaneously.**
Re-verified independently at today's standup, not taking Hemera's or Theia's word alone:
- `ap-2026-07-06-collab-confirm-10k-emraan.createdAt` = `2026-07-06T09:00:00Z` in
  `team/approvals/queue.json`, status still `pending`. Today, 2026-07-20, is day 14 exactly.
  Day-count leg: **tripped** (met, not rounded up — it is genuinely at the line I set).
- Release target July 25 (per the draft body and `ap-2026-06-27-switch-upload-replan`) is
  5 days out. Release-distance leg (single digits): **tripped**, and has been since 07-19.
- `team/inbox/*.json` — still zero files. `team/state/cursors.json` — discord/imap/copyparty
  still all empty. No contact channel for 10k.emraan exists anywhere in this repo, in any
  agent's lane, today or ever.
- The draft itself, `team/drafts/booking/collab-confirm-10k-emraan.md`, still carries
  `to: "10k.emraan (contact unknown...)"`. Reviewed it for a content update and made none —
  the body's claims (credited since June, targeting July 25, asking for confirm-or-flag) are
  all still accurate as written on 07-06; there is nothing stale in it to fix. It remains
  exactly as unsendable today as it was two weeks ago, for the same reason: no address.

Both legs I named on 07-06 are, as of today, true at the same time. Per my own rule, that
is the threshold where this stops being "framing only."

**What that concretely changes:** nothing mechanical. I still cannot send this — there is
no channel on file, this is a team run with no external calls regardless, and nothing is
queued to send without an address to put in `to:`. The approval entry stays `pending`, the
draft stays unsent, the credit stays unconfirmed. No new action is mine to take that wasn't
already available to me on day 1.

**What it does change is how I'm obligated to describe it.** Up through yesterday I held
the line that 13/14 days and 6-days-to-release was "approaching," not "tripped," because
rounding up would have been me manufacturing urgency I hadn't actually measured yet. That
discipline was the point — it's what makes today's statement mean something. Today both
numbers are the numbers I said would matter, not numbers I'm choosing to treat as close
enough. So: this is now a live, fully-tripped blocker on schedule, not a watch item. If
Switch publishes on July 25 with the "ISΛRK × 10k.emraan" credit still live in copy and
catalog, it publishes with a collaborator credit that has never been confirmed in any
record this team has access to, and the team has now run out of the runway it set for
itself to resolve that before crunch. That is a statement about severity, not a new fact —
the underlying fact (no channel, no confirmation) hasn't moved since 07-06.

**Still not mine to solve.** I don't have a channel to invent, and manufacturing one (a
guessed email, a DM handle pulled from nowhere) would be worse than the current honest gap
— it risks sending nothing, or worse, sending to the wrong person under ISΛRK's name. This
needs ISΛRK directly: either supply a real channel so the drafted message in
`collab-confirm-10k-emraan.md` can actually go out, or confirm the credit was agreed
off-record so Hermes can log it here as resolved and close `ap-2026-07-06-collab-confirm-10k-emraan`
without ever sending anything.

**Status: blocker, fully tripped as of today, 2026-07-20. Unconfirmed / outreach drafted,
not sent. Awaiting ISΛRK — channel or off-record confirmation.**
