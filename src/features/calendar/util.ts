import { addDays, addMonths, differenceInCalendarDays, isSameDay, startOfDay } from 'date-fns'
import type { Appt, Recurrence, Reminder, Task } from '@/data/calendar'

// Captured once at module load. Appt/Task dayOffsets are relative to this day.
export const TODAY = new Date()
export const DAY_BASE = startOfDay(TODAY)

export function offsetDate(dayOffset: number): Date {
  return addDays(DAY_BASE, dayOffset)
}

export function apptDate(a: { dayOffset: number }): Date {
  return offsetDate(a.dayOffset)
}

/** Day offset (relative to today) for an arbitrary date — inverse of offsetDate. */
export function dayOffsetOf(d: Date): number {
  return differenceInCalendarDays(d, DAY_BASE)
}

/** Returns a new Date on `d` set to the given fractional hour (14.5 → 14:30). */
export function atHour(d: Date, h: number): Date {
  const x = new Date(d)
  x.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0)
  return x
}

export function hhmm(h: number): string {
  const hr = Math.floor(h)
  const mn = Math.round((h - hr) * 60)
  return `${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`
}

/** Parse an "HH:MM" string (as produced by <input type="time">) into a
 *  fractional hour (14:30 → 14.5, 14:37 → 14.616…). Returns null if invalid. */
export function parseHM(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim())
  if (!m) return null
  const hr = Number(m[1])
  const mn = Number(m[2])
  if (hr > 23 || mn > 59) return null
  return hr + mn / 60
}

/** Does an item anchored on `anchorDayOffset` (with an optional recurrence)
 *  occur on `targetDay`? `targetDay` must be a start-of-day Date (as every
 *  call site already has via `offsetDate`/`day` props, not a live "now"). */
export function occursOnDay(anchorDayOffset: number, recurrence: Recurrence | undefined, targetDay: Date): boolean {
  const anchor = offsetDate(anchorDayOffset)
  if (targetDay < anchor) return false
  if (!recurrence) return isSameDay(anchor, targetDay)
  if (recurrence.until != null && targetDay > offsetDate(recurrence.until)) return false
  if (recurrence.freq === 'daily') return true
  if (recurrence.freq === 'weekly') return differenceInCalendarDays(targetDay, anchor) % 7 === 0
  return targetDay.getDate() === anchor.getDate()
}

export function apptOccursOn(a: Appt, day: Date): boolean {
  return occursOnDay(a.dayOffset, a.recurrence, day)
}

export function taskOccursOn(t: Task, day: Date): boolean {
  return t.dayOffset != null && occursOnDay(t.dayOffset, t.recurrence, day)
}

export function reminderOccursOn(r: Reminder, day: Date): boolean {
  return occursOnDay(r.dayOffset, r.recurrence, day)
}

/** Next timestamp (ms) an anchor+hour+recurrence occurs at or after `from`.
 *  Non-recurring items just resolve to their single occurrence regardless of
 *  `from` — callers that need "only if upcoming" already filter on that
 *  separately. Bounded so a stale/malformed recurrence can't loop forever. */
function nextOccurrenceMs(
  anchorDayOffset: number,
  hour: number,
  recurrence: Recurrence | undefined,
  from: number,
): number | null {
  if (!recurrence) return atHour(offsetDate(anchorDayOffset), hour).getTime()
  const untilMs = recurrence.until != null ? atHour(offsetDate(recurrence.until), 23.99).getTime() : Infinity
  let d = offsetDate(anchorDayOffset)
  for (let i = 0; i < 400; i++) {
    const ms = atHour(d, hour).getTime()
    if (ms >= from) return ms <= untilMs ? ms : null
    d = recurrence.freq === 'daily' ? addDays(d, 1) : recurrence.freq === 'weekly' ? addDays(d, 7) : addMonths(d, 1)
  }
  return null
}

export function apptNextMs(a: Appt, from = Date.now()): number | null {
  return nextOccurrenceMs(a.dayOffset, a.start, a.recurrence, from)
}

export function taskNextMs(t: Task, from = Date.now()): number | null {
  if (t.dayOffset == null || t.dueTime == null) return null
  return nextOccurrenceMs(t.dayOffset, t.dueTime, t.recurrence, from)
}

export function reminderNextMs(r: Reminder, from = Date.now()): number | null {
  return nextOccurrenceMs(r.dayOffset, r.time, r.recurrence, from)
}

export function apptStartMs(a: Appt): number {
  return atHour(offsetDate(a.dayOffset), a.start).getTime()
}

/** Absolute due time for a task, or null if it has no day/time. */
export function taskDueMs(t: Task): number | null {
  if (t.dayOffset == null || t.dueTime == null) return null
  return atHour(offsetDate(t.dayOffset), t.dueTime).getTime()
}

/** Absolute ping time for a standalone reminder. */
export function reminderMs(r: Reminder): number {
  return atHour(offsetDate(r.dayOffset), r.time).getTime()
}

/** "in 12 min", "in 2h 5m", "now" — for a future timestamp relative to `from`. */
export function untilLabel(target: number, from = Date.now()): string {
  const s = Math.round((target - from) / 1000)
  if (s <= 0) return 'now'
  if (s < 90) return `in ${Math.max(1, Math.round(s / 60))} min`
  const m = Math.round(s / 60)
  if (m < 60) return `in ${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem ? `in ${h}h ${rem}m` : `in ${h}h`
}
