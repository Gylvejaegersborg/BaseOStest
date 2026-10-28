// Local state the launcher keeps for itself: curation (hide, rename, alias,
// pin), frecency and running timers. Browser storage only — these are
// per-machine conveniences until the Tauri shell or the snapshot takes
// them over. Every read/write is guarded: storage can be missing.

import { useSyncExternalStore } from 'react'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private window or full storage: the launcher still works, it just forgets.
  }
}

/** A tiny observable store usable from React via useSyncExternalStore. */
function createStore<T extends object>(key: string, initial: T) {
  let state = load(key, initial)
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    set(next: T) {
      state = next
      save(key, state)
      listeners.forEach((l) => l())
    },
    subscribe(l: () => void) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

// ── Curation ────────────────────────────────────────────────────────────

export interface Prefs {
  hidden: string[]
  renamed: Record<string, string>
  aliases: Record<string, string[]>
  /** Result ids shown as chips in Peek, in order. */
  pinned: string[]
}

export const prefs = createStore<Prefs>('launcher.prefs', {
  hidden: [],
  renamed: {},
  aliases: {},
  pinned: ['cmd:timer', 'cmd:colour', 'cmd:note', 'cmd:calc'],
})

export function usePrefs(): Prefs {
  return useSyncExternalStore(prefs.subscribe, prefs.get)
}

export function hideResult(id: string) {
  const p = prefs.get()
  if (!p.hidden.includes(id)) prefs.set({ ...p, hidden: [...p.hidden, id], pinned: p.pinned.filter((x) => x !== id) })
}

export function unhideResult(id: string) {
  const p = prefs.get()
  prefs.set({ ...p, hidden: p.hidden.filter((x) => x !== id) })
}

export function renameResult(id: string, title: string) {
  const p = prefs.get()
  const renamed = { ...p.renamed }
  if (title.trim()) renamed[id] = title.trim()
  else delete renamed[id]
  prefs.set({ ...p, renamed })
}

export function addAlias(id: string, alias: string) {
  const a = alias.trim().toLowerCase()
  if (!a) return
  const p = prefs.get()
  const list = p.aliases[id] ?? []
  if (!list.includes(a)) prefs.set({ ...p, aliases: { ...p.aliases, [id]: [...list, a] } })
}

export function togglePin(id: string) {
  const p = prefs.get()
  prefs.set({ ...p, pinned: p.pinned.includes(id) ? p.pinned.filter((x) => x !== id) : [...p.pinned, id] })
}

// ── Frecency ────────────────────────────────────────────────────────────
// Keyed by (query prefix, result id): how often and how recently you picked
// this result after typing this prefix.

interface Pick {
  count: number
  last: number
}

const frecency = createStore<Record<string, Pick>>('launcher.frecency', {})

const prefixOf = (q: string) => q.trim().toLowerCase().slice(0, 3)

export function recordPick(query: string, id: string) {
  const key = `${prefixOf(query)}|${id}`
  const all = frecency.get()
  const prev = all[key]
  frecency.set({ ...all, [key]: { count: (prev?.count ?? 0) + 1, last: Date.now() } })
}

/** 0 when never picked; grows with count, halves every week unused. */
export function frecencyScore(query: string, id: string): number {
  const pick = frecency.get()[`${prefixOf(query)}|${id}`]
  if (!pick) return 0
  const weeks = (Date.now() - pick.last) / (7 * 86_400_000)
  return pick.count * Math.pow(0.5, weeks)
}

// ── Timers ──────────────────────────────────────────────────────────────

export interface Timer {
  id: string
  label: string
  durationMs: number
  /** Epoch ms when it ends; null while paused. */
  endsAt: number | null
  /** Remaining ms while paused. */
  remainingMs: number
}

export const timers = createStore<{ list: Timer[] }>('launcher.timers', { list: [] })

export function useTimers(): Timer[] {
  return useSyncExternalStore(timers.subscribe, timers.get).list
}

export function remainingOf(t: Timer, now = Date.now()): number {
  return t.endsAt === null ? t.remainingMs : Math.max(0, t.endsAt - now)
}

export function startTimer(durationMs: number, label: string): Timer {
  const t: Timer = { id: `t${Date.now().toString(36)}`, label, durationMs, endsAt: Date.now() + durationMs, remainingMs: durationMs }
  timers.set({ list: [...timers.get().list, t] })
  return t
}

function updateTimer(id: string, fn: (t: Timer) => Timer | null) {
  const list = timers.get().list.flatMap((t) => {
    if (t.id !== id) return [t]
    const next = fn(t)
    return next ? [next] : []
  })
  timers.set({ list })
}

export function pauseTimer(id: string) {
  updateTimer(id, (t) => (t.endsAt === null ? { ...t, endsAt: Date.now() + t.remainingMs } : { ...t, endsAt: null, remainingMs: remainingOf(t) }))
}

export function addToTimer(id: string, ms: number) {
  updateTimer(id, (t) =>
    t.endsAt === null
      ? { ...t, remainingMs: t.remainingMs + ms, durationMs: t.durationMs + ms }
      : { ...t, endsAt: t.endsAt + ms, durationMs: t.durationMs + ms },
  )
}

export function cancelTimer(id: string) {
  updateTimer(id, () => null)
}

// ── Inbox ───────────────────────────────────────────────────────────────
// Quick notes land here until the launcher is wired to BaseSpace notes.

export interface InboxNote {
  id: string
  text: string
  at: string
}

export const inbox = createStore<{ notes: InboxNote[] }>('launcher.inbox', { notes: [] })

export function addInboxNote(text: string) {
  const note = { id: `n${Date.now().toString(36)}`, text, at: new Date().toISOString() }
  inbox.set({ notes: [note, ...inbox.get().notes] })
}
