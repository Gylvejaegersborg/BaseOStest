import { useMemo, useSyncExternalStore } from 'react'
import type { Note } from '@/data/notes'
import type { Task } from '@/data/calendar'
import { useVault } from '@/features/notes/notesStore'
import { parseWikiTarget, resolveNote, wikiTargets } from '@/features/notes/vault'
import { useProjects, type ProjectView } from '@/features/projects/store'
import { useLinkGraph } from '@/features/connections/connections'
import { reportError } from '@/lib/errorBus'

/**
 * Goals — what the work is FOR. The top of BaseSpace's connective layer:
 *
 *   goal (why) ─┬─ sub-goals
 *               ├─ projects (explicit: goal.projectIds)
 *               │    ├─ their next moves (todos, derived)
 *               │    └─ notes that [[link]] the project
 *               ├─ notes that [[link]] the goal by title
 *               └─ todos linked to the goal or one of its projects
 *
 * Borrowed from Paperclip's "every task traces back to the goal": agents get
 * this chain as context (the snapshot carries it; Agent-OS injects it into a
 * thread focused on a goal or project), so they can always answer "why am I
 * doing this?". Kept in localStorage like projects and teams.
 */
export type GoalStatus = 'active' | 'achieved' | 'dropped'

export interface Goal {
  id: string
  title: string
  /** Why it matters — the line agents see in the chain. */
  why: string
  status: GoalStatus
  /** Target date, YYYY-MM-DD. */
  target?: string
  /** A bigger goal this one serves. */
  parentId?: string
  /** Projects that serve this goal. */
  projectIds: string[]
  createdAt: string
  updatedAt: string
}

export const GOAL_STATUS_META: Record<GoalStatus, { label: string; color: string }> = {
  active: { label: 'ACTIVE', color: '#46d369' },
  achieved: { label: 'ACHIEVED', color: '#36e0c8' },
  dropped: { label: 'DROPPED', color: '#6b7785' },
}

const KEY = 'os:goals'

function load(): Goal[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Goal[]) : []
  } catch {
    return []
  }
}

let goals = load()
const listeners = new Set<() => void>()

function commit(next: Goal[]) {
  goals = next
  try {
    localStorage.setItem(KEY, JSON.stringify(goals))
  } catch (e) {
    reportError({ source: 'goals', message: `Could not save goals: ${(e as Error).message}` })
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return
    goals = load()
    listeners.forEach((x) => x())
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(l)
    window.removeEventListener('storage', onStorage)
  }
}

export function useGoals(): Goal[] {
  return useSyncExternalStore(subscribe, () => goals)
}

const now = () => new Date().toISOString()

