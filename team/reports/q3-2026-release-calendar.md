# Q3 2026 Release Calendar — ISΛRK
_Drafted by Hemera · 2026-06-12 · Based on catalog snapshot at kickoff_

---

## Overview

Four tracks in the pipeline for Q3 (July–September 2026). Only one (Switch) is
release-ready. The others have defined blockers that must close before a date can be
locked. Dates below are targets; they shift if blockers slip.

---

## Track-by-Track

### 1. Switch
**Target: July 18, 2026**
Status: export done, upload scheduled.
This is the most ready asset. Upload package is being built now (Nyx). No known
creative blocker. The gap between now and July 18 gives six weeks for the upload,
thumbnail/art review, caption copy, and a short promo window (one week minimum before
release). This is the anchor release of Q3.

Blockers: none creative. Operational: upload package must be approved, then the
SoundCloud/YouTube upload must execute and return a scheduled-publish link. Two
required inputs from the user — beat store listing URL and the July 18 publish time —
were escalated from June 18 to **June 17** on 2026-06-16, for buffer before the
approval gate. **That June 17 deadline passed on 2026-06-18 with zero input received.**
Re-set on 2026-06-18 to **June 20** — not a new escalation, but the pre-existing
approval-gate date, now carrying both jobs (inputs + approval) since splitting them
produced no extra urgency, only an extra date to track. If those inputs and the
approval land by June 20, July 18 is safe. If it slips past June 27, push to July 25.

**2026-06-19 — buffer rebuilt, not just disclosed.** Argus flagged (`t-switch-zero-
buffer-risk`) that collapsing the two dates into one left zero days between inputs
arriving and the gate closing, if both land on June 20 itself. A full additional day of
total silence followed with no movement on anything. Decision: rebuild the day rather
than just write the risk down. **June 19 (today) is now the real internal marker for
inputs to land; June 20 stays the formal external gate, unchanged.** If inputs arrive
today, Nyx has a clear day to fold them in before tomorrow's gate. If they arrive on
June 20 itself anyway, the zero-buffer risk is still live by definition — this gives the
inputs a real shot at landing inside a buffer instead of guaranteeing they land past one.

**2026-06-20 — the risk landed for real.** The June 19 marker passed with zero input,
third consecutive silent day. June 20 (today) now carries both jobs — input deadline
and formal approval gate — exactly as Argus warned, with no buffer day between them.
`ap-2026-06-19-switch-upload` remains `pending`; nothing is auto-approved by the date
passing. The mechanical deadline that actually protects July 18 is still **June 27**
(unchanged, set June 16) — today's miss does not move it, but it does mean every day
from here to June 27 is live runway, not slack, since the one buffer day available has
now been used without result. No second buffer-rebuild is planned; see the standing
silent-day policy below and in `team/os/overlay.json` for what happens instead if
silence continues.

Pre-release tasks:
- Nyx: build upload package (done, in review — blocked only on the two user inputs below)
- User: provide beat store URL + publish time — internal target **June 19 (today)**,
  formal gate **June 20** — then approve package
- Nyx: queue SoundCloud upload for scheduling

---

### 2. Homerun
**Target: August 8, 2026**
Status: art + master done. Video path **decided by default 2026-06-20** — internal
edit. See decision note below.

