import { useMemo, useSyncExternalStore } from 'react'
import { NOTES, NOTE_FOLDERS, type Note } from '@/data/notes'
import { useOsOverlay, mergeById } from '@/features/team/osOverlay'
import {
  allFolders,
  isWithin,
  joinPath,
  normFolder,
  parentOf,
  baseName,
  resolveNote,
  splitLeadingH1,
  uniqueFolder,
  uniqueTitle,
  WIKILINK_RE,
} from './vault'

export const NOTES_STORAGE = {
  drafts: 'os:notes:drafts',
  userNotes: 'os:notes:user',
  deleted: 'os:notes:deleted',
  tags: 'os:notes:tags',
  /** Per-note title/folder/timestamp overrides (renames, moves, edits). */
  meta: 'os:notes:meta',
  /** Explicitly created folders — so empty folders survive. */
  folders: 'os:notes:folders',
  /** Bumped when stored bodies/titles need a one-time migration. */
  schema: 'os:notes:schema',
}

const SCHEMA = 2

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full / disabled — the in-memory store still works this session */
  }
}

/** Derive a display title from a body's leading H1, falling back to the
 *  given title. Kept for callers that still get markdown with a title
 *  heading (e.g. a chat message sent to Notes). */
export function titleFromBody(body: string, fallback: string): string {
  return splitLeadingH1(body)?.title ?? fallback
}

// ---- the store ----------------------------------------------------------

interface NoteMeta {
  title?: string
  folder?: string
  updated?: string
  created?: string
}

interface VaultState {
  drafts: Record<string, string>
  userNotes: Note[]
  deleted: string[]
  tags: Record<string, string[]>
  meta: Record<string, NoteMeta>
  folders: string[]
}

type Key = keyof VaultState

function read(): VaultState {
  return {
    drafts: loadJSON(NOTES_STORAGE.drafts, {}),
    userNotes: loadJSON<Note[]>(NOTES_STORAGE.userNotes, []),
    deleted: loadJSON<string[]>(NOTES_STORAGE.deleted, []),
    tags: loadJSON(NOTES_STORAGE.tags, {}),
    meta: loadJSON(NOTES_STORAGE.meta, {}),
    folders: loadJSON<string[]>(NOTES_STORAGE.folders, []),
  }
}

/** Notes used to carry their title as the body's first `# H1` (the header
 *  showed that H1). The title now lives on its own, edited in the header
 *  bar — so pull the H1 out of stored bodies once. */
function migrate(s: VaultState): VaultState {
  if (loadJSON<number>(NOTES_STORAGE.schema, 0) >= SCHEMA) return s
  const userNotes = s.userNotes.map((n) => {
    const h = splitLeadingH1(n.body)
    return h ? { ...n, title: h.title, body: h.rest, folder: normFolder(n.folder) } : n
  })
  const drafts = { ...s.drafts }
  const meta = { ...s.meta }
  for (const [id, body] of Object.entries(drafts)) {
    const h = splitLeadingH1(body)
    if (!h) continue
    drafts[id] = h.rest
    meta[id] = { ...meta[id], title: h.title }
  }
  const next = { ...s, userNotes, drafts, meta }
  saveJSON(NOTES_STORAGE.userNotes, userNotes)
  saveJSON(NOTES_STORAGE.drafts, drafts)
  saveJSON(NOTES_STORAGE.meta, meta)
  saveJSON(NOTES_STORAGE.schema, SCHEMA)
  return next
}

