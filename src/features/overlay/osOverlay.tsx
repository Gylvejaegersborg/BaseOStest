import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Note } from '@/data/notes'
import type { Reminder, Task as CalTask } from '@/data/calendar'
import type { Project } from '@/data/projects'
import type { SongProject } from '@/features/songtracker/projects'
import type { Asset } from '@/data/library'
import type { Beat } from '@/data/beats'
import type { LabModule } from '@/data/labs'
import { fetchOverlay } from '@/features/agentos/client'
import { subscribeToEvents } from '@/features/agentos/sessionClient'
import { pushNotification } from '@/features/calendar/notifications'
import { libraryFileUrl } from '@/features/library/libraryClient'

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
  /** Re-read the overlay now (after an upload, instead of waiting for the poll). */
  refresh: () => Promise<void>
}

const OsOverlayContext = createContext<OsOverlayValue>({ overlay: EMPTY_OVERLAY, loaded: false, refresh: async () => {} })

/** Uploaded songs arrive with file ids; turn them into URLs the players can load. */
function withFileUrls(a: Asset): Asset {
  if (!a.uploaded) return a
  return {
    ...a,
    ...(a.audioFileId ? { audioFile: libraryFileUrl(a.audioFileId) } : {}),
    ...(a.coverFileId ? { coverImage: libraryFileUrl(a.coverFileId) } : {}),
  }
}

export function OsOverlayProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<OsOverlay>(EMPTY_OVERLAY)
  const [loaded, setLoaded] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const reload = useRef<() => Promise<void>>(async () => {})

  useEffect(() => {
    let cancelled = false
    let last = ''
    const load = () =>
      fetchOverlay<Partial<OsOverlay>>()
        .then((data) => {
          if (cancelled) return
          // Tolerate missing keys / hand edits: fill any absent array.
          const next = { ...EMPTY_OVERLAY, ...data }
          next.library = (Array.isArray(next.library) ? next.library : []).map(withFileUrls)
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
    reload.current = load
    void load()
    // Agents add things while BaseSpace is open — pick them up.
    const id = window.setInterval(load, 30_000)
    // ...and straight away when the gateway says the overlay changed (an agent added a note, todo or project).
    // Several adds in a row are one reload.
    let pending: number | undefined
    const dispose = subscribeToEvents(['basespace.overlay.updated'], () => {
      window.clearTimeout(pending)
      pending = window.setTimeout(() => void load(), 400)
    })
    // A todo that completes by itself (its note was updated) is announced: an OS notification when allowed, and a note on screen.
    let toastTimer: number | undefined
    const disposeDone = subscribeToEvents(['basespace.todo.completed'], (e) => {
      const p = e.payload as { title?: string; auto?: boolean; reason?: string }
      void load()
      if (!p.auto) return
      const text = `Done: ${p.title ?? 'a todo'}${p.reason ? ` (${p.reason})` : ''}`
      pushNotification('Todo completed', text, `todo-done-${p.title ?? ''}`)
      setToast(text)
      window.clearTimeout(toastTimer)
      toastTimer = window.setTimeout(() => setToast(null), 9000)
    })
    return () => {
      cancelled = true
      window.clearInterval(id)
      window.clearTimeout(pending)
      window.clearTimeout(toastTimer)
      dispose()
      disposeDone()
    }
  }, [])

  const refresh = useCallback(() => reload.current(), [])
  return (
    <OsOverlayContext.Provider value={{ overlay, loaded, refresh }}>
      {children}
      {toast && (
        <div role="status" className="fixed bottom-4 right-4 z-[80] max-w-sm border border-accent/40 bg-panel px-3 py-2 text-xs text-text shadow-lg">
          {toast}
        </div>
      )}
    </OsOverlayContext.Provider>
  )
}

export function useOsOverlay(): OsOverlay {
  return useContext(OsOverlayContext).overlay
}

export function useRefreshOverlay(): () => Promise<void> {
  return useContext(OsOverlayContext).refresh
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