**2026-06-20 — fallback now in effect.** The pre-announced checkpoint was today's
standup. Three consecutive silent days (Jun 18, 19, 20) with zero user input on this
decision. Per the rule Hemera set on 2026-06-18 and restated on 2026-06-19 — "if
silence continues past today's EOD, tomorrow's standup becomes the real checkpoint and
the fallback will be treated as in effect unless told otherwise before then" — the
fallback is now in effect: **default to the internal edit over a commissioned video.**
This is reversible. If the user surfaces a preference for a commissioned video before
production starts on the internal edit, that instruction overrides this default — no
sunk cost is being protected here, the internal edit is chosen for shorter lead time
and lower risk to the Aug 8 date, not because it is irreversible. Task-board status
change needed: `t-homerun-video-decision` moves from `blocked` to `done` (or `doing`,
Hemera defers exact status word to Mnemosyne's consolidation), owner changes from
`user` to `nyx`, decision recorded as "internal edit, by default per pre-announced
fallback, reversible until production starts."

Homerun is ready except for the video asset itself, which Nyx now owns producing.
Three weeks after Switch gives each release its own promotional moment. August 8 lands
on a Saturday, which tends to perform well for melodic/electronic releases (audience is
online, editorial playlists often update Friday–Saturday).

Blockers:
- Internal edit must be produced and delivered before approximately July 25 to allow
  time for upload, review, and scheduling.
- If the edit slips past August 1, the release moves to August 22.

Pre-release tasks:
- Nyx: produce the internal edit (handoff effective 2026-06-20)
- Nyx: build upload package once the edit is delivered
- Hemera: re-confirm date once edit ETA is known (by July 1 check-in)

---

### 3. Virtual Love
**Target: September 5, 2026**
Status: demo, needs chorus.
This track is not release-ready. The chorus gap is a creative blocker — nothing else
can progress until the song is structurally complete. Target is provisional and
assumes the chorus is finished and a mix is delivered by August 1. That gives five
weeks for mix approval, master, art, upload package, and promo.

If the chorus is not done by August 1, the track moves to Q4.

Blockers:
- Chorus completion (user/artist)
- Mix after chorus
- Master after mix
- Art (none confirmed yet)

Pre-release tasks:
- User: deliver chorus and flag Aether for mix review when ready
- Aether: flag Hemera when master is received
- Nyx: hold on content until master is confirmed

---

### 4. Nightshade
**Target: September 26, 2026 (tentative — may slip to Q4)**
Status: re-mix starting.
This is the most uncertain track in Q3. A re-mix in progress has no fixed completion
date. September 26 is the end-of-quarter anchor; if the re-mix is not finished and
mastered by September 5, the slot moves to Q4 to avoid a rushed release.

Blockers:
- Re-mix completion
- Master
- Art (status unknown)

Pre-release tasks:
- Aether: check in on re-mix status once Nightshade enters the intake pipeline
- Hemera: gate decision — commit or move to Q4 by September 1

---

## Summary Table

| Track        | Target Date    | Status                  | Hard Blocker               |
|--------------|----------------|-------------------------|----------------------------|
| Switch       | July 18        | Ready for upload        | None creative              |
| Homerun      | August 8       | Art + master done       | Video                      |
| Virtual Love | September 5    | Demo                    | Chorus, then mix + master  |
| Nightshade   | September 26   | Re-mix in progress      | Re-mix + master + art      |

---

## Release Spacing

- Switch → Homerun: 21 days. Sufficient for individual promo cycles.
- Homerun → Virtual Love: 28 days. Good gap.
- Virtual Love → Nightshade: 21 days. Tight if both tracks need significant creative work.

---

## Q3 Risks

1. Virtual Love chorus is unknown timeline — this is the most likely track to slip.
2. Nightshade re-mix has no ETA — treat as Q4 until there is a completion date.
3. ~~No video production pipeline is confirmed for Homerun.~~ Resolved 2026-06-20 by
   default fallback: internal edit. Now an execution risk (Nyx delivery timeline), not
   a decision risk.
4. No Discord intake is live yet (channel IDs outstanding). Aether cannot receive new
   demos until that is resolved.
5. Switch's one rebuilt buffer day (June 19) passed with no input — see "Standing
   policy: third consecutive silent day" below. July 18 now depends on inputs landing
   inside the June 20–27 window with no slack day banked.

---

## Standing policy: third consecutive silent day (added 2026-06-20)

Filed in response to `t-backlog-collision-risk-0619`. Two prior silent days (Jun 18,
19) were each handled case-by-case — disclosing a risk, then rebuilding a buffer day.
A third consecutive silent day (today, Jun 20) means case-by-case patching is no longer
the right response; it produces a new ad hoc fix every day, which is its own failure
mode. This section is the durable answer, not a one-off note.

**1. Reminder cadence does not increase.** More reminders into silence have not worked
for three days running and add noise, not signal. Reminders stay at their current
daily standup cadence (overlay notes + reminders, restated with current numbers, not
re-escalated tone).

**2. Escalation split — what goes to ISΛRK directly vs. stays internal:**
- **Escalates to ISΛRK directly (Argus's channel, not buried in a Hemera note):**
  any item where a previously-stated fallback is about to take effect or has taken
  effect (e.g. today's Homerun default), and any item where the next miss is a
  date-moving event for a real release (e.g. Switch past June 27 → July 25).
- **Stays internal, handled by the team without a fresh escalation:** small open
  decisions with no fixed deadline consequence (W25 cadence call, Nightshade ETA before
  its own June 22 flag date) — these get tripwires (see `t-w25-cadence-decision-
  tripwire`), not repeated escalation language.

**3. Colliding deadlines get deliberately re-spaced, not independently patched.**
Going forward, when a silent day causes two or more deadlines to fall within 48 hours
of each other (as happened Jun 19–20 with the Homerun checkpoint and the Switch gate),
Hemera re-spaces them explicitly in this calendar and says so in the same standup turn,
rather than letting each one separately invent its own buffer day. This calendar's
"Next Check-in Points" section below is the single source of truth for re-spaced dates;
overlay notes and checklists reference it rather than carrying competing dates.

**4. No further buffer-rebuilding by default.** June 19 was the one buffer day this
team rebuilds for the Switch gate. It is spent. The next miss is a date-moving event
(July 25), not another internal marker. This is stated here so it is a standing rule,
not a per-incident judgment call.

---

## Next Check-in Points

- ~~June 17: Switch inputs due from user~~ — **missed, zero input received.** Folded
  into the June 20 date below rather than re-escalated a third time.
- ~~June 19: Homerun video-path decision due~~ — **missed, zero input received.**
  **Resolved 2026-06-20: fallback now in effect — internal edit, by default, per the
  pre-announced rule.** Reversible if the user states a preference before Nyx starts
  production. See Homerun section above.
- ~~June 19: real internal marker for Switch inputs to land~~ — **missed, zero input
  received.** Buffer day spent with no result; not being rebuilt a second time — see
  the standing third-silent-day policy above.
- **June 20 (today): Switch — package approval, formal external gate.** Unchanged,
  still open, still `pending` in the approvals queue. No further buffer beyond this
  without re-planning the July 18 date. The date that actually protects July 18 is
  June 27 (next line).
- **June 27: hard line for Switch inputs + approval before July 18 needs re-planning.**
  If unmet, the release moves to July 25 — not a new threat, the same line set June 16,
  now 7 days out instead of an abstract future date.
- June 22: Nightshade re-mix ETA decision due.
- July 1: Virtual Love chorus status check.
- August 1: Virtual Love mix received or track moves to Q4.
- September 1: Nightshade commit-or-Q4 gate.

---

_This calendar is a working draft. Dates are proposals, not announcements. Nothing
here is outward-facing until the relevant upload package is approved and published._
