import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { Appt, Task } from '@/data/calendar'
import { APPTS_KEY, TASKS_KEY, loadAppts, loadTasks } from './agenda'
import { useReminders } from './useReminders'

interface CalendarContextValue {
  appts: Appt[]
  tasks: Task[]
  saveAppt: (a: Appt) => void
  toggleTask: (t: Task) => void
  saveTask: (t: Task) => void
  deleteTask: (id: string) => void
  reminders: ReturnType<typeof useReminders>
}

const CalendarContext = createContext<CalendarContextValue | null>(null)

/**
 * Owns the persisted calendar data (appointments + tasks) and runs the reminder
 * engine. Mounted once high in the tree (AppShell) so reminders fire app-wide,
 * not just while the Calendar page is open.
 */
export function CalendarProvider({ children }: { children: ReactNode }) {
  const [appts, setAppts] = useState<Appt[]>(() => loadAppts())
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks())

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

  const reminders = useReminders(appts, tasks, { onCompleteTask: completeTask })

  return (
    <CalendarContext.Provider value={{ appts, tasks, saveAppt, toggleTask, saveTask, deleteTask, reminders }}>
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendar(): CalendarContextValue {
  const ctx = useContext(CalendarContext)
  if (!ctx) throw new Error('useCalendar must be used within a CalendarProvider')
  return ctx
}
