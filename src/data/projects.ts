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
  /** Further open plans beyond nextMove. */
  extraPlans?: string[]
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
    sectionId: 'workbench',
    status: 'active',
    tagline: 'An autonomous team running the ISΛRK artist project.',
    what: 'A crew of AI agents that plan releases, schedule posts, draft copy and keep the artist brand moving without me babysitting every step.',
    lastMove: 'Moved the team from GitHub Actions into BaseSpace + Agent-OS: teams, standups as cron jobs, snapshot for the agents.',
    nextMove: 'Run the first standup from Agent-OS and check the brief lands in Notes → Team.',
    tags: ['agents', 'music', 'ops'],
    links: [{ label: 'SoundCloud', href: 'https://soundcloud.com/itsisark' }],
    timeline: [
      { date: '2026-09-26', text: 'GitHub team retired; agents now live in Agent-OS teams. Its archive turned out to be test data and was removed.' },
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
    lastMove: '',
    nextMove: '',
    tags: ['music', 'automation', 'cron'],
    timeline: [],
  },
  {
    id: 'obsidian-vault',
    name: 'Obsidian Vault',
    sectionId: 'notes',
    status: 'active',
    tagline: 'The long-term memory for every project.',
    what: 'A structured Obsidian vault holding project notes, lyrics, research and decisions. This OS will read and write into it directly.',
    lastMove: '',
    nextMove: '',
    tags: ['notes', 'knowledge'],
    timeline: [],
  },
  {
    id: 'copyparty',
    name: 'Copyparty Server',
    sectionId: 'ops',
    status: 'active',
    tagline: 'Self-hosted file sharing + ingest.',
    what: 'A copyparty instance on the homeserver that handles uploads, stems and shared drops between devices and agents.',
    lastMove: '',
    nextMove: '',
    tags: ['server', 'storage'],
    timeline: [],
  },
  {
    id: 'homeserver',
    name: 'Homeserver Setup',
    sectionId: 'ops',
    status: 'active',
    tagline: 'The machine this OS will live on.',
    what: 'A home server that hosts the agents, the vault API, copyparty and eventually this dashboard — reachable from anywhere.',
    lastMove: '',
    nextMove: '',
    tags: ['infra', 'server'],
    timeline: [],
  },
  {
    id: 'artist-web',
    name: 'Artist Webpage',
    sectionId: 'lab',
    status: 'shipped',
    tagline: 'Public face of ISΛRK.',
    what: 'The public artist site linking music, releases and socials. Lives as a lab module so I can test changes safely.',
    lastMove: '',
    nextMove: '',
    tags: ['web', 'music', 'public'],
    links: [{ label: '@ISΛRK', href: 'https://soundcloud.com/itsisark' }],
    timeline: [],
  },
  {
    id: 'beat-db',
    name: 'Beat Database UI',
    sectionId: 'lab',
    status: 'active',
    tagline: 'Private, searchable beat library.',
    what: 'A private database + UI for cataloguing beats with tags, BPM, key and preview playback. Feeds the song routines.',
    lastMove: '',
    nextMove: '',
    tags: ['music', 'web', 'data'],
    timeline: [],
  },
  {
    id: 'discord-bots',
    name: 'Discord Connection & Bots',
    sectionId: 'workbench',
    status: 'active',
    tagline: 'Agents reach me through Discord.',
    what: 'Bots that bridge the agents to Discord — status pings, approvals, and a channel where the crew posts what it is doing.',
    lastMove: '',
    nextMove: '',
    tags: ['agents', 'discord', 'ops'],
    timeline: [],
  },
  {
    id: 'ios-shortcuts',
    name: 'iOS Shortcuts Bridge',
    sectionId: 'calendar',
    status: 'paused',
    tagline: 'Trigger the OS from my phone.',
    what: 'Shortcuts that fire OS actions — log a note, queue a track, ask an agent — from anywhere on iOS.',
    lastMove: '',
    nextMove: '',
    tags: ['mobile', 'automation'],
    timeline: [],
  },
  {
    id: 'ai-businesses',
    name: 'AI-Run Small Businesses',
    sectionId: 'workbench',
    status: 'idea',
    tagline: 'Tiny ventures the agents operate.',
    what: 'Experiment: small, mostly-autonomous businesses where agents handle ops and I set direction. Early scoping only.',
    lastMove: '',
    nextMove: '',
    tags: ['agents', 'business', 'experiment'],
    timeline: [],
  },
]

export function projectsForSection(sectionId: SectionId): Project[] {
  return PROJECTS.filter((p) => p.sectionId === sectionId)
}

export function projectById(id: string): Project | undefined {
  return PROJECTS.find((p) => p.id === id)
}
