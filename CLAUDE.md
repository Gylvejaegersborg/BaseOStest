# BaseOStest — personal OS dashboard for ISΛRK

React + TypeScript + Vite SPA (`src/`), Discord bridge (`server/`), weather proxy (`weather-proxy/`).
Build: `npm run typecheck && npm run build`. Path alias `@/` → `src/`.

## Agents

The ISΛRK agent team (Hemera, Nyx, Aether, Hermes, Theia, Mnemosyne, Argus, Claude) runs in
Agent-OS (github.com/gylvejaegersborg/agent-os), not in GitHub Actions. BaseSpace reaches the
gateway through the dev server's `/agent-os` proxy (see `vite.config.ts`).

- Teams and agent folders are a BaseSpace concern: `src/features/workbench/teams.ts`.
- Agents read BaseSpace through the snapshot BaseSpace pushes to the gateway
  (`POST /basespace/snapshot`, built in `src/features/agentos/snapshot.ts`).
- Agents write into BaseSpace through the overlay (`GET /basespace/overlay`,
  `src/features/overlay/osOverlay.tsx`). That is internal to the user's own OS and is not
  approval-gated. Anything outward-facing (uploads, posts, emails) goes through Agent-OS
  approvals — never published directly.
- The old GitHub team's output lives in `public/team-archive.json` (Notes → Team, plus its
  open board items imported once as todos). It is history; don't add to it.
- Be honest: agents can't hear audio, don't invent metrics or stream counts, and mark
  assumptions as assumptions.
