import {
  APPOINTMENTS,
  CRON_JOBS,
  KIND_COLOR,
  PRIORITY_COLOR,
  REMINDERS,
  REMINDER_COLOR,
  TASKS,
  type Appt,
  type CronJob,
  type Reminder,
  type Task,
} from '@/data/calendar'
import { apptDate, apptStartMs, offsetDate, reminderMs, taskDueMs } from './util'
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
export const loadReminders = (): Reminder[] => loadJSON(REMINDERS_KEY, REMINDERS)
export const loadCrons = (): CronJob[] => loadJSON(CRONS_KEY, CRON_JOBS)

export interface AgendaSources {
  appts: Appt[]
  tasks: Task[]
  reminders: Reminder[]
  crons: CronJob[]
}

export interface AgendaItem {
  id: string
  source: 'appt' | 'task' | 'reminder' | 'cron'
  title: string
  color: string
  when: number // ms timestamp of the next occurrence
  date: Date
  hour: number // fractional hour, for display
  endHour?: number // appts only
  raw: Appt | Task | Reminder | CronJob
}

/**
 * Merge appointments, timed tasks, standalone reminders and cron jobs into a
 * single time-ordered agenda of upcoming items. Tasks without a due day+time are
 * excluded (nothing to schedule); done tasks/reminders are skipped.
 */
export function buildAgenda(src: AgendaSources, limit = 6, from = Date.now()): AgendaItem[] {
  const items: AgendaItem[] = []

  for (const a of src.appts) {
    items.push({
      id: `appt:${a.id}`,
      source: 'appt',
      title: a.title,
      color: KIND_COLOR[a.kind],
      when: apptStartMs(a),
      date: apptDate(a),
      hour: a.start,
      endHour: a.end,
      raw: a,
    })
  }

  for (const t of src.tasks) {
    if (t.status === 'done') continue
    const when = taskDueMs(t)
    if (when == null || t.dueTime == null || t.dayOffset == null) continue
    items.push({
      id: `task:${t.id}`,
      source: 'task',
      title: t.title,
      color: PRIORITY_COLOR[t.priority],
      when,
      date: offsetDate(t.dayOffset),
      hour: t.dueTime,
      raw: t,
    })
  }

  for (const r of src.reminders) {
    if (r.done) continue
    items.push({
      id: `reminder:${r.id}`,
      source: 'reminder',
      title: r.title,
      color: REMINDER_COLOR,
      when: reminderMs(r),
      date: offsetDate(r.dayOffset),
      hour: r.time,
      raw: r,
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
