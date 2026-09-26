import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Appt, Task } from '@/data/calendar'
import { KIND_COLOR, PRIORITY_COLOR } from '@/data/calendar'
import { apptNextMs, hhmm, taskNextMs, untilLabel } from './util'
import {
  getPermission,
  pushNotification,
  requestPermission as requestNotifyPermission,
  type NotifyPermission,
} from './notifications'

type Source = 'appt' | 'task'

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
  lead: number // minutes
  hour: number
  /** Resolves to the relevant occurrence's start time given a lower bound —
   *  recomputed every tick (see below) instead of fixed once, so a
   *  recurring item's target rolls forward to its next occurrence on its
   *  own rather than staying pinned to whichever one was first computed. */
  nextStartAt: (from: number) => number | null
}

const TICK_MS = 15_000
const FIRST_RUN_DELAY = 1_800
const NOTIFY_KEY = 'os:calendar:notify'
const MAX_NUDGES = 4

function buildTargets(appts: Appt[], tasks: Task[]): Target[] {
  const out: Target[] = []
  for (const a of appts) {
    out.push({
      refId: a.id,
      source: 'appt',
      title: a.title,
      color: KIND_COLOR[a.kind],
      lead: a.reminderMinutes ?? 10,
      hour: a.start,
      nextStartAt: (from) => apptNextMs(a, from),
    })
  }
  for (const t of tasks) {
    // notify:false = a plain todo that just sits on the list, no ping.
    if (t.status === 'done' || t.dueTime == null || t.notify === false) continue
    out.push({
      refId: t.id,
      source: 'task',
      title: t.title,
      color: PRIORITY_COLOR[t.priority],
      lead: t.reminderMinutes ?? 15,
      hour: t.dueTime,
      nextStartAt: (from) => taskNextMs(t, from),
    })
  }
  return out
}

/**
 * Watches appointments and timed todos against the wall clock
 * and surfaces them as in-app nudges (and OS push notifications when enabled).
 * Fires a "soon" ping at `start − lead` and a "now" ping when the item starts.
 */
export function useReminders(
  appts: Appt[],
  tasks: Task[],
  opts: { onCompleteTask?: (id: string) => void } = {},
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

  const targets = useMemo(() => buildTargets(appts, tasks), [appts, tasks])
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
      // Recompute per tick, not once: this is what makes a recurring item's
      // target roll forward to next week's/tomorrow's occurrence on its own
      // instead of firing only for its first-ever occurrence. Looking from
      // `now - lead` finds whichever occurrence's own lead window we're
      // currently inside (or about to be), not a stale earlier one.
      const startAt = tg.nextStartAt(now - tg.lead * 60_000)
      if (startAt == null) continue
      const remindAt = startAt - tg.lead * 60_000
      // Keyed by occurrence, not just the item — otherwise a recurring
      // item's "soon"/"now" nudge would only ever fire once, the first time
      // its dedupe key got marked fired, and never again for later occurrences.
      const soonKey = `${tg.source}:${tg.refId}:${startAt}:soon`
      const nowKey = `${tg.source}:${tg.refId}:${startAt}:now`

      if (!fired.current.has(soonKey) && now >= remindAt && now < startAt) {
        fired.current.add(soonKey)
        emit(
          {
            id: soonKey,
            refId: tg.refId,
            source: tg.source,
            title: tg.title,
            color: tg.color,
            stage: 'soon',
            body: `${tg.source === 'task' ? 'Due' : 'Starts'} at ${hhmm(tg.hour)} · ${untilLabel(startAt, now)}`,
          },
          true,
        )
      }

      if (!fired.current.has(nowKey) && now >= startAt && now < startAt + 5 * 60_000) {
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
              tg.source === 'task' ? 'Due now.' : 'Happening now.',
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
      .map((tg) => {
        const startAt = tg.nextStartAt(now)
        if (startAt == null) return null
        return {
          refId: tg.refId,
          source: tg.source,
          title: tg.title,
          color: tg.color,
          fireAt: startAt - tg.lead * 60_000,
          startAt,
        }
      })
      .filter((r): r is ScheduledReminder => r != null)
      .sort((a, b) => a.fireAt - b.fireAt)
      .slice(0, 12)
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
        color: '#c77591',
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