export function createGoal(input: Partial<Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>> & { title: string }): string {
  const id = `goal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  commit([
    ...goals,
    {
      id,
      title: input.title.trim() || 'New goal',
      why: input.why ?? '',
      status: input.status ?? 'active',
      target: input.target,
      parentId: input.parentId,
      projectIds: input.projectIds ?? [],
      createdAt: now(),
      updatedAt: now(),
    },
  ])
  return id
}

export function updateGoal(id: string, patch: Partial<Omit<Goal, 'id' | 'createdAt'>>) {
  commit(goals.map((g) => (g.id === id ? { ...g, ...patch, updatedAt: now() } : g)))
}

export function deleteGoal(id: string) {
  // Sub-goals move up to the deleted goal's parent instead of dangling.
  const parent = goals.find((g) => g.id === id)?.parentId
  commit(goals.filter((g) => g.id !== id).map((g) => (g.parentId === id ? { ...g, parentId: parent } : g)))
}

/** Adds or removes one project from a goal. */
export function toggleGoalProject(goalId: string, projectId: string) {
  const g = goals.find((x) => x.id === goalId)
  if (!g) return
  const has = g.projectIds.includes(projectId)
  updateGoal(goalId, { projectIds: has ? g.projectIds.filter((p) => p !== projectId) : [...g.projectIds, projectId] })
}

/** A goal and every goal above it, nearest first. Guards against cycles. */
export function goalChain(all: Goal[], id: string | undefined): Goal[] {
  const out: Goal[] = []
  const seen = new Set<string>()
  let cur = all.find((g) => g.id === id)
  while (cur && !seen.has(cur.id)) {
    out.push(cur)
    seen.add(cur.id)
    cur = cur.parentId ? all.find((g) => g.id === cur!.parentId) : undefined
  }
  return out
}

/** Goals a project serves. */
export function goalsForProject(all: Goal[], projectId: string): Goal[] {
  return all.filter((g) => g.projectIds.includes(projectId))
}

/** Finds the goal a `[[target]]` names (by title), for notes that link a goal. */
export function resolveGoal(all: Goal[], target: string): Goal | undefined {
  const name = parseWikiTarget(target).note.trim().toLowerCase()
  return name ? all.find((g) => g.title.toLowerCase() === name) : undefined
}

/** The project or goal a todo serves, if any: an explicit link, or the
 *  project a derived next-move todo came from. */
export function todoLinks(t: Task): { projectId?: string; goalId?: string } {
  return { projectId: t.projectId ?? t.sourceRef?.projectId, goalId: t.goalId }
}

export interface GoalView extends Goal {
  chain: Goal[]
  children: Goal[]
  projects: ProjectView[]
  /** Notes linking the goal by title. */
  notes: Note[]
  /** Notes linking one of its projects, with the project they come through. */
  projectNotes: { note: Note; via: ProjectView }[]
  /** Its own projects plus every sub-goal's, deduplicated — what the goal
   *  actually rests on, for progress and next-move counts. */
  allProjects: ProjectView[]
  /** Average progress over allProjects (shipped counts as 100); null with none. */
  progress: number | null
}

/** Everything connected to each goal, for the Goals view and the snapshot. */
export function useGoalViews(): GoalView[] {
  const all = useGoals()
  const projects = useProjects()
  const { notes } = useVault()
  const graph = useLinkGraph()
  return useMemo(() => {
    const byProjectNotes = new Map<string, Note[]>()
    const noteLinksGoal = (n: Note, g: Goal) =>
      wikiTargets(n.body).some((t) => !resolveNote(notes, parseWikiTarget(t).note, n) && resolveGoal([g], t))
    return all.map((g) => {
      const linkedProjects = g.projectIds.map((id) => projects.find((p) => p.id === id)).filter((p): p is ProjectView => !!p)
      const projectNotes = linkedProjects.flatMap((p) => {
        let list = byProjectNotes.get(p.id)
        if (!list) byProjectNotes.set(p.id, (list = graph.notesLinkingToProject(p.id)))
        return list.map((note) => ({ note, via: p }))
      })
      const progressOf = (p: ProjectView) => (p.status === 'shipped' ? 100 : p.progress)
      // Roll up through sub-goals (cycle-safe).
      const seen = new Set<string>([g.id])
      const ids = new Set(g.projectIds)
      const stack = all.filter((c) => c.parentId === g.id)
      while (stack.length) {
        const c = stack.pop()!
        if (seen.has(c.id)) continue
        seen.add(c.id)
        c.projectIds.forEach((id) => ids.add(id))
        stack.push(...all.filter((x) => x.parentId === c.id))
      }
      const allProjects = [...ids].map((id) => projects.find((p) => p.id === id)).filter((p): p is ProjectView => !!p)
      return {
        ...g,
        chain: goalChain(all, g.id),
        children: all.filter((c) => c.parentId === g.id),
        projects: linkedProjects,
        notes: notes.filter((n) => noteLinksGoal(n, g)),
        projectNotes,
        allProjects,
        progress: allProjects.length ? Math.round(allProjects.reduce((s, p) => s + progressOf(p), 0) / allProjects.length) : null,
      }
    })
  }, [all, projects, notes, graph])
}
