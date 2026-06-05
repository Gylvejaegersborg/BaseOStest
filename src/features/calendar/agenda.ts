import {
  APPOINTMENTS,
  KIND_COLOR,
  PRIORITY_COLOR,
  TASKS,
  type Appt,
  type Task,
} from '@/data/calendar'
import { apptDate, apptStartMs, offsetDate, taskDueMs } from './util'

export const APPTS_KEY = 'os:calendar:appts'
export const TASKS_KEY = 'os:calendar:tasks'

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

export interface AgendaItem {
  id: string
  source: 'appt' | 'task'
  title: string
  color: string
  when: number // ms timestamp of start (appt) or due (task)
  date: Date
  hour: number // fractional hour, for display
  endHour?: number // appts only
  raw: Appt | Task
}

/**
 * Merge appointments and timed tasks into a single time-ordered agenda of
 * upcoming items. Tasks without a due day+time are excluded (nothing to schedule).
 */
export function buildAgenda(appts: Appt[], tasks: Task[], limit = 5, from = Date.now()): AgendaItem[] {
  const items: AgendaItem[] = []

  for (const a of appts) {
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

  for (const t of tasks) {
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

  return items
    .filter((i) => i.when >= from)
    .sort((a, b) => a.when - b.when)
    .slice(0, limit)
}
