export interface LabModule {
  id: string
  name: string
  kind: string
  status: 'live' | 'staging' | 'local'
  description: string
  stack: string[]
  url?: string
}

export const LAB_MODULES: LabModule[] = [
  {
    id: 'artist-web',
    name: 'Artist Webpage',
    kind: 'Public site',
    status: 'live',
    description: 'The public isark site — releases grid, link hub and bio.',
    stack: ['React', 'Vite', 'Tailwind'],
    url: 'https://soundcloud.com/itsisark',
  },
  {
    id: 'beat-db',
    name: 'Beat Database UI',
    kind: 'Internal tool',
    status: 'staging',
    description: 'Searchable private beat library with waveform previews.',
    stack: ['React', 'SQLite', 'WaveSurfer'],
  },
  {
    id: 'discord-dash',
    name: 'Discord Bot Dashboard',
    kind: 'Ops panel',
    status: 'local',
    description: 'Control panel for the agent Discord bridge + approvals.',
    stack: ['Node', 'discord.js'],
  },
  {
    id: 'copyparty-ui',
    name: 'Copyparty Drop',
    kind: 'File server',
    status: 'live',
    description: 'Self-hosted upload + share frontend on the homeserver.',
    stack: ['copyparty', 'nginx'],
  },
  {
    id: 'shortcuts-lab',
    name: 'iOS Shortcuts Lab',
    kind: 'Mobile bridge',
    status: 'local',
    description: 'Sandbox for testing phone-triggered OS actions.',
    stack: ['Shortcuts', 'Webhook'],
  },
  {
    id: 'render-queue',
    name: 'Render Queue Monitor',
    kind: 'Experiment',
    status: 'staging',
    description: 'Visualises the master → upload pipeline in real time.',
    stack: ['React', 'WebSocket'],
  },
]
