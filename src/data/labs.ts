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
    id: 'beat-store',
    name: 'ISΛRK Beat Store',
    kind: 'Storefront',
    status: 'live',
    description: 'Public beat store — preview, pick a license tier and check out. The sales counterpart to the private Beat DB.',
    stack: ['React', 'Web Audio', 'Tailwind'],
  },
  {
    id: 'artist-web',
    name: 'Artist Webpage',
    kind: 'Public site',
    status: 'live',
    description: 'The public ISΛRK site — releases grid, link hub and bio.',
    stack: ['React', 'Vite', 'Tailwind'],
    url: 'https://soundcloud.com/itsisark',
  },
  {
    id: 'beat-db',
    name: 'Beat DB',
    kind: 'Internal tool',
    status: 'staging',
    description:
      'The private artist library — beats, lyrics, songs, artwork, videos, stems and notes in one searchable database with file previews and an always-on player. A standalone app the OS just windows into.',
    stack: ['React', 'Web Audio', 'Tailwind'],
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
