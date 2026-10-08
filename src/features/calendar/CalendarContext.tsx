import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { REMINDERS, type Appt, type CronJob, type Reminder, type Task } from '@/data/calendar'
import { useOsOverlay, mergeById } from '@/features/overlay/osOverlay'
import { useNotesList, updateBody } from '@/features/notes/notesStore'
import { contentOf } from '@/features/notes/frontmatter'
import { completePlan, useProjects } from '@/features/projects/store'
import {
  APPTS_KEY,
  CRONS_KEY,
  REMINDERS_KEY,
  TASKS_KEY,
  loadAppts,
  loadCrons,
  loadJSON,
  loadTasks,
} from './agenda'
import { dayOffsetOf } from './util'
import { useReminders } from './useReminders'

interface CalendarContextValue {
  appts: Appt[]
  /** Todos: manual ones plus ones derived from projects and notes. */
  tasks: Task[]
  crons: CronJob[]
  saveAppt: (a: Appt) => void
  deleteAppt: (id: string) => void
  toggleTask: (t: Task) => void
  saveTask: (t: Task) => void
  deleteTask: (id: string) => void
  saveCron: (c: CronJob) => void
  deleteCron: (id: string) => void
  remindersEngine: ReturnType<typeof useReminders>
}

const CalendarContext = createContext<CalendarContextValue | null>(null)

const MERGED_KEY = 'os:calendar:reminders-merged'
// The retired GitHub team's open board items were once imported as todos (ids
// "team-t-…"). That team turned out to be test data, so a one-time cleanup
// removes them. Only those ids: anything made here is untouched.
const TEAM_TODOS_PURGED_KEY = 'os:calendar:team-todos-purged'
// The bundled sample todos and reminders (t1-t7, r1, r2) were not real. Removed from the code, and from browsers that had stored them.
const SEED_TODOS_PURGED_KEY = 'os:calendar:seed-todos-purged:v1'
const SEED_TODO_IDS = new Set(['t1', 't2', 't3', 't4', 't5', 't6', 't7', 'r1', 'r2'])
// Likewise the sample events (a1-a14).
const SEED_APPTS_PURGED_KEY = 'os:calendar:seed-appts-purged:v1'
const SEED_APPT_IDS = new Set(Array.from({ length: 14 }, (_, i) => `a${i + 1}`))
const TEAM_TODO_PREFIX = 'team-t-'

/** A reminder is a timed todo that notifies at its time. */
export function reminderToTask(r: Reminder): Task {
  return {
    id: r.id.startsWith('r') ? r.id : `r-${r.id}`,
    title: r.title,
    status: r.done ? 'done' : 'todo',
    priority: 'low',
    dayOffset: r.dayOffset,
    dueTime: r.time,
    reminderMinutes: 0,
    notify: true,
    notes: r.notes,
    recurrence: r.recurrence,
    source: 'manual',
  }
}

/** One-time: fold stored (or seed) reminders into the todo list. */
function initialTasks(): Task[] {
  const tasks = loadTasks()
  if (localStorage.getItem(MERGED_KEY)) return tasks
  const reminders = loadJSON<Reminder[]>(REMINDERS_KEY, REMINDERS)
  const ids = new Set(tasks.map((t) => t.id))
  const merged = [...tasks, ...reminders.map(reminderToTask).filter((t) => !ids.has(t.id))]
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(merged))
    localStorage.setItem(MERGED_KEY, '1')
    localStorage.removeItem(REMINDERS_KEY)
  } catch {
    /* storage unavailable — still merged in memory */
  }
  return merged
}

// Obsidian Tasks-style due dates on note checkboxes: 📅 2026-10-01 or due:2026-10-01
const NOTE_TODO = /^(\s*(?:>\s*)*[-*+] \[)( )\](.*?)(?:📅\s*|due:\s*)(\d{4}-\d{2}-\d{2})(.*)$/

/**
 * Owns the persisted calendar data (appointments, todos, cron jobs) and runs
 * the notification engine. Mounted once high in the tree (AppShell) so
 * notifications fire app-wide, not just while the Calendar page is open.
 */
