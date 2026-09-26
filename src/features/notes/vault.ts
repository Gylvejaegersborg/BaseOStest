import type { Note } from '@/data/notes'
import { asList, contentOf } from './frontmatter'

// Pure vault helpers — paths, the folder tree, wikilink resolution, tag
// extraction and search. No React, no storage; notesStore and the editor
// both build on these.

/** Normalise a folder path: trimmed segments, no leading/trailing or
 *  doubled slashes. '' is the vault root. */
export function normFolder(path: string | undefined | null): string {
  return (path ?? '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('/')
}

export function joinPath(folder: string, name: string): string {
  return folder ? `${folder}/${name}` : name
}

export function parentOf(folder: string): string {
  const i = folder.lastIndexOf('/')
  return i === -1 ? '' : folder.slice(0, i)
}

export function baseName(folder: string): string {
  return folder.slice(folder.lastIndexOf('/') + 1)
}

/** True when `path` is `folder` itself or anything inside it. */
export function isWithin(path: string, folder: string): boolean {
  return path === folder || path.startsWith(`${folder}/`)
}

/** The Obsidian-style vault path of a note, e.g. "Music/Mixing/Vocal chain.md". */
export const EXT: Record<NonNullable<Note['kind']>, string> = { markdown: 'md', canvas: 'canvas', base: 'base' }

export function notePath(n: Pick<Note, 'folder' | 'title' | 'kind'>): string {
  return `${joinPath(n.folder, n.title)}.${EXT[n.kind ?? 'markdown']}`
}

/** Every folder that exists — explicit (possibly empty) ones plus those
 *  implied by notes — including all their ancestors. */
export function allFolders(notes: Note[], explicit: string[]): string[] {
  const out = new Set<string>()
  const add = (f: string) => {
    let cur = normFolder(f)
    while (cur) {
      out.add(cur)
      cur = parentOf(cur)
    }
  }
  explicit.forEach(add)
  notes.forEach((n) => add(n.folder))
  return [...out]
}

/** A title that doesn't collide with an existing note in the same folder
 *  ("Untitled", "Untitled 1", "Untitled 2", …). */
export function uniqueTitle(notes: Note[], folder: string, wanted: string, exceptId?: string): string {
  const taken = new Set(
    notes.filter((n) => n.folder === folder && n.id !== exceptId).map((n) => n.title.toLowerCase()),
  )
  if (!taken.has(wanted.toLowerCase())) return wanted
  for (let i = 1; ; i++) {
    const candidate = `${wanted} ${i}`
    if (!taken.has(candidate.toLowerCase())) return candidate
  }
}

export function uniqueFolder(existing: string[], parent: string, wanted: string): string {
  const taken = new Set(existing.map((f) => f.toLowerCase()))
  let candidate = joinPath(parent, wanted)
  for (let i = 1; taken.has(candidate.toLowerCase()); i++) candidate = joinPath(parent, `${wanted} ${i}`)
  return candidate
}

// ---- legacy title-in-body -------------------------------------------------

/** Splits a leading `# Heading` (optionally after blank lines) off a body.
 *  Notes used to carry their title as the body's first H1; the title now
 *  lives in the header bar, so this migrates those bodies. */
export function splitLeadingH1(body: string): { title: string; rest: string } | null {
  const m = body.match(/^\s*#[ \t]+(.+?)[ \t#]*(?:\r?\n|$)/)
  if (!m) return null
  return { title: m[1].trim(), rest: body.slice(m[0].length).replace(/^\s*\n/, '') }
}

// ---- links ----------------------------------------------------------------

export interface WikiTarget {
  /** The note part — a title or a folder/title path. */
  note: string
  heading: string | null
}

/** "Folder/Note#Heading" → { note, heading }. Block refs (#^id) are
 *  treated as a heading we can't locate — the note still opens. */
export function parseWikiTarget(raw: string): WikiTarget {
  const hash = raw.indexOf('#')
  const note = (hash === -1 ? raw : raw.slice(0, hash)).trim().replace(/\.md$/i, '')
  const heading = hash === -1 ? null : raw.slice(hash + 1).replace(/^\^/, '').trim() || null
  return { note, heading }
}

/** Resolves a wikilink target to a note, Obsidian-style: an exact vault
 *  path wins, then a title match — preferring the linking note's own
 *  folder, then the shallowest path. Empty target = the note itself. */
export function resolveNote(notes: Note[], target: string, from?: Note | null): Note | null {
  const t = normFolder(target).toLowerCase()
  if (!t) return from ?? null
  const byPath = notes.find((n) => joinPath(n.folder, n.title).toLowerCase() === t)
  if (byPath) return byPath
  const name = baseName(t)
  let matches = notes.filter((n) => n.title.toLowerCase() === name)
  if (!matches.length) {
    // Obsidian's `aliases` property makes a note linkable by other names.
    matches = notes.filter((n) => asList(n.props?.aliases).some((a) => a.toLowerCase() === name))
  }
  if (!matches.length) return null
  if (t.includes('/')) {
    // Partial path ("Mixing/Vocal chain") — match the folder suffix.
    const dir = parentOf(t)
    const suffix = matches.find((n) => n.folder.toLowerCase().endsWith(dir))
    if (suffix) return suffix
  }
  if (from) {
    const sibling = matches.find((n) => n.folder === from.folder)
    if (sibling) return sibling
  }
  return [...matches].sort((a, b) => a.folder.split('/').length - b.folder.split('/').length)[0]
}

/** Every `[[target]]` / `![[target]]` note part in a body. */
export function wikiTargets(body: string): string[] {
  const out: string[] = []
  const re = /!?\[\[([^\]\n|#]*)(?:#[^\]\n|]*)?(?:\|[^\]\n]*)?\]\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) out.push(m[1].trim())
  return out
}

/** Notes that link to `target` — the Linked mentions panel. */
export function backlinks(notes: Note[], target: Note): Note[] {
  return notes.filter(
    (n) => n.id !== target.id && wikiTargets(n.body).some((t) => resolveNote(notes, t, n)?.id === target.id),
  )
}

/** `[[target#heading|alias]]` split into (open, target, rest) groups —
 *  used to rewrite link targets on rename/move. */
export const WIKILINK_RE = /(!?\[\[)([^\]\n|#]*)((?:#[^\]\n|]*)?(?:\|[^\]\n]*)?\]\])/g

// ---- tags -----------------------------------------------------------------

/** Obsidian tag syntax: letters, digits, _ - /, at least one non-digit. */
export const TAG_BODY = /[\p{L}\p{N}_\-/]*[\p{L}_\-/][\p{L}\p{N}_\-/]*/u

export function cleanTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, '-').toLowerCase()
}

/** Inline #tags in a body, skipping code blocks, inline code and headings. */
export function inlineTags(body: string): string[] {
  const text = contentOf(body).replace(/```[\s\S]*?(```|$)/g, ' ').replace(/`[^`\n]*`/g, ' ')
  const out = new Set<string>()
  const re = new RegExp(`(^|[\\s(])#(${TAG_BODY.source})`, 'gu')
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) out.add(m[2].toLowerCase().replace(/\/+$/, ''))
  return [...out]
}

/** A note's full tag set — the tag bar's tags plus inline ones. */
export function noteTags(n: Note): string[] {
  return [...new Set([...n.tags, ...inlineTags(n.body)])]
}

/** Tag match that includes nested children: "music" matches "music/mixing". */
export function hasTag(tags: string[], wanted: string): boolean {
  return tags.some((t) => t === wanted || t.startsWith(`${wanted}/`))
}

// ---- search ---------------------------------------------------------------

export interface ParsedQuery {
  terms: string[]
  tags: string[]
  paths: string[]
  files: string[]
}

/** Obsidian-flavoured search: plain words and "quoted phrases" (all must
 *  match), plus tag:, path: and file: operators. */
export function parseQuery(q: string): ParsedQuery {
  const out: ParsedQuery = { terms: [], tags: [], paths: [], files: [] }
  const re = /(\w+:)?(?:"([^"]*)"|(\S+))/g
  let m: RegExpExecArray | null
  while ((m = re.exec(q))) {
    const op = m[1]?.toLowerCase()
    const value = (m[2] ?? m[3] ?? '').toLowerCase()
    if (!value) continue
    if (op === 'tag:') out.tags.push(cleanTag(value))
    else if (op === 'path:') out.paths.push(value)
    else if (op === 'file:') out.files.push(value)
    else out.terms.push(op ? `${op}${value}` : value)
  }
  return out
}

export function matchesQuery(n: Note, q: ParsedQuery, tags: string[]): boolean {
  const title = n.title.toLowerCase()
  if (q.files.some((f) => !title.includes(f))) return false
  if (q.paths.some((p) => !joinPath(n.folder, n.title).toLowerCase().includes(p))) return false
  if (q.tags.some((t) => !hasTag(tags, t))) return false
  if (q.terms.length) {
    const hay = `${title}\n${n.body.toLowerCase()}\n${tags.join(' ')}`
    if (q.terms.some((t) => !hay.includes(t))) return false
  }
  return true
}

export function isEmptyQuery(q: ParsedQuery): boolean {
  return !q.terms.length && !q.tags.length && !q.paths.length && !q.files.length
}
