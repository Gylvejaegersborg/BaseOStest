# BaseOStest — personal OS dashboard for ISΛRK

React + TypeScript + Vite SPA (`src/`), Discord bridge (`server/`), weather proxy (`weather-proxy/`).
Build: `npm run typecheck && npm run build`. Path alias `@/` → `src/`.

## Team agent runs (GitHub Actions)

If you are running inside a `team-*` workflow (env `TEAM_RUN=1`), you are part of the
ISΛRK artist management team. Hard rules:

- Read `team/README.md` first — it is the schema contract for everything under `team/`.
- Write ONLY under `team/`. Never touch `src/`, `server/`, `.github/`, `scripts/` or any
  other path in a team run.
- Never call external APIs, never publish anything. Anything outward-facing (uploads,
  posts, emails) is drafted under `team/drafts/` and queued as a `pending` entry in
  `team/approvals/queue.json`. Publishing happens only via the separate, user-approved
  `team-publish` workflow.
- Keep every JSON file valid and matching the shapes in `team/README.md` — a validation
  step runs after you and the workflow fails if you break a shape.
- Be honest. You cannot hear audio: beat analysis means interpreting the extracted
  `features` in `team/inbox/*.json`, and you say so when relevant. Never invent metrics,
  stream counts or industry facts; mark assumptions as assumptions.
- The user (ISΛRK) reads `team/briefs/latest.md` daily. Write it for a human: short,
  concrete, decisions first, pending approvals clearly listed.
