export type LabGroup = 'creative' | 'ops' | 'client-builds' | 'sandbox'

export const LAB_GROUPS: { id: LabGroup; label: string }[] = [
  { id: 'creative', label: 'Music & Creative' },
  { id: 'ops', label: 'Ops & Pipeline' },
  { id: 'client-builds', label: 'Client Builds' },
  { id: 'sandbox', label: 'Sandbox' },
]

export interface LabModule {
  id: string
  name: string
  kind: string
  /** Which drawer this module groups under (workshop restructuring,
   *  Phase 4) — a coarser grouping than `kind`, which stays as the
   *  module's own descriptive label. */
  group: LabGroup
  status: 'live' | 'staging' | 'local'
  description: string
  stack: string[]
  url?: string
}

export const LAB_MODULES: LabModule[] = [
  {
    id: 'beat-store',
    name: 'ISΛRK Beat Store',
    kind: 'Storefront',
    group: 'creative',
    status: 'live',
    description: 'Public beat store — preview, pick a license tier and check out. The sales counterpart to the private Beat DB.',
    stack: ['React', 'Web Audio', 'Tailwind'],
  },
  {
    id: 'artist-web',
    name: 'Artist Webpage',
    kind: 'Public site',
    group: 'creative',
    status: 'live',
    description: 'The public ISΛRK site — releases grid, link hub and bio.',
    stack: ['React', 'Vite', 'Tailwind'],
  },
  {
    id: 'beat-db',
    name: 'Beat DB',
    kind: 'Internal tool',
    group: 'creative',
    status: 'staging',
    description:
      'The private artist library — beats, lyrics, songs, artwork, videos, stems and notes in one searchable database with file previews and an always-on player. A standalone app the OS just windows into.',
    stack: ['React', 'Web Audio', 'Tailwind'],
  },
  {
    id: 'discord-dash',
    name: 'Discord Bot Dashboard',
    kind: 'Ops panel',
    group: 'ops',
    status: 'local',
    description: 'Control panel for the agent Discord bridge + approvals.',
    stack: ['Node', 'discord.js'],
  },
  {
    id: 'copyparty-ui',
    name: 'Copyparty Drop',
    kind: 'File server',
    group: 'ops',
    status: 'live',
    description: 'Self-hosted upload + share frontend on the homeserver.',
    stack: ['copyparty', 'nginx'],
  },
  {
    id: 'shortcuts-lab',
    name: 'iOS Shortcuts Lab',
    kind: 'Mobile bridge',
    group: 'sandbox',
    status: 'local',
    description: 'Sandbox for testing phone-triggered OS actions.',
    stack: ['Shortcuts', 'Webhook'],
  },
  {
    id: 'song-tracker',
    name: 'ISΛRK Song Tracker',
    kind: 'Studio tool',
    group: 'creative',
    status: 'live',
    description:
      'Daily task tracker for ISΛRK’s ongoing song projects — each song’s stage in the record → distribute lifecycle, its own checklist and a Today panel of the day’s focus.',
    stack: ['React', 'TypeScript'],
  },
  {
    id: 'pipeline-monitor',
    name: 'Pipeline Monitor',
    kind: 'Archive',
    group: 'ops',
    status: 'local',
    description:
      'Archived factory-style pipeline visualiser — live stage diagram, animated job queue, stats and an event log. Kept as a reusable design.',
    stack: ['React', 'TypeScript'],
  },
  {
    id: 'n8n',
    name: 'n8n',
    kind: 'Automation hub',
    group: 'ops',
    status: 'local',
    description:
      'Dashboard for the homeserver n8n instance — browse workflows, see execution history, trigger runs manually, and toggle active state. Wire to the n8n REST API when the server is up.',
    stack: ['n8n', 'REST API', 'React'],
  },
  {
    id: 'yt-dlp',
    name: 'yt-dlp',
    kind: 'Downloader UI',
    group: 'ops',
    status: 'local',
    description:
      'Frontend for yt-dlp — paste a URL, pick format and quality, and queue downloads. Mockup for now; wire to a local yt-dlp API when the homeserver is up.',
    stack: ['React', 'TypeScript', 'yt-dlp'],
  },
  {
    id: 'reelroom',
    name: 'Reelroom',
    kind: 'Client delivery',
    group: 'client-builds',
    status: 'local',
    description:
      'Branded video-gallery wrapper for freelance videographers — client-facing delivery, no raw Drive links. Weekend build; full app (Vite/React + Node/Express + SQLite) lives in the standalone repo.',
    stack: ['React', 'TypeScript'],
  },
  {
    id: 'tidewriter',
    name: 'Tidewriter',
    kind: 'Client delivery',
    group: 'client-builds',
    status: 'local',
    description:
      'Trip booking and catch/trip logging for independent fishing guides and charter captains — one shareable booking page, one place to log what happened after. Weekend build; full app (Vite/React + Node/Express + node:sqlite) lives in the standalone repo.',
    stack: ['React', 'TypeScript'],
  },
  {
    id: 'clearscope',
    name: 'Clearscope',
    kind: 'Client delivery',
    group: 'client-builds',
    status: 'local',
    description:
      'Booking and report generation for independent home inspectors — a shareable booking page plus a checklist-driven inspection report clients can view without logging in. Weekend build; full app (Vite/React + Node/Express + node:sqlite) lives in the standalone repo.',
    stack: ['React', 'TypeScript'],
  },
  {
    id: 'palette',
    name: 'Palette',
    kind: 'Client delivery',
    group: 'client-builds',
    status: 'local',
    description:
      'Client preference and visit history tracking for independent stylists — no booking, just the formula/technique/notes memory a booking tool doesn’t give you. No client-facing page at all. Weekend build; full app (Vite/React + Node/Express + node:sqlite) lives in the standalone repo.',
    stack: ['React', 'TypeScript'],
  },
  {
    id: 'recallo',
    name: 'Recallo',
    kind: 'Client delivery',
    group: 'client-builds',
    status: 'local',
    description:
      'An overdue-recall list for dental practices — add patients with a last-visit date and recall interval, Recallo sorts who’s overdue and who’s due soon for front-desk staff to call. Deliberately no automated patient messaging. Weekend build; full app (Vite/React + Node/Express + node:sqlite) lives in the standalone repo.',
    stack: ['React', 'TypeScript'],
  },
  {
    id: 'signly',
    name: 'Signly',
    kind: 'Client delivery',
    group: 'client-builds',
    status: 'local',
    description:
      'A deliberately simple, no-frills branded email signature generator for small teams — set the brand once, add team members, copy each one’s signature into their email client. No banners, no analytics. Weekend build; full app (Vite/React + Node/Express + node:sqlite) lives in the standalone repo.',
    stack: ['React', 'TypeScript'],
  },
  {
    id: 'weather',
    name: 'Weather',
    kind: 'Forecast',
    group: 'sandbox',
    status: 'live',
    description: 'Oslo, Hamar and Trysil — MET, Open-Meteo, air quality, roads, cameras and space weather in one honest forecast.',
    stack: ['React', 'TypeScript', 'MET API'],
  },
  {
    id: 'sudoku',
    name: 'Sudoku',
    kind: 'Mini-game',
    group: 'sandbox',
    status: 'live',
    description: 'Learn to read the board. Guided hints, mid-game nudges and a coaching report each round.',
    stack: ['React', 'TypeScript'],
  },
]
