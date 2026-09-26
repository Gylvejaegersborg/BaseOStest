import { useMemo, useSyncExternalStore } from 'react'
import { PROJECTS, type Project, type ProjectStatus } from '@/data/projects'
import type { SectionId } from '@/data/sections'
import { useOsOverlay, mergeById } from '@/features/overlay/osOverlay'
import type { PropValue } from '@/features/notes/frontmatter'
import { reportError } from '@/lib/errorBus'

// Projects: the seed list + agent-written overlay + the user's own edits
// and created projects, with a real history (moves, plans, comments,
// status changes) instead of a single last/next-move pair.

export type HistoryKind = 'move' | 'plan' | 'comment' | 'status' | 'created'

export interface HistoryEntry {
  id: string
  date: string // ISO
  kind: HistoryKind
  text: string
  /** Seed/overlay-derived entries can be hidden but not edited. */
  seed?: boolean
}

export interface ProjectView extends Project {
  history: HistoryEntry[]
  /** Open plans (next moves), newest first. */
  plans: HistoryEntry[]
  updatedAt: string
  createdAt: string
  userCreated: boolean
  props: Record<string, PropValue>
}

interface ProjectPatch {
  status?: ProjectStatus
  name?: string
  tagline?: string
  what?: string
  tags?: string[]
  sectionId?: SectionId
  links?: { label: string; href: string }[]
  /** Typed properties — same model and type registry as note properties. */
  props?: Record<string, PropValue>
  // legacy fields from the old overrides store (still honoured)
  lastMove?: string
  nextMove?: string
  progress?: number
}

interface State {
  patches: Record<string, ProjectPatch>
  history: Record<string, HistoryEntry[]>
  hidden: string[] // seed history entry ids the user removed/completed
  created: Project[]
  deleted: string[]
}

const KEYS = {
  patches: 'os:projects:overrides', // same key as the old overrides store
  history: 'os:projects:history',
  hidden: 'os:projects:hidden',
  created: 'os:projects:user',
  deleted: 'os:projects:deleted',
} as const

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function read(): State {
  return {
    patches: load(KEYS.patches, {}),
    history: load(KEYS.history, {}),
    hidden: load(KEYS.hidden, []),
    created: load(KEYS.created, []),
    deleted: load(KEYS.deleted, []),
  }
}

let state = read()
const listeners = new Set<() => void>()

