import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Note } from '@/data/notes'
import type { Reminder, Task as CalTask } from '@/data/calendar'
import type { Project } from '@/data/projects'
import type { SongProject } from '@/features/songtracker/projects'
import type { Asset } from '@/data/library'
import type { Beat } from '@/data/beats'
import type { LabModule } from '@/data/labs'
import { fetchOverlay } from '@/features/agentos/client'

/**
 * The OS overlay is the single surface the agents write to in order to feed
 * the user-facing parts of the dashboard — notes, todos, projects, the song
 * tracker, the beat library/store and lab modules. Agents add items through
 * the Agent-OS gateway's BaseSpace bridge (GET /basespace/overlay); every
 * consuming page merges its slice over its own data. This is internal (the
 * user's own OS), so it is NOT approval-gated — only outward-facing
 * publishing is.
 */
export interface OsOverlay {
  updatedAt?: string
  notes: Note[]
  reminders: Reminder[]
  tasks: CalTask[]
  /** Project entries merge by id over PROJECTS: matching id shallow-merges
   *  (so an agent can bump lastMove/nextMove/progress), new id appends. */
  projects: (Partial<Project> & { id: string })[]
  songs: SongProject[]
  /** Beat library assets shown in the Beat DB. */
  library: Asset[]
  /** Beats shown in the in-OS beat store + artist web releases grid. */
  beats: Beat[]
  lab: LabModule[]
}

export const EMPTY_OVERLAY: OsOverlay = {
  notes: [], reminders: [], tasks: [], projects: [], songs: [], library: [], beats: [], lab: [],
}

interface OsOverlayValue {
  overlay: OsOverlay
  loaded: boolean
}

const OsOverlayContext = createContext<OsOverlayValue>({ overlay: EMPTY_OVERLAY, loaded: false })

export function OsOverlayProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<OsOverlay>(EMPTY_OVERLAY)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    let last = ''
    const load = () =>
      fetchOverlay<Partial<OsOverlay>>()
        .then((data) => {
          if (cancelled) return
          // Tolerate missing keys / hand edits: fill any absent array.
          const next = { ...EMPTY_OVERLAY, ...data }
          const key = JSON.stringify(next)
          if (key !== last) {
            last = key
            setOverlay(next)
          }
          setLoaded(true)
        })
        .catch(() => {
          // No gateway / unreachable / nothing written yet — stay on local data.
        })
    void load()
    // Agents add things while BaseSpace is open — pick them up.
    const id = window.setInterval(load, 30_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  return <OsOverlayContext.Provider value={{ overlay, loaded }}>{children}</OsOverlayContext.Provider>
}

export function useOsOverlay(): OsOverlay {
  return useContext(OsOverlayContext).overlay
}

/** Append `extra` to `base`, with extra items overriding base items of the same id. */
export function mergeById<T extends { id: string }>(base: T[], extra: T[]): T[] {
  if (!extra.length) return base
  const overrides = new Map(extra.map((e) => [e.id, e]))
  const merged = base.map((b) => (overrides.has(b.id) ? { ...b, ...overrides.get(b.id)! } : b))
  const seen = new Set(base.map((b) => b.id))
  for (const e of extra) if (!seen.has(e.id)) merged.push(e)
  return merged
}