let state: VaultState = migrate(read())
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function commit(patch: Partial<VaultState>) {
  state = { ...state, ...patch }
  for (const key of Object.keys(patch) as Key[]) saveJSON(NOTES_STORAGE[key], state[key])
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Another tab edited the vault — reload from storage.
  const onStorage = (e: StorageEvent) => {
    if (e.key && !e.key.startsWith('os:notes:')) return
    state = read()
    emit()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function derive(s: VaultState, overlayNotes: Note[]): Note[] {
  const del = new Set(s.deleted)
  return mergeById([...s.userNotes, ...NOTES], overlayNotes)
    .filter((n) => !del.has(n.id))
    .map((n) => {
      const m = s.meta[n.id] ?? {}
      const title = m.title ?? n.title
      let body = s.drafts[n.id] ?? n.body
      // Agent-authored (overlay) notes may still open with `# <title>` —
      // drop it when it just repeats the title the header already shows.
      if (s.drafts[n.id] == null) {
        const h = splitLeadingH1(body)
        if (h && h.title.toLowerCase() === title.trim().toLowerCase()) body = h.rest
      }
      return {
        ...n,
        title,
        body,
        folder: normFolder(m.folder ?? n.folder),
        tags: s.tags[n.id] ?? n.tags ?? [],
        updated: m.updated ?? n.updated,
        created: m.created ?? n.created ?? n.updated,
      }
    })
}

export interface Vault {
  notes: Note[]
  /** Every folder path, including empty and implied ancestor folders. */
  folders: string[]
}

export function useVault(): Vault {
  const s = useSyncExternalStore(subscribe, () => state)
  const overlay = useOsOverlay()
  return useMemo(() => {
    const notes = derive(s, overlay.notes)
    return { notes, folders: allFolders(notes, s.folders) }
  }, [s, overlay.notes])
}

/** The merged, active note list — user notes + seed notes + agent-authored
 *  overlay notes, minus anything deleted, with every edit applied. Shared
 *  so the Workbench note picker/dock sees exactly what Notes shows. */
export function useNotesList(): Note[] {
  return useVault().notes
}

// ---- mutations ----------------------------------------------------------

const now = () => new Date().toISOString()
const newId = () => `note-user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

function patchMeta(id: string, patch: NoteMeta, meta = state.meta) {
  return { ...meta, [id]: { ...meta[id], ...patch } }
}

export function updateBody(id: string, body: string) {
  commit({ drafts: { ...state.drafts, [id]: body }, meta: patchMeta(id, { updated: now() }) })
}

export function setTags(id: string, tags: string[]) {
  commit({ tags: { ...state.tags, [id]: tags } })
}

export function createNote(
  notes: Note[],
  opts: { folder?: string; title?: string; body?: string } = {},
): string {
  const folder = normFolder(opts.folder)
  const title = uniqueTitle(notes, folder, opts.title?.trim() || 'Untitled')
  const ts = now()
  const note: Note = { id: newId(), title, folder, tags: [], updated: ts, created: ts, body: opts.body ?? '' }
  commit({ userNotes: [note, ...state.userNotes] })
  return note.id
}

export function duplicateNote(notes: Note[], id: string, folder?: string): string | null {
  const src = notes.find((n) => n.id === id)
  if (!src) return null
  const target = folder ?? src.folder
  const copyId = createNote(notes, { folder: target, title: folder == null ? `${src.title} copy` : src.title, body: src.body })
  if (src.tags.length) setTags(copyId, [...src.tags])
  return copyId
}

function dropNotes(ids: string[]) {
  const gone = new Set(ids)
  const strip = <T,>(rec: Record<string, T>) => Object.fromEntries(Object.entries(rec).filter(([k]) => !gone.has(k)))
  commit({
    userNotes: state.userNotes.filter((n) => !gone.has(n.id)),
    deleted: [...new Set([...state.deleted, ...ids.filter((id) => !id.startsWith('note-user-'))])],
    drafts: strip(state.drafts),
    tags: strip(state.tags),
    meta: strip(state.meta),
  })
}

export function deleteNote(id: string) {
  dropNotes([id])
}

/** Rewrites every wikilink that resolves to `id` — used on rename/move so
 *  links keep pointing at the note, like Obsidian's "update internal links". */
function relink(notes: Note[], id: string, toPath: (target: string) => string) {
  const drafts = { ...state.drafts }
  let changed = false
  for (const n of notes) {
    const next = n.body.replace(WIKILINK_RE, (all, open: string, target: string, rest: string) =>
      target.trim() && resolveNote(notes, target.trim(), n)?.id === id ? `${open}${toPath(target.trim())}${rest}` : all,
    )
    if (next === n.body) continue
    drafts[n.id] = next
    changed = true
  }
  if (changed) commit({ drafts })
}

export function renameNote(notes: Note[], id: string, title: string): string {
  const note = notes.find((n) => n.id === id)
  const clean = title.replace(/[\\/[\]#|^:]/g, ' ').trim() || 'Untitled'
  if (!note || clean === note.title) return note?.title ?? clean
  const final = uniqueTitle(notes, note.folder, clean, id)
  relink(notes, id, (t) => (t.includes('/') ? joinPath(note.folder, final) : final))
  commit({ meta: patchMeta(id, { title: final, updated: now() }) })
  return final
}

export function moveNote(notes: Note[], id: string, folder: string) {
  const note = notes.find((n) => n.id === id)
  const dest = normFolder(folder)
  if (!note || note.folder === dest) return
  const title = uniqueTitle(notes, dest, note.title, id)
  relink(notes, id, (t) => (t.includes('/') ? joinPath(dest, title) : title))
  commit({ meta: patchMeta(id, { folder: dest, ...(title !== note.title ? { title } : {}) }) })
}

export function createFolder(folders: string[], parent: string, name = 'Untitled folder'): string {
  const path = uniqueFolder(folders, normFolder(parent), name)
  commit({ folders: [...new Set([...state.folders, path])] })
  return path
}

/** Renames/moves a folder (and everything inside it) from `from` to `to`. */
export function moveFolder(notes: Note[], from: string, to: string): string | null {
  const src = normFolder(from)
  let dest = normFolder(to)
  if (!src || src === dest || isWithin(dest, src)) return null
  const existing = allFolders(notes, state.folders)
  if (existing.some((f) => f.toLowerCase() === dest.toLowerCase())) dest = uniqueFolder(existing, parentOf(dest), baseName(dest))
  const remap = (f: string) => (isWithin(f, src) ? dest + f.slice(src.length) : f)
  let meta = state.meta
  for (const n of notes) if (isWithin(n.folder, src)) meta = patchMeta(n.id, { folder: remap(n.folder) }, meta)
  commit({ meta, folders: [...new Set([...state.folders.map(remap), dest])] })
  return dest
}

export function deleteFolder(notes: Note[], path: string) {
  const src = normFolder(path)
  dropNotes(notes.filter((n) => isWithin(n.folder, src)).map((n) => n.id))
  commit({ folders: state.folders.filter((f) => !isWithin(f, src)) })
}

export function duplicateFolder(notes: Note[], folders: string[], path: string): string {
  const src = normFolder(path)
  const dest = uniqueFolder(folders, parentOf(src), `${baseName(src)} copy`)
  const subfolders = folders.filter((f) => isWithin(f, src)).map((f) => dest + f.slice(src.length))
  commit({ folders: [...new Set([...state.folders, ...subfolders])] })
  let working = notes
  for (const n of notes.filter((x) => isWithin(x.folder, src))) {
    const folder = dest + n.folder.slice(src.length)
    const id = createNote(working, { folder, title: n.title, body: n.body })
    if (n.tags.length) setTags(id, [...n.tags])
    working = [...working, { ...n, id, folder }]
  }
  return dest
}

/** Creates a new user note from arbitrary text (e.g. a chat message).
 *  A leading `# H1` becomes the title. Returns the new note's id. */
export function createNoteFromText(text: string, opts?: { title?: string; folder?: string }): string {
  const h = splitLeadingH1(text)
  const folder = opts?.folder ?? (NOTE_FOLDERS.includes('Journal') ? 'Journal' : NOTE_FOLDERS[0] ?? '')
  const title = opts?.title ?? h?.title ?? 'Untitled'
  const body = h && (!opts?.title || h.title === opts.title) ? h.rest : text
  return createNote(derive(state, []), { folder, title, body })
}
