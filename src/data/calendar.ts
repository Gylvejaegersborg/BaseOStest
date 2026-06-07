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
  // minutes before start to fire a reminder (default 10)
  reminderMinutes?: number
}

export const KIND_COLOR: Record<Appt['kind'], string> = {
  music: '#e0408a',
  tech: '#36e0c8',
  life: '#46d369',
  agent: '#f0a020',
  meeting: '#9b7bff',
}

export const APPOINTMENTS: Appt[] = [
  { id: 'a1', title: 'Master new single', dayOffset: 0, start: 9, end: 10.5, kind: 'music', location: 'Studio', notes: 'Final loudness pass before upload routine picks it up.', reminderMinutes: 15 },
  { id: 'a2', title: 'Agent standup', dayOffset: 0, start: 11, end: 11.5, kind: 'agent', location: 'Meeting Room', notes: 'Claude / Hemera / Nyx sync.', reminderMinutes: 5 },
  { id: 'a3', title: 'Homeserver maintenance', dayOffset: 0, start: 14, end: 15, kind: 'tech', notes: 'Apply container updates, check disks.' },
  { id: 'a4', title: 'Gym', dayOffset: 0, start: 18, end: 19, kind: 'life', reminderMinutes: 30 },
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

// ─── Tasks ──────────────────────────────────────────────────────────────────

export type TaskPriority = 'low' | 'med' | 'high'
export type TaskStatus = 'todo' | 'doing' | 'done'

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  kind?: Appt['kind']
  // due day offset from "today" (optional). dueTime = local 24h hour (optional)
  dayOffset?: number
  dueTime?: number
  notes?: string
  // minutes before dueTime to fire a reminder (default 15)
  reminderMinutes?: number
  subtasks?: Subtask[]
}

export const PRIORITY_COLOR: Record<TaskPriority, string> = {
  high: '#ff5566',
  med: '#f0a020',
  low: '#46d369',
}

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: 'High',
  med: 'Medium',
  low: 'Low',
}

export const TASKS: Task[] = [
  {
    id: 't1',
    title: 'Approve cover art for single',
    status: 'todo',
    priority: 'high',
    kind: 'music',
    dayOffset: 0,
    dueTime: 12,
    reminderMinutes: 20,
    notes: 'Pick between the two Midjourney variants Hemera generated.',
    subtasks: [
      { id: 's1', title: 'Compare v3 vs v4', done: true },
      { id: 's2', title: 'Check 1:1 + 16:9 crops', done: false },
      { id: 's3', title: 'Send final to distributor', done: false },
    ],
  },
  { id: 't2', title: 'Reply to sync licensing email', status: 'todo', priority: 'high', kind: 'meeting', dayOffset: 0, dueTime: 16, reminderMinutes: 30 },
  { id: 't3', title: 'Pay homeserver electricity bill', status: 'doing', priority: 'med', kind: 'life', dayOffset: 0 },
  { id: 't4', title: 'Backlog: rewrite upload queue retry logic', status: 'todo', priority: 'med', kind: 'tech', dayOffset: 2 },
  { id: 't5', title: 'Draft newsletter #14', status: 'todo', priority: 'low', kind: 'music', dayOffset: 3, dueTime: 10 },
  { id: 't6', title: 'Renew domain artist.app', status: 'todo', priority: 'high', kind: 'tech', dayOffset: -1, notes: 'Overdue — auto-renew failed, card expired.' },
  { id: 't7', title: 'Stretch + foam roll', status: 'done', priority: 'low', kind: 'life', dayOffset: 0 },
]

// ─── AI Cron jobs ─────────────────────────────────────────────────────────────

export interface CronRun {
  time: string
  status: 'ok' | 'warn' | 'fail'
  duration: string
}

export type CronSchedule =
  | { type: 'daily'; hour: number } // hour as fractional 24h (8.5 = 08:30)
  | { type: 'everyHours'; n: number }
  | { type: 'everyMinutes'; n: number }

export interface CronJob {
  id: string
  name: string
  owner: 'Claude' | 'Hemera' | 'Nyx'
  schedule: CronSchedule
  lastRun: string
  status: 'ok' | 'running' | 'warn'
  description?: string
  avgRuntime?: string
  successRate?: number // 0–100
  recentRuns?: CronRun[]
  outputs?: string[]
}

