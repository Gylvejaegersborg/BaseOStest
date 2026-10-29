export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly'

export interface Recurrence {
  freq: RecurrenceFreq
  /** Day this recurrence stops after (inclusive), as a dayOffset from today —
   *  same unit as `dayOffset` everywhere else in this file. Open-ended (repeats
   *  forever) when unset. */
  until?: number
}

export const RECURRENCE_LABEL: Record<RecurrenceFreq, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

export interface Appt {
  id: string
  title: string
  // day offset from "today" (0 = today), local hours in 24h — the first/anchor
  // occurrence; `recurrence` (if set) repeats it forward from here.
  dayOffset: number
  start: number // e.g. 9.5 = 09:30
  end: number
  kind: 'music' | 'tech' | 'life' | 'agent' | 'meeting'
  location?: string
  notes?: string
  // minutes before start to fire a reminder (default 10)
  reminderMinutes?: number
  recurrence?: Recurrence
}

export const KIND_COLOR: Record<Appt['kind'], string> = {
  music: '#e0408a',
  tech: '#36e0c8',
  life: '#46d369',
  agent: '#f0a020',
  meeting: '#9b7bff',
}

// No sample events: every event in BaseSpace is a real one (the sample set was removed; see SEED_APPTS_PURGED_KEY in CalendarContext).
export const APPOINTMENTS: Appt[] = []

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
  recurrence?: Recurrence
  /** Send a notification (reminderMinutes before dueTime). Defaults to on
   *  when there's a due time. Reminders are simply todos with this on. */
  notify?: boolean
  /** Where a todo comes from. Derived ones (project next moves, dated note
   *  checkboxes) are read-only here and complete back at their source. */
  source?: 'manual' | 'project' | 'note'
  sourceRef?: { projectId?: string; entryId?: string; noteId?: string; line?: number }
  /** What this todo serves (see features/goals): a project and/or a goal.
   *  Derived next-move todos serve their project through sourceRef. */
  projectId?: string
  goalId?: string
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

// No sample todos: every todo in BaseSpace is a real one (the sample set was removed; see SEED_TODOS_PURGED_KEY in CalendarContext).
export const TASKS: Task[] = []

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
  /** The agent that runs it (any agent name). */
  owner: string
  schedule: CronSchedule
  /** Show its runs in the calendar's time grid. Defaults to on for daily
   *  and ≥6-hourly jobs, off for frequent ones (they'd fill the grid). */
  showInCalendar?: boolean
  /** Team this job belongs to (e.g. its standup), when it's a team job. */
  team?: string
  /** What a team job serves — its run is focused on this goal or project
   *  (agent-os: the chair gets the goal chain; the minutes link back). */
  focus?: { kind: 'goal' | 'project'; id: string }
  lastRun: string
  status: 'ok' | 'running' | 'warn'
  description?: string
  avgRuntime?: string
  successRate?: number // 0–100
  recentRuns?: CronRun[]
  outputs?: string[]
}

// The jobs are real ideas that are not built out yet. The run history (last run, success rate, outputs) that used to be here was
// sample data and is gone: a job shows "never" until something has actually run it.
export const CRON_JOBS: CronJob[] = [
  {
    id: 'c1',
    name: 'Daily content plan',
    owner: 'Hemera',
    schedule: { type: 'daily', hour: 8 },
    lastRun: 'never',
    status: 'ok',
    description: 'Drafts the day’s posting plan across YouTube, TikTok and IG from the release calendar and engagement data.',
  },
  {
    id: 'c2',
    name: 'Upload queue flush',
    owner: 'Nyx',
    schedule: { type: 'everyHours', n: 2 },
    lastRun: 'never',
    status: 'ok',
    description: 'Pushes rendered exports from the vault to the distributor and verifies checksums + metadata.',
  },
  {
    id: 'c3',
    name: 'Vault backup',
    owner: 'Claude',
    schedule: { type: 'daily', hour: 3 },
    lastRun: 'never',
    status: 'ok',
    description: 'Encrypted snapshot of the project vault to cold storage with rolling 30-day retention.',
  },
  {
    id: 'c4',
    name: 'Beat import scan',
    owner: 'Claude',
    schedule: { type: 'everyHours', n: 6 },
    lastRun: 'never',
    status: 'ok',
    description: 'Scans the inbox for new stems/loops, tags BPM + key, and files them into the Beat DB.',
  },
  {
    id: 'c5',
    name: 'Engagement digest',
    owner: 'Hemera',
    schedule: { type: 'daily', hour: 20 },
    lastRun: 'never',
    status: 'ok',
    description: 'Summarises comments, DMs and stats across platforms; flags anything that needs a human reply.',
  },
  {
    id: 'c6',
    name: 'Sub-agent health check',
    owner: 'Nyx',
    schedule: { type: 'everyMinutes', n: 15 },
    lastRun: 'never',
    status: 'ok',
    description: 'Pings every running sub-agent, restarts stalled workers and reports latency to Ops.',
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
  recurrence?: Recurrence
}

export const REMINDERS: Reminder[] = []

/** Whether a cron's runs appear in the time grid (see showInCalendar). */
export function cronVisible(c: CronJob): boolean {
  if (c.showInCalendar != null) return c.showInCalendar
  return c.schedule.type === 'daily'
}
