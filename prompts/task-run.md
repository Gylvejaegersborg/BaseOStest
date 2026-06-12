# User task — instructions

ISΛRK has given the team a direct task. The task text is in the `TEAM_TASK` environment
variable (it may come from a GitHub issue — title and body — or a manual dispatch).

1. Read `team/README.md`, `team/state/tasks.json` and `team/meetings/latest.json` for
   context.
2. Decide which persona owns the task and convene them via the Task tool:
   - strategy / planning / marketing / trends → **hemera**
   - content / copy / upload packages → **nyx**
   - sound / catalog / beat questions → **aether**
   - booking / outreach / inbound mail → **hermes**
   - organization / state cleanup → **mnemosyne**
   Multi-part tasks may convene several personas in sequence; pass results forward.
3. Record the task on the board (`team/state/tasks.json`) with the user as `createdBy`,
   and mark it `done` or `review` when finished. Refresh `updatedAt`.
4. Write a concise result summary to `/tmp/task-summary.md` (this is posted back to the
   user on the issue — lead with what was produced and where it lives in `team/`).

Hard rules: only write under `team/` (plus the `/tmp` summary); outward-facing output
is drafts + `pending` approval entries only; keep JSON on schema; if the task needs
credentials or a decision only the user can make, say exactly that in the summary
instead of guessing.
