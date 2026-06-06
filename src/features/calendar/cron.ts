import type { CronSchedule } from '@/data/calendar'
import { hhmm } from './util'

export const CRON_STATUS_COLOR: Record<'ok' | 'running' | 'warn', string> = {
  ok: '#46d369',
  running: '#36e0c8',
  warn: '#f0a020',
}

/** Human-readable schedule label, e.g. "08:00 daily", "every 2h", "every 15m". */
export function cronScheduleLabel(s: CronSchedule): string {
  if (s.type === 'daily') return `${hhmm(s.hour)} daily`
  if (s.type === 'everyHours') return s.n === 1 ? 'hourly' : `every ${s.n}h`
  return s.n === 1 ? 'every minute' : `every ${s.n}m`
}

/**
 * Next run timestamp for a schedule. Daily runs roll to tomorrow once today's
 * time has passed; interval schedules are anchored to local midnight so the
 * computed slots stay stable and realistic.
 */
export function cronNextRunMs(s: CronSchedule, from = Date.now()): number {
  const base = new Date(from)
  if (s.type === 'daily') {
    const d = new Date(base)
    d.setHours(Math.floor(s.hour), Math.round((s.hour % 1) * 60), 0, 0)
    if (d.getTime() <= from) d.setDate(d.getDate() + 1)
    return d.getTime()
  }
  const stepMs = s.type === 'everyHours' ? s.n * 3_600_000 : s.n * 60_000
  const midnight = new Date(base)
  midnight.setHours(0, 0, 0, 0)
  const elapsed = from - midnight.getTime()
  const k = Math.floor(elapsed / stepMs) + 1
  return midnight.getTime() + k * stepMs
}
