import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Appt, Reminder, Task } from '@/data/calendar'
import { KIND_COLOR, PRIORITY_COLOR, REMINDER_COLOR } from '@/data/calendar'
import { apptStartMs, hhmm, reminderMs, taskDueMs, untilLabel } from './util'
import {
  getPermission,
  pushNotification,
  requestPermission as requestNotifyPermission,
  type NotifyPermission,
} from './notifications'

type Source = 'appt' | 'task' | 'reminder'

export interface Nudge {
  id: string // unique per fire
  refId: string
  source: Source
  title: string
  body: string
  color: string
  stage: 'soon' | 'now' | 'manual'
}

export interface ScheduledReminder {
  refId: string
  source: Source
  title: string
  color: string
  fireAt: number // when the reminder pings
  startAt: number // when the thing actually happens
}

interface Target {
  refId: string
  source: Source
  title: string
  color: string
  startAt: number
  lead: number // minutes
  hour: number
}

const TICK_MS = 15_000
const FIRST_RUN_DELAY = 1_800
const NOTIFY_KEY = 'os:calendar:notify'
const MAX_NUDGES = 4

function buildTargets(appts: Appt[], tasks: Task[], reminders: Reminder[]): Target[] {
  const out: Target[] = []
  for (const a of appts) {
    out.push({
      refId: a.id,
      source: 'appt',
      title: a.title,
      color: KIND_COLOR[a.kind],
      startAt: apptStartMs(a),
      lead: a.reminderMinutes ?? 10,
      hour: a.start,
    })
  }
  for (const t of tasks) {
    if (t.status === 'done') continue
    const due = taskDueMs(t)
    if (due == null || t.dueTime == null) continue
    out.push({
      refId: t.id,
      source: 'task',
      title: t.title,
      color: PRIORITY_COLOR[t.priority],
      startAt: due,
      lead: t.reminderMinutes ?? 15,
      hour: t.dueTime,
    })
  }
  for (const r of reminders) {
    if (r.done) continue
    out.push({
      refId: r.id,
      source: 'reminder',
      title: r.title,
      color: REMINDER_COLOR,
      startAt: reminderMs(r),
      lead: 0, // the reminder time IS the ping time
      hour: r.time,
    })
  }
  return out
}

/**
 * Watches appointments, tasks and standalone reminders against the wall clock
 * and surfaces them as in-app nudges (and OS push notifications when enabled).
 * Fires a "soon" ping at `start − lead` and a "now" ping when the item starts.
 */
