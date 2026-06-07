import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { Appt, CronJob, Reminder, Task } from '@/data/calendar'
import {
  APPTS_KEY,
  CRONS_KEY,
  REMINDERS_KEY,
  TASKS_KEY,
  loadAppts,
  loadCrons,
  loadReminders,
  loadTasks,
} from './agenda'
import { useReminders } from './useReminders'

interface CalendarContextValue {
  appts: Appt[]
  tasks: Task[]
  reminders: Reminder[]
  crons: CronJob[]
  saveAppt: (a: Appt) => void
  toggleTask: (t: Task) => void
  saveTask: (t: Task) => void
  deleteTask: (id: string) => void
  saveReminder: (r: Reminder) => void
  deleteReminder: (id: string) => void
  saveCron: (c: CronJob) => void
  remindersEngine: ReturnType<typeof useReminders>
}

const CalendarContext = createContext<CalendarContextValue | null>(null)

/**
 * Owns the persisted calendar data (appointments, tasks, reminders, cron jobs)
 * and runs the reminder engine. Mounted once high in the tree (AppShell) so
 * reminders fire app-wide, not just while the Calendar page is open.
 */
export function CalendarProvider({ children }: { children: ReactNode }) {
  const [appts, setAppts] = useState<Appt[]>(() => loadAppts())
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks())
  const [reminders, setReminders] = useState<Reminder[]>(() => loadReminders())
  const [crons, setCrons] = useState<CronJob[]>(() => loadCrons())

  const saveAppt = useCallback((updated: Appt) => {
    setAppts((list) => {
      const next = list.map((a) => (a.id === updated.id ? updated : a))
      localStorage.setItem(APPTS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const persistTasks = useCallback((next: Task[]) => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(next))
    return next
  }, [])

  const toggleTask = useCallback(
    (task: Task) => {
      setTasks((list) =>
        persistTasks(
          list.map((t) => (t.id === task.id ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t)),
        ),
      )
    },
    [persistTasks],
  )

  const completeTask = useCallback(
    (id: string) => {
      setTasks((list) => persistTasks(list.map((t) => (t.id === id ? { ...t, status: 'done' } : t))))
    },
    [persistTasks],
  )

  const saveTask = useCallback(
    (updated: Task) => {
      setTasks((list) => {
        const exists = list.some((t) => t.id === updated.id)
        return persistTasks(exists ? list.map((t) => (t.id === updated.id ? updated : t)) : [...list, updated])
      })
    },
    [persistTasks],
  )

  const deleteTask = useCallback(
    (id: string) => {
      setTasks((list) => persistTasks(list.filter((t) => t.id !== id)))
    },
    [persistTasks],
  )

  const persistReminders = useCallback((next: Reminder[]) => {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(next))
    return next
  }, [])

  const saveReminder = useCallback(
    (updated: Reminder) => {
      setReminders((list) => {
        const exists = list.some((r) => r.id === updated.id)
        return persistReminders(
          exists ? list.map((r) => (r.id === updated.id ? updated : r)) : [...list, updated],
        )
      })
    },
    [persistReminders],
  )

  const deleteReminder = useCallback(
    (id: string) => {
      setReminders((list) => persistReminders(list.filter((r) => r.id !== id)))
    },
    [persistReminders],
  )

  const completeReminder = useCallback(
    (id: string) => {
      setReminders((list) => persistReminders(list.map((r) => (r.id === id ? { ...r, done: true } : r))))
    },
    [persistReminders],
  )

  const saveCron = useCallback((updated: CronJob) => {
    setCrons((list) => {
      const next = list.map((c) => (c.id === updated.id ? updated : c))
      localStorage.setItem(CRONS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const remindersEngine = useReminders(appts, tasks, reminders, {
    onCompleteTask: completeTask,
    onCompleteReminder: completeReminder,
  })

  return (
    <CalendarContext.Provider
      value={{
        appts,
        tasks,
        reminders,
        crons,
        saveAppt,
        toggleTask,
        saveTask,
        deleteTask,
        saveReminder,
        deleteReminder,
        saveCron,
        remindersEngine,
      }}
    >
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendar(): CalendarContextValue {
  const ctx = useContext(CalendarContext)
  if (!ctx) throw new Error('useCalendar must be used within a CalendarProvider')
  return ctx
}
