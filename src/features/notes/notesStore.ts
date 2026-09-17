import { useMemo, useState, useEffect } from 'react'
import { NOTES, NOTE_FOLDERS, type Note } from '@/data/notes'
import { useOsOverlay, mergeById } from '@/features/team/osOverlay'

export const NOTES_STORAGE = {
  drafts: 'os:notes:drafts',
  userNotes: 'os:notes:user',
  deleted: 'os:notes:deleted',
  tags: 'os:notes:tags',
}

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

/** Derive a display title from the body's first H1, falling back to the
 *  stored title — shared so a note created elsewhere (e.g. Workbench's
 *  "Send to Notes") titles itself the same way Notes.tsx does. */
export function titleFromBody(body: string, fallback: string): string {
  const m = body.match(/^#\s+(.+)$/m)
  return m ? m[1].trim() : fallback
}

/** The same merged/active note list Notes.tsx renders — user notes + seed
 *  notes + agent-authored overlay notes, minus anything deleted. Shared so
 *  the Workbench note-retrieval picker searches the exact same set. */
export function useNotesList(): Note[] {
  const overlay = useOsOverlay()
  const [userNotes, setUserNotes] = useState<Note[]>(() => loadJSON<Note[]>(NOTES_STORAGE.userNotes, []))
  const [deleted, setDeleted] = useState<string[]>(() => loadJSON<string[]>(NOTES_STORAGE.deleted, []))

  // Pick up notes created/deleted in another mounted instance (e.g. this
  // hook is live in both Notes.tsx and Workbench's note picker/dock at once).
  useEffect(() => {
    const onStorage = () => {
      setUserNotes(loadJSON<Note[]>(NOTES_STORAGE.userNotes, []))
      setDeleted(loadJSON<string[]>(NOTES_STORAGE.deleted, []))
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('os:notes:changed', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('os:notes:changed', onStorage)
    }
  }, [])

  return useMemo(() => {
    const del = new Set(deleted)
    return mergeById([...userNotes, ...NOTES], overlay.notes).filter((n) => !del.has(n.id))
  }, [userNotes, deleted, overlay.notes])
}

/** Creates a new user note from arbitrary text (e.g. a chat message) and
 *  persists it the same way Notes.tsx's own addNote() does, so it shows up
 *  there immediately. Returns the new note's id. */
export function createNoteFromText(text: string, opts?: { title?: string; folder?: string }): string {
  const id = `note-user-${Date.now()}`
  const folder = opts?.folder ?? (NOTE_FOLDERS.includes('Journal') ? 'Journal' : NOTE_FOLDERS[0])
  const title = opts?.title ?? titleFromBody(text, 'Untitled')
  const body = /^#\s+/.test(text.trim()) ? text : `# ${title}\n\n${text}`
  const note: Note = { id, title, folder, tags: [], updated: new Date().toISOString(), body }
  const existing = loadJSON<Note[]>(NOTES_STORAGE.userNotes, [])
  saveJSON(NOTES_STORAGE.userNotes, [note, ...existing])
  window.dispatchEvent(new Event('os:notes:changed'))
  return id
}