export function useReminders(
  appts: Appt[],
  tasks: Task[],
  reminders: Reminder[],
  opts: { onCompleteTask?: (id: string) => void; onCompleteReminder?: (id: string) => void } = {},
) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(NOTIFY_KEY) !== 'off'
    } catch {
      return true
    }
  })
  const [permission, setPermission] = useState<NotifyPermission>(() => getPermission())
  const [nudges, setNudges] = useState<Nudge[]>([])

  const fired = useRef<Set<string>>(new Set())
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const onCompleteTaskRef = useRef(opts.onCompleteTask)
  onCompleteTaskRef.current = opts.onCompleteTask
  const onCompleteReminderRef = useRef(opts.onCompleteReminder)
  onCompleteReminderRef.current = opts.onCompleteReminder

  const targets = useMemo(() => buildTargets(appts, tasks, reminders), [appts, tasks, reminders])
  const targetsRef = useRef(targets)
  targetsRef.current = targets

  const emit = useCallback((n: Nudge, notify: boolean) => {
    setNudges((prev) => [n, ...prev.filter((x) => x.id !== n.id)].slice(0, MAX_NUDGES))
    if (notify) pushNotification(n.title, n.body, n.refId)
  }, [])

  const tick = useCallback(() => {
    if (!enabledRef.current) return
    const now = Date.now()
    for (const tg of targetsRef.current) {
      const remindAt = tg.startAt - tg.lead * 60_000
      const soonKey = `${tg.source}:${tg.refId}:soon`
      const nowKey = `${tg.source}:${tg.refId}:now`

      if (!fired.current.has(soonKey) && now >= remindAt && now < tg.startAt) {
        fired.current.add(soonKey)
        emit(
          {
            id: soonKey,
            refId: tg.refId,
            source: tg.source,
            title: tg.title,
            color: tg.color,
            stage: 'soon',
            body: `${tg.source === 'task' ? 'Due' : 'Starts'} at ${hhmm(tg.hour)} · ${untilLabel(tg.startAt, now)}`,
          },
          true,
        )
      }

      if (!fired.current.has(nowKey) && now >= tg.startAt && now < tg.startAt + 5 * 60_000) {
        fired.current.add(nowKey)
        emit(
          {
            id: nowKey,
            refId: tg.refId,
            source: tg.source,
            title: tg.title,
            color: tg.color,
            stage: 'now',
            body:
              tg.source === 'task'
                ? 'Due now — knock it out.'
                : tg.source === 'reminder'
                  ? 'Reminder.'
                  : 'Happening now.',
          },
          true,
        )
      }
    }
  }, [emit])

  useEffect(() => {
    const t0 = window.setTimeout(tick, FIRST_RUN_DELAY)
    const iv = window.setInterval(tick, TICK_MS)
    return () => {
      window.clearTimeout(t0)
      window.clearInterval(iv)
    }
  }, [tick])

  // Upcoming reminders, for the sidebar "next pings" list.
  const scheduled = useMemo<ScheduledReminder[]>(() => {
    const now = Date.now()
    return targets
      .map((tg) => ({
        refId: tg.refId,
        source: tg.source,
        title: tg.title,
        color: tg.color,
        fireAt: tg.startAt - tg.lead * 60_000,
        startAt: tg.startAt,
      }))
      .filter((r) => r.startAt >= now)
      .sort((a, b) => a.fireAt - b.fireAt)
      .slice(0, 4)
  }, [targets])

  const dismiss = useCallback((id: string) => {
    setNudges((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const snooze = useCallback(
    (nudge: Nudge, minutes = 10) => {
      setNudges((prev) => prev.filter((n) => n.id !== nudge.id))
      window.setTimeout(
        () => {
          emit(
            {
              ...nudge,
              id: `${nudge.id}:snooze:${Date.now()}`,
              stage: 'manual',
              body: `Snoozed reminder · ${nudge.title}`,
            },
            true,
          )
        },
        minutes * 60_000,
      )
    },
    [emit],
  )

  const complete = useCallback((nudge: Nudge) => {
    setNudges((prev) => prev.filter((n) => n.id !== nudge.id))
    if (nudge.source === 'task') onCompleteTaskRef.current?.(nudge.refId)
    else if (nudge.source === 'reminder') onCompleteReminderRef.current?.(nudge.refId)
  }, [])

  const toggleEnabled = useCallback(() => {
    setEnabled((v) => {
      const next = !v
      try {
        localStorage.setItem(NOTIFY_KEY, next ? 'on' : 'off')
      } catch {
        /* ignore quota */
      }
      return next
    })
  }, [])

  const enableNotifications = useCallback(async () => {
    const p = await requestNotifyPermission()
    setPermission(p)
    if (p === 'granted') {
      setEnabled(true)
      try {
        localStorage.setItem(NOTIFY_KEY, 'on')
      } catch {
        /* ignore quota */
      }
      pushNotification('Reminders on', 'You’ll get a nudge before things start.')
    }
  }, [])

  const testNudge = useCallback(() => {
    const id = `test:${Date.now()}`
    emit(
      {
        id,
        refId: id,
        source: 'appt',
        title: 'Test reminder',
        color: '#36e0c8',
        stage: 'manual',
        body: 'This is what a nudge looks like. Reminders are live.',
      },
      true,
    )
  }, [emit])

  return {
    nudges,
    scheduled,
    enabled,
    permission,
    dismiss,
    snooze,
    complete,
    toggleEnabled,
    enableNotifications,
    testNudge,
  }
}
