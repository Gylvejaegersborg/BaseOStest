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
    lastMove: 'Ran the first full agent-team pipeline on a real product (the Salient sound pack) and added a briefing and a needs-you list so the decisions reach me.',
    nextMove: 'Tweak the team standups and keep track of when songs and content are released (schedule posts).',
    extraPlans: ['Decide what actually gets published; anything outward goes through Approvals'],
    tags: ['agents', 'music', 'ops'],
    links: [{ label: 'SoundCloud', href: 'https://soundcloud.com/itsisark' }],
    timeline: [
      { date: '2026-10-08', text: 'The lead now writes a briefing when a flow finishes (what to decide, what was done, what is out of date) and the bell lists what needs me.' },
      { date: '2026-10-07', text: 'The agents’ notes are fact-checked by code against the pack, and they can edit notes in place instead of rewriting them.' },
      { date: '2026-10-06', text: 'Salient (71 sounds) went through the whole team: overview, license, listing, YouTube plan, FAQ and decisions, then Argus’ checks and fix rounds.' },
      { date: '2026-09-30', text: 'Leaders design flows and Argus verifies them; cancelling stops a running step.' },
      { date: '2026-09-29', text: 'Governance, watchdog, team reviews and team templates.' },
      { date: '2026-09-28', text: 'Work handed between agents, reporting lines, goals and board controls.' },
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
    what: 'Scheduled routines that take a finished track, check it against a LUFS loudness target, prepare its release details and send it to DistroKid. The ISΛRK Song Tracker (a Lab tool) belongs here: each song’s stage from record to distribute, with its own checklist. The routines are real ideas that are not built out yet.',
    lastMove: 'Built the pieces underneath: the music library, loudness measurement and rough audio editing for the agents, and Sound Lab. No routine runs yet.',
    nextMove: 'LUFS-target normalization: the audio tool only measures loudness and edits roughly.',
    extraPlans: ['Put the real songs in the Song Tracker (it is empty today)', 'Measure loudness on the real songs and record it on each', 'A per-song release checklist; unknown fields stay empty until I fill them', 'The DistroKid upload is an Approvals item, never automatic'],
    tags: ['music', 'automation', 'cron'],
    timeline: [
      { date: '2026-10-06', text: 'Sound Lab and sound-pack export: drum and melodic one-shots you judge by ear.' },
      { date: '2026-09-29', text: 'Music library with real uploads, plus agent tools for the library and for audio (loudness measurement, rough edits). The Song Tracker’s sample songs were removed.' },
      { date: '2026-06-01', text: 'The Song Tracker created in the Lab (refocused from an older render-queue design).' },
    ],
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
    timeline: [
      { date: '2026-10-08', text: 'Ops page rebuilt on real data: services, Tailscale devices, problems and the real log files.' },
      { date: '2026-09-29', text: 'The OS runs on the Windows server under a supervisor, reachable only over Tailscale.' },
    ],
  },
  {
    id: 'artist-web',
    name: 'Artist Webpage',
    sectionId: 'lab',
    status: 'active',
    tagline: 'Public face of ISΛRK.',
    what: 'The artist site linking music, releases and socials. It lives as a Lab module inside the OS and is not hosted anywhere public yet.',
    lastMove: 'Removed the invented bio, play counts and placeholder links; the real Instagram, YouTube and contact emails are in.',
    nextMove: 'Decide where it is hosted: today it only exists inside the OS.',
    extraPlans: ['Write a real bio', 'Add real releases as songs go into the library (Sinnsyk first)'],
    tags: ['web', 'music'],
    links: [{ label: 'SoundCloud', href: 'https://soundcloud.com/itsisark' }, { label: 'Instagram', href: 'https://www.instagram.com/yung.isark' }, { label: 'YouTube', href: 'https://youtube.com/@isarkbeats' }, { label: 'YouTube (2)', href: 'https://youtube.com/@isark6955' }],
    timeline: [
      { date: '2026-10-08', text: 'Sample content removed (bio, play counts, BPM and key, license text); real social links and contact emails added.' },
      { date: '2026-06-13', text: 'Releases now come from the OS, so beats you add show up on the page.' },
      { date: '2026-06-01', text: 'Created as a Lab module.' },
    ],
  },
  {
    id: 'beat-db',
    name: 'Beat Database UI',
    sectionId: 'lab',
    status: 'active',
    tagline: 'Private, searchable beat library.',
    what: 'A private database + UI for cataloguing beats and songs with tags, BPM, key, lyrics, credits and preview playback. Uploads are stored on the OS server.',
    lastMove: 'Removed the sample beat details and the eight invented assets; only the real tracks and your uploads remain.',
    nextMove: 'Add Sinnsyk (it needs its audio file).',
    extraPlans: ['Fill in BPM and key for the real songs myself; nothing is guessed', 'Move Gswish from the tags to the collaborator credit on Love at the beach'],
    tags: ['music', 'web', 'data'],
    timeline: [
      { date: '2026-10-08', text: 'Sample BPM, key, mood, play counts and license prices removed from the three real tracks.' },
      { date: '2026-09-30', text: 'Collaborators on songs: credits only, no splits.' },
      { date: '2026-09-29', text: 'Real uploads (Add song), lyrics, library storage on the OS server and tools for the agents; the fake catalog was removed.' },
      { date: '2026-05-31', text: 'Created as a Lab module.' },
      { date: '2026-05-28', text: 'The real tracks added: Homerun, Virtual Love and Switch.' },
    ],
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
    status: 'active',
    tagline: 'Tiny ventures the agents operate.',
    what: 'Experiment: small, mostly-autonomous businesses where agents handle ops and I set direction. The first test product is the Salient sound kit, as a test of the whole orchestration pipeline and harness.',
    lastMove: 'Built the Salient sound kit (71 sounds) and ran its launch prep through the agent team as the first test product.',
    nextMove: 'Finish the Salient launch: license brackets and legal review, cover art, price, then the BeatStars and YouTube uploads (through Approvals).',
    extraPlans: ['Define what a venture is and what the agents may do without approval', 'Judge the pipeline by whether a launch finishes without rescue'],
    tags: ['agents', 'business', 'experiment'],
    timeline: [
      { date: '2026-10-08', text: 'The team’s findings, decisions and open to-dos for Salient are collected in one flow report with a briefing.' },
      { date: '2026-10-07', text: 'Argus’ review rounds and the notes’ rebuild with numbers checked by code.' },
      { date: '2026-10-06', text: 'Salient built (71 sounds) and its launch prep run by Aether, Nyx, Theia, Mnemosyne and Argus.' },
    ],
  },
  {
    id: 'agent-os',
    name: 'Agent-OS',
    sectionId: 'workbench',
    status: 'active',
    tagline: 'The runtime the agent team runs on.',
    what: 'The gateway and harness behind the agents: flows, delegated work, governance and approvals, verification, briefings, memory and connectors.',
    lastMove: 'Flows now end in a briefing and a needs-you list, with numbers checked by code.',
    nextMove: 'Tweak the standups, and judge the harness by one recurring flow that finishes without rescue.',
    tags: ['agents', 'platform'],
    timeline: [
      { date: '2026-10-08', text: 'Flow briefing written by the lead, a needs-you list, todos completed with an answer, and an Ops report from the real machine.' },
      { date: '2026-10-07', text: 'Fact check by code, the connector tool, in-place note editing and cheaper prompts.' },
      { date: '2026-10-06', text: 'Flows with names, reports, Resume and the verifier’s verdict; several tool calls per reply; connectors through the Claude CLI.' },
      { date: '2026-09-30', text: 'Leaders design flows, Argus verifies them, and cancelling stops a running step.' },
      { date: '2026-09-29', text: 'Governance, watchdog, team reviews, team templates and stale-work detection.' },
      { date: '2026-09-28', text: 'Work handed between agents, reporting lines, goals, an MCP server, board controls and the Terminal.' },
      { date: '2026-09-26', text: 'Approvals unblock the agent, with a per-agent allowlist.' },
    ],
  },
  {
    id: 'sound-lab',
    name: 'Sound Lab',
    sectionId: 'lab',
    status: 'active',
    tagline: 'Make sounds, judge them by ear, ship a pack.',
    what: 'Synthesized drums and melodic one-shots that you keep, maybe or skip, built into producer packs with a draft license. The first pack is Salient.',
    lastMove: 'Built Salient (71 sounds) and ran its launch prep through the agent team.',
    nextMove: 'Finish the Salient launch (license brackets, legal review, cover art, price, uploads).',
    extraPlans: ['More kinds and variety from my listening feedback; it can be fine-tuned indefinitely'],
    tags: ['music', 'sound', 'packs'],
    timeline: [
      { date: '2026-10-07', text: 'Argus reviewed the launch notes; the pack name Salient was settled.' },
      { date: '2026-10-06', text: 'Pack builder, tournament-style Rounds, Perc and Strings tabs, and the Salient pack (71 sounds, zip with a draft license).' },
      { date: '2026-10-06', text: 'Sound engine v1 to v3 and the pack zip export (24-bit WAV).' },
    ],
  },
  {
    id: 'beat-store',
    name: 'ISΛRK Beat Store',
    sectionId: 'lab',
    status: 'active',
    tagline: 'The public beat store.',
    what: 'The sales counterpart to the private Beat DB: preview a beat, pick a license, check out. Checkout is a mock storefront for now: nothing is sold and licensing is not set up.',
    lastMove: 'Removed the invented prices, play counts and license tiers from the three real tracks.',
    nextMove: 'Set up real licensing before anything is sold.',
    tags: ['music', 'web', 'store'],
    timeline: [
      { date: '2026-10-08', text: 'Invented license prices, BPM, key and play counts removed.' },
      { date: '2026-05-28', text: 'The real tracks added to the store.' },
      { date: '2026-05-26', text: 'Store modal created.' },
    ],
  },
  {
    id: 'desktop-hud',
    name: 'Desktop Sensor & HUD',
    sectionId: 'ops',
    status: 'paused',
    tagline: 'The OS that notices what I am doing.',
    what: 'A device-tagged desktop sensor and timeline, a learning loop inside the agents’ dreaming, and a planned always-on Tauri HUD with a Rust sensor.',
    lastMove: 'Built the multi-device sensor and timeline and the learning loop (it counts exact repeats, not fuzzy similarity).',
    nextMove: 'The Tauri skeleton, Rust sensor and push-to-talk, once I am at my main PC.',
    extraPlans: ['Verify the Windows sensor calls on a real machine'],
    tags: ['desktop', 'hud', 'agents'],
    timeline: [
      { date: '2026-09-29', text: 'Multi-device desktop sensor and timeline, and the learning loop inside dreaming; the HUD plan was written down.' },
    ],
  },
  {
    id: 'agent-memory',
    name: 'Agent Memory (Hindsight)',
    sectionId: 'workbench',
    status: 'active',
    tagline: 'What the agents learn and remember.',
    what: 'Optional long-term memory for the agents (Hindsight), supervised on the server, retaining real conversations only.',
    lastMove: 'Hindsight runs under the server supervisor and keeps only real conversations.',
    nextMove: 'A knowledge graph on top (still open on the roadmap).',
    tags: ['agents', 'memory'],
    timeline: [
      { date: '2026-09-29', text: 'Hindsight supervised on Windows; only real conversations are retained.' },
      { date: '2026-09-26', text: 'Hindsight in the Codespace through an optional bridge.' },
    ],
  },
  {
    id: 'basespace',
    name: 'BaseSpace',
    sectionId: 'projects',
    status: 'active',
    tagline: 'The dashboard everything plugs into.',
    what: 'The OS dashboard itself: design system, notes vault, calendar, goals, the constellation, the Workbench and the UX review.',
    lastMove: 'First browser review of the whole app: a needs-you bell, a reordered flow page, markdown everywhere, a real Ops page, and the sample data removed.',
    nextMove: 'Work through the UX report (docs/ux-report).',
    tags: ['platform', 'ux'],
    timeline: [
      { date: '2026-10-08', text: 'First browser review of the app; Ops rebuilt on real data; sample todos, events, projects’ progress and previews removed.' },
      { date: '2026-09-17', text: 'Design system phases 0 to 6, and a long run of phone calendar fixes.' },
    ],
  },
]

export function projectsForSection(sectionId: SectionId): Project[] {
  return PROJECTS.filter((p) => p.sectionId === sectionId)
}

export function projectById(id: string): Project | undefined {
  return PROJECTS.find((p) => p.id === id)
}