export function CalendarProvider({ children }: { children: ReactNode }) {
  const [appts, setAppts] = useState<Appt[]>(() => loadAppts())
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [crons, setCrons] = useState<CronJob[]>(() => loadCrons())
  const mergedRef = useRef<Task[]>([])

  const persist = <T,>(key: string) => (next: T[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      /* ignore — in memory still works */
    }
    return next
  }
  const persistTasks = useCallback(persist<Task>(TASKS_KEY), [])
  const persistAppts = useCallback(persist<Appt>(APPTS_KEY), [])
  const persistCrons = useCallback(persist<CronJob>(CRONS_KEY), [])

  const saveAppt = useCallback(
    (updated: Appt) =>
      setAppts((list) => persistAppts(list.some((a) => a.id === updated.id) ? list.map((a) => (a.id === updated.id ? updated : a)) : [...list, updated])),
    [persistAppts],
  )
  const deleteAppt = useCallback((id: string) => setAppts((list) => persistAppts(list.filter((a) => a.id !== id))), [persistAppts])

  // ---- derived todos ------------------------------------------------------
  const projects = useProjects()
  const notes = useNotesList()
  const derived = useMemo<Task[]>(() => {
    const out: Task[] = []
    for (const p of projects)
      for (const plan of p.plans)
        out.push({
          id: `proj:${p.id}:${plan.id}`,
          title: plan.text,
          status: 'todo',
          priority: 'med',
          notes: `Next move in project “${p.name}”.`,
          source: 'project',
          sourceRef: { projectId: p.id, entryId: plan.id },
          projectId: p.id,
        })
    for (const n of notes) {
      if ((n.kind ?? 'markdown') !== 'markdown') continue
      contentOf(n.body)
        .split('\n')
        .forEach((line, i) => {
          const m = NOTE_TODO.exec(line)
          if (!m) return
          const title = `${m[3]}${m[5]}`.replace(/\s+/g, ' ').trim()
          out.push({
            id: `note:${n.id}:${i}`,
            title: title || n.title,
            status: 'todo',
            priority: 'med',
            dayOffset: dayOffsetOf(new Date(`${m[4]}T12:00:00`)),
            notes: `From note “${n.title}”.`,
            source: 'note',
            sourceRef: { noteId: n.id, line: i },
          })
        })
    }
    return out
  }, [projects, notes])

  const completeDerived = useCallback(
    (t: Task) => {
      if (t.source === 'project' && t.sourceRef?.projectId) {
        const p = projects.find((x) => x.id === t.sourceRef!.projectId)
        const entry = p?.plans.find((e) => e.id === t.sourceRef!.entryId)
        if (entry) completePlan(p!.id, entry)
      } else if (t.source === 'note' && t.sourceRef?.noteId != null) {
        const n = notes.find((x) => x.id === t.sourceRef!.noteId)
        if (!n) return
        const content = contentOf(n.body)
        const block = n.body.slice(0, n.body.length - content.length)
        const lines = content.split('\n')
        const i = t.sourceRef.line ?? -1
        if (lines[i] && NOTE_TODO.test(lines[i])) {
          lines[i] = lines[i].replace(/\[ \]/, '[x]')
          updateBody(n.id, block + lines.join('\n'))
        }
      }
    },
    [projects, notes],
  )

  const toggleTask = useCallback(
    (task: Task) => {
      if (task.source === 'project' || task.source === 'note') return completeDerived(task)
      const flipped = { ...task, status: task.status === 'done' ? ('todo' as const) : ('done' as const) }
      // Agent-added todos aren't in the local list yet — ticking one keeps a local copy.
      setTasks((list) => persistTasks(list.some((t) => t.id === task.id) ? list.map((t) => (t.id === task.id ? flipped : t)) : [...list, flipped]))
    },
    [persistTasks, completeDerived],
  )

  const completeTask = useCallback(
    (id: string) => {
      const d = derived.find((t) => t.id === id)
      if (d) return completeDerived(d)
      const task = mergedRef.current.find((t) => t.id === id)
      setTasks((list) =>
        persistTasks(
          list.some((t) => t.id === id)
            ? list.map((t) => (t.id === id ? { ...t, status: 'done' } : t))
            : task
              ? [...list, { ...task, status: 'done' }]
              : list,
        ),
      )
    },
    [persistTasks, derived, completeDerived],
  )

  const saveTask = useCallback(
    (updated: Task) => {
      if (updated.source === 'project' || updated.source === 'note') return
      setTasks((list) => persistTasks(list.some((t) => t.id === updated.id) ? list.map((t) => (t.id === updated.id ? updated : t)) : [...list, updated]))
    },
    [persistTasks],
  )

  // One-time cleanup of the todos the retired GitHub team's board was imported
  // as (see TEAM_TODO_PREFIX). The old team was test data.
  useEffect(() => {
    if (localStorage.getItem(TEAM_TODOS_PURGED_KEY)) return
    setTasks((list) => {
      const kept = list.filter((t) => !t.id.startsWith(TEAM_TODO_PREFIX))
      return kept.length === list.length ? list : persistTasks(kept)
    })
    localStorage.setItem(TEAM_TODOS_PURGED_KEY, '1')
  }, [persistTasks])

  // One-time: remove the stored copies of the sample todos (only those ids; anything made here is untouched).
  useEffect(() => {
    if (localStorage.getItem(SEED_TODOS_PURGED_KEY)) return
    setTasks((list) => {
      const kept = list.filter((t) => !SEED_TODO_IDS.has(t.id))
      return kept.length === list.length ? list : persistTasks(kept)
    })
    localStorage.setItem(SEED_TODOS_PURGED_KEY, '1')
  }, [persistTasks])

  // One-time: remove the stored copies of the sample events (only those ids).
  useEffect(() => {
    if (localStorage.getItem(SEED_APPTS_PURGED_KEY)) return
    setAppts((list) => {
      const kept = list.filter((a) => !SEED_APPT_IDS.has(a.id))
      return kept.length === list.length ? list : persistAppts(kept)
    })
    localStorage.setItem(SEED_APPTS_PURGED_KEY, '1')
  }, [persistAppts])

  const deleteTask = useCallback((id: string) => setTasks((list) => persistTasks(list.filter((t) => t.id !== id))), [persistTasks])

  const saveCron = useCallback(
    (updated: CronJob) =>
      setCrons((list) => persistCrons(list.some((c) => c.id === updated.id) ? list.map((c) => (c.id === updated.id ? updated : c)) : [...list, updated])),
    [persistCrons],
  )
  const deleteCron = useCallback((id: string) => setCrons((list) => persistCrons(list.filter((c) => c.id !== id))), [persistCrons])

  // Agent-authored todos/reminders from the OS overlay are merged in
  // read-only; user-created items live in (and persist to) localStorage.
  const overlay = useOsOverlay()
  const mergedTasks = useMemo(
    () => [
      // Agent-added todos first; a local copy (the user ticked or edited one)
      // wins over the agent's version.
      ...mergeById(
        [
          // Agents give todos a real date (due: YYYY-MM-DD); the calendar works in day offsets.
          ...overlay.tasks.map((t) => {
            const due = (t as Task & { due?: string }).due
            return due && t.dayOffset == null ? { ...t, dayOffset: dayOffsetOf(new Date(`${due}T12:00:00`)) } : t
          }),
          ...overlay.reminders.map(reminderToTask),
        ],
        tasks,
      ),
      ...derived,
    ],
    [tasks, overlay.tasks, overlay.reminders, derived],
  )

  mergedRef.current = mergedTasks
  const remindersEngine = useReminders(appts, mergedTasks, { onCompleteTask: completeTask })

  return (
    <CalendarContext.Provider
      value={{
        appts,
        tasks: mergedTasks,
        crons,
        saveAppt,
        deleteAppt,
        toggleTask,
        saveTask,
        deleteTask,
        saveCron,
        deleteCron,
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
