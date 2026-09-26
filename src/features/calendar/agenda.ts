import {
  APPOINTMENTS,
  CRON_JOBS,
  KIND_COLOR,
  PRIORITY_COLOR,
  TASKS,
  type Appt,
  type CronJob,
  type Task,
} from '@/data/calendar'
import { apptNextMs, taskNextMs } from './util'
import { CRON_STATUS_COLOR, cronNextRunMs } from './cron'

export const APPTS_KEY = 'os:calendar:appts'
export const TASKS_KEY = 'os:calendar:tasks'
export const REMINDERS_KEY = 'os:calendar:reminders'
export const CRONS_KEY = 'os:calendar:crons'

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export const loadAppts = (): Appt[] => loadJSON(APPTS_KEY, APPOINTMENTS)
export const loadTasks = (): Task[] => loadJSON(TASKS_KEY, TASKS)
export const loadCrons = (): CronJob[] => loadJSON(CRONS_KEY, CRON_JOBS)

export interface AgendaSources {
  appts: Appt[]
  tasks: Task[]
  crons: CronJob[]
}

export interface AgendaItem {
  id: string
  source: 'appt' | 'task' | 'cron'
  title: string
  color: string
  when: number // ms timestamp of the next occurrence
  date: Date
  hour: number // fractional hour, for display
  endHour?: number // appts only
  raw: Appt | Task | CronJob
}

/**
 * Merge appointments, timed todos and cron jobs into a
 * single time-ordered agenda of upcoming items. Tasks without a due day+time are
 * excluded (nothing to schedule); done todos are skipped.
 */
export function buildAgenda(src: AgendaSources, limit = 6, from = Date.now()): AgendaItem[] {
  const items: AgendaItem[] = []

  for (const a of src.appts) {
    // Recurring items resolve to their next occurrence on/after `from`
    // rather than their original anchor date — that's the whole point of a
    // recurring appt still showing up in "what's next" after its first run.
    const when = apptNextMs(a, from)
    if (when == null) continue
    items.push({
      id: `appt:${a.id}`,
      source: 'appt',
      title: a.title,
      color: KIND_COLOR[a.kind],
      when,
      date: new Date(when),
      hour: a.start,
      endHour: a.end,
      raw: a,
    })
  }

  for (const t of src.tasks) {
    if (t.status === 'done') continue
    const when = taskNextMs(t, from)
    if (when == null || t.dueTime == null) continue
    items.push({
      id: `task:${t.id}`,
      source: 'task',
      title: t.title,
      color: PRIORITY_COLOR[t.priority],
      when,
      date: new Date(when),
      hour: t.dueTime,
      raw: t,
    })
  }

  for (const c of src.crons) {
    const when = cronNextRunMs(c.schedule, from)
    const d = new Date(when)
    items.push({
      id: `cron:${c.id}`,
      source: 'cron',
      title: c.name,
      color: CRON_STATUS_COLOR[c.status],
      when,
      date: d,
      hour: d.getHours() + d.getMinutes() / 60,
      raw: c,
    })
  }

  return items
    .filter((i) => i.when >= from)
    .sort((a, b) => a.when - b.when)
    .slice(0, limit)
}
