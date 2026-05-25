export interface Appt {
  id: string
  title: string
  // day offset from "today" (0 = today), local hours in 24h
  dayOffset: number
  start: number // e.g. 9.5 = 09:30
  end: number
  kind: 'music' | 'tech' | 'life' | 'agent' | 'meeting'
  location?: string
  notes?: string
}

export const KIND_COLOR: Record<Appt['kind'], string> = {
  music: '#e0408a',
  tech: '#36e0c8',
  life: '#46d369',
  agent: '#f0a020',
  meeting: '#9b7bff',
}

export const APPOINTMENTS: Appt[] = [
  { id: 'a1', title: 'Master new single', dayOffset: 0, start: 9, end: 10.5, kind: 'music', location: 'Studio', notes: 'Final loudness pass before upload routine picks it up.' },
  { id: 'a2', title: 'Agent standup', dayOffset: 0, start: 11, end: 11.5, kind: 'agent', location: 'Meeting Room', notes: 'Claude / Hemera / Nyx sync.' },
  { id: 'a3', title: 'Homeserver maintenance', dayOffset: 0, start: 14, end: 15, kind: 'tech', notes: 'Apply container updates, check disks.' },
  { id: 'a4', title: 'Gym', dayOffset: 0, start: 18, end: 19, kind: 'life' },
  { id: 'a5', title: 'Beat DB review', dayOffset: 1, start: 10, end: 11, kind: 'tech', notes: 'Triage smart-playlist ideas.' },
  { id: 'a6', title: 'Release planning w/ Hemera', dayOffset: 1, start: 13, end: 14, kind: 'meeting', location: 'Chat' },
  { id: 'a7', title: 'Write lyrics', dayOffset: 1, start: 16, end: 17.5, kind: 'music' },
  { id: 'a8', title: 'Discord bot deploy', dayOffset: 2, start: 9.5, end: 10.5, kind: 'tech' },
  { id: 'a9', title: 'Cook + reset', dayOffset: 2, start: 19, end: 20, kind: 'life' },
  { id: 'a10', title: 'Artist site A/B test', dayOffset: 3, start: 11, end: 12, kind: 'tech', location: 'Lab' },
  { id: 'a11', title: 'Mix session', dayOffset: 3, start: 15, end: 17, kind: 'music', location: 'Studio' },
  { id: 'a12', title: 'Weekly review', dayOffset: 4, start: 16, end: 17, kind: 'meeting', notes: 'Look back at all project moves.' },
  { id: 'a13', title: 'Long walk', dayOffset: -1, start: 8, end: 9, kind: 'life' },
  { id: 'a14', title: 'Vault cleanup', dayOffset: 5, start: 10, end: 11, kind: 'tech' },
]

export interface CronJob {
  id: string
  name: string
  owner: 'Claude' | 'Hemera' | 'Nyx'
  schedule: string
  lastRun: string
  status: 'ok' | 'running' | 'warn'
}

export const CRON_JOBS: CronJob[] = [
  { id: 'c1', name: 'Daily content plan', owner: 'Hemera', schedule: '08:00 daily', lastRun: 'today 08:00', status: 'ok' },
  { id: 'c2', name: 'Upload queue flush', owner: 'Nyx', schedule: 'every 2h', lastRun: '14m ago', status: 'running' },
  { id: 'c3', name: 'Vault backup', owner: 'Claude', schedule: '03:00 daily', lastRun: 'today 03:00', status: 'ok' },
  { id: 'c4', name: 'Beat import scan', owner: 'Claude', schedule: 'every 6h', lastRun: '3h ago', status: 'ok' },
  { id: 'c5', name: 'Engagement digest', owner: 'Hemera', schedule: '20:00 daily', lastRun: 'yesterday 20:00', status: 'warn' },
  { id: 'c6', name: 'Sub-agent health check', owner: 'Nyx', schedule: 'every 15m', lastRun: '6m ago', status: 'ok' },
]
