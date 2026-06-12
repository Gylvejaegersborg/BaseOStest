import type { SectionId } from './sections'

export type ProjectStatus = 'active' | 'paused' | 'idea' | 'shipped'

export interface Move {
  date: string
  text: string
}

export interface Project {
  id: string
  name: string
  sectionId: SectionId // which "sun" it orbits on the constellation
  status: ProjectStatus
  tagline: string
  what: string
  lastMove: string
  nextMove: string
  progress: number // 0-100
  tags: string[]
  links?: { label: string; href: string }[]
  timeline: Move[]
}

export const STATUS_META: Record<ProjectStatus, { label: string; color: string }> = {
  active: { label: 'ACTIVE', color: '#46d369' },
  paused: { label: 'PAUSED', color: '#f0a020' },
  idea: { label: 'IDEA', color: '#6b7785' },
  shipped: { label: 'SHIPPED', color: '#36e0c8' },
}

export const PROJECTS: Project[] = [
  {
    id: 'artist-mgmt',
    name: 'AI Artist Management',
    sectionId: 'room',
    status: 'active',
    tagline: 'An autonomous team running the ISΛRK artist project.',
    what: 'A crew of AI agents that plan releases, schedule posts, draft copy and keep the artist brand moving without me babysitting every step.',
    lastMove: 'Real pipeline shipped: 5 personas, daily-meeting cron, intake + approval workflows, Team dashboard.',
    nextMove: 'Add the CLAUDE_CODE_OAUTH_TOKEN secret and run the first live standup.',
    progress: 80,
    tags: ['agents', 'music', 'ops'],
    links: [{ label: 'SoundCloud', href: 'https://soundcloud.com/itsisark' }],
    timeline: [
      { date: '2026-06-12', text: 'Team went real: GitHub Actions runs Hemera, Nyx, Aether, Hermes and Mnemosyne against team/ state.' },
      { date: '2026-05-20', text: 'Split roles between Hemera (planning) and Nyx (execution).' },
      { date: '2026-05-12', text: 'First fully-automated weekly content plan generated.' },
      { date: '2026-04-30', text: 'Prototype crew booted with shared task board.' },
    ],
  },
  {
    id: 'song-routines',
    name: 'Song Upload Routines',
    sectionId: 'calendar',
    status: 'active',
    tagline: 'Cron-driven create → master → upload pipeline.',
    what: 'Scheduled routines that take a finished track, run loudness mastering, generate metadata + art prompts, and push to the distribution queue.',
    lastMove: 'Added automatic ISRC tagging before upload.',
    nextMove: 'Hook the mastering step into the beat database UI.',
    progress: 48,
    tags: ['music', 'automation', 'cron'],
    timeline: [
      { date: '2026-05-18', text: 'ISRC + metadata auto-tagging live.' },
      { date: '2026-05-02', text: 'Loudness target locked to -10 LUFS.' },
    ],
  },
  {
    id: 'obsidian-vault',
    name: 'Obsidian Vault',
    sectionId: 'notes',
    status: 'active',
    tagline: 'The long-term memory for every project.',
    what: 'A structured Obsidian vault holding project notes, lyrics, research and decisions. This OS will read and write into it directly.',
    lastMove: 'Restructured folders by life-area (music / tech / skills).',
    nextMove: 'Expose the vault over a local API for the Notes section.',
    progress: 70,
    tags: ['notes', 'knowledge'],
    timeline: [
      { date: '2026-05-22', text: 'Folder taxonomy reorganised around the OS sections.' },
      { date: '2026-05-05', text: 'Daily-note template standardised.' },
    ],
  },
  {
    id: 'copyparty',
    name: 'Copyparty Server',
    sectionId: 'ops',
    status: 'active',
    tagline: 'Self-hosted file sharing + ingest.',
    what: 'A copyparty instance on the homeserver that handles uploads, stems and shared drops between devices and agents.',
    lastMove: 'Locked down with per-folder tokens.',
    nextMove: 'Mount as the storage backend for song routines.',
    progress: 55,
    tags: ['server', 'storage'],
    timeline: [
      { date: '2026-05-15', text: 'Token-scoped folders enabled.' },
      { date: '2026-04-28', text: 'Reverse proxy + TLS configured.' },
    ],
  },
  {
    id: 'homeserver',
    name: 'Homeserver Setup',
    sectionId: 'ops',
    status: 'active',
    tagline: 'The machine this OS will live on.',
    what: 'A home server that hosts the agents, the vault API, copyparty and eventually this dashboard — reachable from anywhere.',
    lastMove: 'Containerised the agent runtimes.',
    nextMove: 'Add remote tunnel + watchtower auto-updates.',
    progress: 58,
    tags: ['infra', 'server'],
    timeline: [
      { date: '2026-05-19', text: 'Agents moved into isolated containers.' },
      { date: '2026-05-01', text: 'Base OS + monitoring stack installed.' },
    ],
  },
  {
    id: 'artist-web',
    name: 'Artist Webpage',
    sectionId: 'lab',
    status: 'shipped',
    tagline: 'Public face of ISΛRK.',
    what: 'The public artist site linking music, releases and socials. Lives as a lab module so I can test changes safely.',
    lastMove: 'Shipped the releases grid + link hub.',
    nextMove: 'A/B test a darker landing hero.',
    progress: 90,
    tags: ['web', 'music', 'public'],
    links: [{ label: '@ISΛRK', href: 'https://soundcloud.com/itsisark' }],
    timeline: [
      { date: '2026-05-10', text: 'Releases grid shipped to production.' },
      { date: '2026-04-20', text: 'Link hub consolidated all socials.' },
    ],
  },
  {
    id: 'beat-db',
    name: 'Beat Database UI',
    sectionId: 'lab',
    status: 'active',
    tagline: 'Private, searchable beat library.',
    what: 'A private database + UI for cataloguing beats with tags, BPM, key and preview playback. Feeds the song routines.',
    lastMove: 'Added waveform previews to the grid.',
    nextMove: 'Bulk-tagging and smart playlists.',
    progress: 44,
    tags: ['music', 'web', 'data'],
    timeline: [
      { date: '2026-05-17', text: 'Inline waveform preview added.' },
      { date: '2026-05-03', text: 'Key + BPM detection on import.' },
    ],
  },
  {
    id: 'discord-bots',
    name: 'Discord Connection & Bots',
    sectionId: 'room',
    status: 'active',
    tagline: 'Agents reach me through Discord.',
    what: 'Bots that bridge the agents to Discord — status pings, approvals, and a channel where the crew posts what it is doing.',
    lastMove: 'Added an approval flow for risky actions.',
    nextMove: 'Per-agent identities with unique voices.',
    progress: 50,
    tags: ['agents', 'discord', 'ops'],
    timeline: [
      { date: '2026-05-21', text: 'Risky-action approvals routed to DM.' },
      { date: '2026-05-08', text: 'Status ping bot online.' },
    ],
  },
  {
    id: 'ios-shortcuts',
    name: 'iOS Shortcuts Bridge',
    sectionId: 'calendar',
    status: 'paused',
    tagline: 'Trigger the OS from my phone.',
    what: 'Shortcuts that fire OS actions — log a note, queue a track, ask an agent — from anywhere on iOS.',
    lastMove: 'Built a "quick note to vault" shortcut.',
    nextMove: 'Resume once the local API is stable.',
    progress: 30,
    tags: ['mobile', 'automation'],
    timeline: [
      { date: '2026-04-25', text: 'Quick-note shortcut working end to end.' },
    ],
  },
  {
    id: 'ai-businesses',
    name: 'AI-Run Small Businesses',
    sectionId: 'room',
    status: 'idea',
    tagline: 'Tiny ventures the agents operate.',
    what: 'Experiment: small, mostly-autonomous businesses where agents handle ops and I set direction. Early scoping only.',
    lastMove: 'Sketched the first candidate (digital goods).',
    nextMove: 'Pick one and define guardrails.',
    progress: 12,
    tags: ['agents', 'business', 'experiment'],
    timeline: [
      { date: '2026-05-11', text: 'Shortlisted three low-risk business ideas.' },
    ],
  },
]

export function projectsForSection(sectionId: SectionId): Project[] {
  return PROJECTS.filter((p) => p.sectionId === sectionId)
}

export function projectById(id: string): Project | undefined {
  return PROJECTS.find((p) => p.id === id)
}
