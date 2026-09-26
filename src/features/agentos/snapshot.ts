import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useNotesList } from '@/features/notes/notesStore'
import { useProjects } from '@/features/projects/store'
import { useCalendar } from '@/features/calendar/CalendarContext'
import { cronNextRunMs } from '@/features/calendar/cron'
import { offsetDate } from '@/features/calendar/util'
import { useTeams } from '@/features/workbench/teams'
import { useAgentOsContext } from './AgentOsProvider'
import { pushSnapshot } from './client'

/**
 * The agents' view of BaseSpace: notes, projects, todos, events, cron jobs
 * and teams in one JSON document. Pushed to the Agent-OS gateway
 * (POST /basespace/snapshot) a few seconds after anything changes, so an
 * agent asked "what's on my plate" reads the same state the user sees.
 *
 * Archived GitHub-team notes (Notes → Team) go in as titles only — their
 * bodies are history, not state, and would triple the payload.
 */
export interface BaseSpaceSnapshot {
  schema: 1
  exportedAt: string
  notes: { id: string; title: string; folder: string; tags: string[]; props?: Record<string, unknown>; updated: string; body?: string }[]
  projects: {
    id: string
    name: string
    status: string
    tagline: string
    progress: number
    tags: string[]
    props: Record<string, unknown>
    nextMoves: string[]
    recent: { date: string; text: string }[]
  }[]
  todos: { id: string; title: string; status: string; priority: string; due?: string; source: string; notes?: string }[]
  events: { id: string; title: string; kind: string; date: string; start: number; end: number; location?: string; recurring: boolean }[]
  crons: { id: string; name: string; owner: string; team?: string; schedule: unknown; nextRun: string; status: string }[]
  teams: { id: string; name: string; members: string[]; description?: string }[]
}

const iso = (d: Date) => d.toISOString().slice(0, 10)

export function useSnapshot(): BaseSpaceSnapshot {
  const notes = useNotesList()
  const projects = useProjects()
  const { tasks, appts, crons } = useCalendar()
  const { teams } = useTeams()
  return {
    schema: 1,
    exportedAt: new Date().toISOString(),
    notes: notes.map((n) => {
      const archived = n.folder === 'Team' || n.folder.startsWith('Team/')
      return {
        id: n.id,
        title: n.title,
        folder: n.folder,
        tags: n.tags,
        props: n.props,
        updated: n.updated,
        ...(archived || n.kind === 'canvas' ? {} : { body: n.body }),
      }
    }),
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      tagline: p.tagline,
      progress: p.progress,
      tags: p.tags,
      props: p.props,
      nextMoves: p.plans.map((e) => e.text),
      recent: p.history.slice(0, 5).map((e) => ({ date: e.date, text: e.text })),
    })),
    todos: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      due: t.dayOffset == null ? undefined : `${iso(offsetDate(t.dayOffset))}${t.dueTime != null ? ` ${hhmmOf(t.dueTime)}` : ''}`,
      source: t.source ?? 'manual',
      notes: t.notes,
    })),
    events: appts.map((a) => ({
      id: a.id,
      title: a.title,
      kind: a.kind,
      date: iso(offsetDate(a.dayOffset)),
      start: a.start,
      end: a.end,
      location: a.location,
      recurring: !!a.recurrence,
    })),
    crons: crons.map((c) => ({
      id: c.id,
      name: c.name,
      owner: c.owner,
      team: c.team,
      schedule: c.schedule,
      nextRun: new Date(cronNextRunMs(c.schedule)).toISOString(),
      status: c.status,
    })),
    teams: teams.map((t) => ({ id: t.id, name: t.name, members: t.members, description: t.description })),
  }
}

function hhmmOf(h: number): string {
  const m = Math.round(h * 60)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

// ---- sync status (shared, so any surface can show it) ----------------------

export interface SnapshotStatus {
  state: 'idle' | 'pushing' | 'ok' | 'error' | 'offline'
  at?: string
  bytes?: number
  error?: string
}
let status: SnapshotStatus = { state: 'idle' }
const listeners = new Set<() => void>()
function setStatus(s: SnapshotStatus) {
  status = s
  listeners.forEach((l) => l())
}
export function useSnapshotStatus(): SnapshotStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => status,
  )
}

let pushNow: (() => void) | null = null
/** Push immediately (the manual "Sync now" button). */
export function syncSnapshotNow() {
  pushNow?.()
}

/** Mounted once (AppShell): pushes the snapshot when the gateway is live,
 *  8 s after the last change, at most once every 30 s. */
export function SnapshotSync() {
  const { connection } = useAgentOsContext()
  const snap = useSnapshot()
  const key = JSON.stringify({ ...snap, exportedAt: '' })
  const last = useRef({ key: '', at: 0 })
  const latest = useRef(snap)
  latest.current = snap
  const [tick, setTick] = useState(0)
  const forced = useRef(false)

  useEffect(() => {
    pushNow = () => {
      forced.current = true
      last.current = { ...last.current, key: '' }
      setTick((t) => t + 1)
    }
    return () => {
      pushNow = null
    }
  }, [])

  useEffect(() => {
    if (connection !== 'live') {
      if (status.state !== 'ok') setStatus({ ...status, state: 'offline' })
      return
    }
    if (key === last.current.key) return
    // First push soon after load; after that, 8 s after the last change and
    // at most every 30 s. "Sync now" skips the wait.
    const delay = forced.current ? 0 : !last.current.at ? 2000 : Math.max(8000, 30_000 - (Date.now() - last.current.at))
    const id = window.setTimeout(async () => {
      forced.current = false
      setStatus({ ...status, state: 'pushing' })
      try {
        const res = await pushSnapshot({ ...latest.current, exportedAt: new Date().toISOString() })
        last.current = { key, at: Date.now() }
        setStatus({ state: 'ok', at: res.savedAt, bytes: res.bytes })
      } catch (e) {
        last.current = { key: '', at: Date.now() }
        setStatus({ state: 'error', error: e instanceof Error ? e.message : String(e), at: status.at })
      }
    }, delay)
    return () => window.clearTimeout(id)
  }, [key, connection, tick])

  return null
}

/** Download the snapshot as a file (works without a gateway). */
export function downloadSnapshot(snap: BaseSpaceSnapshot) {
  const blob = new Blob([JSON.stringify({ ...snap, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `basespace-snapshot-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