export const CRON_JOBS: CronJob[] = [
  {
    id: 'c1',
    name: 'Daily content plan',
    owner: 'Hemera',
    schedule: { type: 'daily', hour: 8 },
    lastRun: 'today 08:00',
    status: 'ok',
    description: 'Drafts the day’s posting plan across YouTube, TikTok and IG from the release calendar and engagement data.',
    avgRuntime: '42s',
    successRate: 98,
    recentRuns: [
      { time: 'today 08:00', status: 'ok', duration: '38s' },
      { time: 'yday 08:00', status: 'ok', duration: '41s' },
      { time: '2d ago 08:00', status: 'warn', duration: '1m04s' },
    ],
    outputs: ['3 posts scheduled', '1 short queued for review', 'Hook A/B test proposed'],
  },
  {
    id: 'c2',
    name: 'Upload queue flush',
    owner: 'Nyx',
    schedule: { type: 'everyHours', n: 2 },
    lastRun: '14m ago',
    status: 'running',
    description: 'Pushes rendered exports from the vault to the distributor and verifies checksums + metadata.',
    avgRuntime: '3m12s',
    successRate: 91,
    recentRuns: [
      { time: '14m ago', status: 'ok', duration: '2m51s' },
      { time: '2h ago', status: 'ok', duration: '3m20s' },
      { time: '4h ago', status: 'fail', duration: '0m18s' },
    ],
    outputs: ['2 files uploaded', 'Checksums verified', '1 retry scheduled'],
  },
  {
    id: 'c3',
    name: 'Vault backup',
    owner: 'Claude',
    schedule: { type: 'daily', hour: 3 },
    lastRun: 'today 03:00',
    status: 'ok',
    description: 'Encrypted snapshot of the project vault to cold storage with rolling 30-day retention.',
    avgRuntime: '6m40s',
    successRate: 100,
    recentRuns: [
      { time: 'today 03:00', status: 'ok', duration: '6m31s' },
      { time: 'yday 03:00', status: 'ok', duration: '6m48s' },
      { time: '2d ago 03:00', status: 'ok', duration: '6m22s' },
    ],
    outputs: ['Snapshot 0612 written', '184 GB · 0 errors', 'Oldest snapshot pruned'],
  },
  {
    id: 'c4',
    name: 'Beat import scan',
    owner: 'Claude',
    schedule: { type: 'everyHours', n: 6 },
    lastRun: '3h ago',
    status: 'ok',
    description: 'Scans the inbox for new stems/loops, tags BPM + key, and files them into the Beat DB.',
    avgRuntime: '54s',
    successRate: 96,
    recentRuns: [
      { time: '3h ago', status: 'ok', duration: '49s' },
      { time: '9h ago', status: 'ok', duration: '58s' },
      { time: '15h ago', status: 'ok', duration: '51s' },
    ],
    outputs: ['7 new loops indexed', 'BPM/key auto-tagged', '0 duplicates'],
  },
  {
    id: 'c5',
    name: 'Engagement digest',
    owner: 'Hemera',
    schedule: { type: 'daily', hour: 20 },
    lastRun: 'yesterday 20:00',
    status: 'warn',
    description: 'Summarises comments, DMs and stats across platforms; flags anything that needs a human reply.',
    avgRuntime: '1m30s',
    successRate: 84,
    recentRuns: [
      { time: 'yday 20:00', status: 'warn', duration: '2m11s' },
      { time: '2d ago 20:00', status: 'ok', duration: '1m22s' },
      { time: '3d ago 20:00', status: 'ok', duration: '1m29s' },
    ],
    outputs: ['IG API rate-limited', '12 comments triaged', '2 flagged for reply'],
  },
  {
    id: 'c6',
    name: 'Sub-agent health check',
    owner: 'Nyx',
    schedule: { type: 'everyMinutes', n: 15 },
    lastRun: '6m ago',
    status: 'ok',
    description: 'Pings every running sub-agent, restarts stalled workers and reports latency to Ops.',
    avgRuntime: '8s',
    successRate: 99,
    recentRuns: [
      { time: '6m ago', status: 'ok', duration: '7s' },
      { time: '21m ago', status: 'ok', duration: '9s' },
      { time: '36m ago', status: 'ok', duration: '8s' },
    ],
    outputs: ['4/4 agents healthy', 'Avg latency 120ms', '0 restarts'],
  },
]

// ─── Standalone reminders ─────────────────────────────────────────────────────
// Lightweight "ping me at this time" entries, separate from appointments/tasks.

export const REMINDER_COLOR = '#9b7bff'

export interface Reminder {
  id: string
  title: string
  dayOffset: number
  time: number // fractional 24h hour — the moment to ping
  notes?: string
  done?: boolean
}

export const REMINDERS: Reminder[] = [
  { id: 'r1', title: 'Stand up & stretch', dayOffset: 0, time: 15 },
  { id: 'r2', title: 'Wind down — screens off', dayOffset: 0, time: 22 },
]