function commit(patch: Partial<State>) {
  state = { ...state, ...patch }
  for (const k of Object.keys(patch) as (keyof State)[]) {
    try {
      localStorage.setItem(KEYS[k], JSON.stringify(state[k]))
    } catch (e) {
      reportError({ source: 'projects', message: `Could not save ${KEYS[k]}: ${(e as Error).message}` })
    }
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  const onStorage = (e: StorageEvent) => {
    if (e.key && !e.key.startsWith('os:projects:')) return
    state = read()
    listeners.forEach((x) => x())
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(l)
    window.removeEventListener('storage', onStorage)
  }
}

const iso = (date: string) => (date.length === 10 ? `${date}T12:00:00.000Z` : date)
const now = () => new Date().toISOString()
const uid = () => `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

/** Seed timeline + lastMove/nextMove (from seed data, the agent overlay or
 *  old edits) become history entries, so nothing written before is lost. */
function seedHistory(p: Project): HistoryEntry[] {
  const out: HistoryEntry[] = p.timeline.map((m, i) => ({ id: `seed:${p.id}:t${i}`, date: iso(m.date), kind: 'move', text: m.text, seed: true }))
  const newest = out[0]?.date ?? '2026-01-01T12:00:00.000Z'
  const texts = new Set(out.map((e) => e.text.trim()))
  if (p.lastMove && !texts.has(p.lastMove.trim()))
    out.push({ id: `seed:${p.id}:last:${hash(p.lastMove)}`, date: newest, kind: 'move', text: p.lastMove, seed: true })
  if (p.nextMove) out.push({ id: `seed:${p.id}:next:${hash(p.nextMove)}`, date: newest, kind: 'plan', text: p.nextMove, seed: true })
  for (const plan of p.extraPlans ?? []) out.push({ id: `seed:${p.id}:plan:${hash(plan)}`, date: newest, kind: 'plan', text: plan, seed: true })
  return out
}

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h.toString(36)
}

function derive(s: State, overlay: Project[]): ProjectView[] {
  const del = new Set(s.deleted)
  const hidden = new Set(s.hidden)
  const created = new Set(s.created.map((p) => p.id))
  return mergeById([...PROJECTS, ...s.created], overlay)
    .filter((p) => !del.has(p.id))
    .map((base) => {
      const p = { ...base, ...s.patches[base.id] }
      const history = [...seedHistory(p).filter((e) => !hidden.has(e.id)), ...(s.history[p.id] ?? [])].sort(
        (a, b) => b.date.localeCompare(a.date),
      )
      const plans = history.filter((e) => e.kind === 'plan')
      const dated = history.map((e) => e.date)
      return {
        ...p,
        history,
        plans,
        updatedAt: dated[0] ?? '2026-01-01T12:00:00.000Z',
        createdAt: dated[dated.length - 1] ?? '2026-01-01T12:00:00.000Z',
        userCreated: created.has(p.id),
        props: p.props ?? {},
      }
    })
}

export function useProjects(): ProjectView[] {
  const s = useSyncExternalStore(subscribe, () => state)
  const overlay = useOsOverlay()
  return useMemo(() => derive(s, overlay.projects as Project[]), [s, overlay.projects])
}

// ---- mutations ----------------------------------------------------------

export function patchProject(id: string, patch: ProjectPatch) {
  commit({ patches: { ...state.patches, [id]: { ...state.patches[id], ...patch } } })
}

/** Sets (or with `undefined` removes) one project property. */
export function setProjectProp(id: string, key: string, value: PropValue | undefined) {
  const props = { ...(state.patches[id]?.props ?? {}) }
  if (value === undefined) delete props[key]
  else props[key] = value
  patchProject(id, { props })
}

export function renameProjectProp(id: string, from: string, to: string) {
  const props = state.patches[id]?.props ?? {}
  if (!(from in props) || !to.trim() || to in props) return
  patchProject(id, { props: Object.fromEntries(Object.entries(props).map(([k, v]) => (k === from ? [to.trim(), v] : [k, v]))) })
}

export function addEntry(projectId: string, kind: HistoryKind, text: string) {
  const entry: HistoryEntry = { id: uid(), date: now(), kind, text: text.trim() }
  if (!entry.text) return
  commit({ history: { ...state.history, [projectId]: [...(state.history[projectId] ?? []), entry] } })
}

export function removeEntry(projectId: string, entry: HistoryEntry) {
  if (entry.seed) commit({ hidden: [...state.hidden, entry.id] })
  else commit({ history: { ...state.history, [projectId]: (state.history[projectId] ?? []).filter((e) => e.id !== entry.id) } })
}

/** Marks a plan (next move) as done: it becomes a move dated now. */
export function completePlan(projectId: string, entry: HistoryEntry) {
  removeEntry(projectId, entry)
  addEntry(projectId, 'move', entry.text)
}

export function setStatus(project: ProjectView, status: ProjectStatus, labels: Record<ProjectStatus, string>) {
  if (project.status === status) return
  patchProject(project.id, { status })
  addEntry(project.id, 'status', `${labels[project.status]} → ${labels[status]}`)
}

export function createProject(opts: Partial<Project> = {}): string {
  const id = `proj-${Date.now().toString(36)}`
  const project: Project = {
    id,
    name: opts.name ?? 'Untitled project',
    sectionId: opts.sectionId ?? 'workbench',
    status: opts.status ?? 'idea',
    tagline: opts.tagline ?? '',
    what: opts.what ?? '',
    lastMove: '',
    nextMove: '',
    progress: 0,
    tags: opts.tags ?? [],
    timeline: [],
  }
  commit({ created: [...state.created, project] })
  addEntry(id, 'created', 'Project created')
  return id
}

export function deleteProject(id: string) {
  if (state.created.some((p) => p.id === id)) commit({ created: state.created.filter((p) => p.id !== id) })
  else commit({ deleted: [...state.deleted, id] })
}
