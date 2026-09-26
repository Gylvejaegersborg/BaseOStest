import type { Note } from '@/data/notes'
import type { PropType } from '../frontmatter'
import { hasTag, isWithin, notePath, noteTags, wikiTargets } from '../vault'
import { runFormula, type Value } from './formula'
import type { BaseFilter, BaseSort, BaseView } from './types'

// Turns notes into base rows: resolves property ids (file.*, note
// properties, formula.*), applies a view's filters, sort and grouping.

export const FILE_PROPS: Record<string, string> = {
  'file.name': 'Name',
  'file.folder': 'Folder',
  'file.path': 'Path',
  'file.ext': 'Extension',
  'file.tags': 'Tags',
  'file.mtime': 'Modified',
  'file.ctime': 'Created',
  'file.size': 'Size',
  'file.links': 'Links',
}

export function propLabel(id: string): string {
  if (FILE_PROPS[id]) return FILE_PROPS[id]
  if (id.startsWith('formula.')) return id.slice(8)
  if (id.startsWith('note.')) return id.slice(5)
  return id
}

export const isFormula = (id: string) => id.startsWith('formula.')
export const isFileProp = (id: string) => id.startsWith('file.')
/** Note properties are editable from the base; file.* and formulas aren't
 *  (except file.name, which renames). */
export const noteKey = (id: string) => (id.startsWith('note.') ? id.slice(5) : id)

export type Getter = (note: Note, id: string) => Value

/** Builds a resolver for property ids, with formulas evaluated lazily and
 *  guarded against cycles. Errors show as "⚠ message". */
export function makeGetter(formulas: Record<string, string>): Getter {
  const get = (note: Note, id: string, depth = 0): Value => {
    switch (id) {
      case 'file.name':
        return note.title
      case 'file.folder':
        return note.folder
      case 'file.path':
        return notePath(note)
      case 'file.ext':
        return notePath(note).split('.').pop() ?? ''
      case 'file.tags':
        return noteTags(note)
      case 'file.mtime':
        return note.updated
      case 'file.ctime':
        return note.created ?? note.updated
      case 'file.size':
        return note.body.length
      case 'file.links':
        return wikiTargets(note.body)
    }
    if (isFormula(id)) {
      const src = formulas[id.slice(8)]
      if (src == null) return null
      if (depth > 8) return '⚠ formula loop'
      const r = runFormula(src, (name) => get(note, name.startsWith('formula.') || name.startsWith('file.') ? name : noteKey(name), depth + 1))
      return 'error' in r ? `⚠ ${r.error}` : r.value
    }
    const v = note.props?.[noteKey(id)]
    return v === undefined ? null : v
  }
  return (note, id) => get(note, id)
}

const str = (v: Value) => (v == null ? '' : Array.isArray(v) ? v.join(', ') : String(v))

export function matchFilter(note: Note, f: BaseFilter, get: Getter): boolean {
  if (f.op === 'has tag') return hasTag(noteTags(note), f.value.replace(/^#/, '').toLowerCase())
  if (f.op === 'in folder') return isWithin(note.folder, f.value.replace(/^\/|\/$/g, ''))
  const v = get(note, f.prop)
  const want = f.value.trim().toLowerCase()
  const s = str(v).toLowerCase()
  const num = (x: string) => (x !== '' && !Number.isNaN(Number(x)) ? Number(x) : null)
  switch (f.op) {
    case 'is':
      if (Array.isArray(v)) return v.some((x) => x.toLowerCase() === want)
      return s === want
    case 'is not':
      if (Array.isArray(v)) return !v.some((x) => x.toLowerCase() === want)
      return s !== want
    case 'contains':
      return Array.isArray(v) ? v.some((x) => x.toLowerCase().includes(want)) : s.includes(want)
    case 'does not contain':
      return Array.isArray(v) ? !v.some((x) => x.toLowerCase().includes(want)) : !s.includes(want)
    case 'starts with':
      return s.startsWith(want)
    case 'ends with':
      return s.endsWith(want)
    case 'is empty':
      return v == null || s === ''
    case 'is not empty':
      return !(v == null || s === '')
    default: {
      if (v == null || s === '') return false
      const a = num(s)
      const b = num(want)
      const [x, y] = a != null && b != null ? [a, b] : [s, want]
      if (f.op === '>') return x > y
      if (f.op === '<') return x < y
      if (f.op === '>=') return x >= y
      return x <= y
    }
  }
}

export function compareValues(a: Value, b: Value): number {
  const ea = a == null || str(a) === ''
  const eb = b == null || str(b) === ''
  if (ea || eb) return ea === eb ? 0 : ea ? 1 : -1 // empties last
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(b) - Number(a)
  return str(a).localeCompare(str(b), undefined, { numeric: true, sensitivity: 'base' })
}

export function sortRows(notes: Note[], sort: BaseSort[], get: Getter): Note[] {
  if (!sort.length) return notes
  return [...notes].sort((x, y) => {
    for (const s of sort) {
      const c = compareValues(get(x, s.prop), get(y, s.prop))
      if (c) return s.dir === 'asc' ? c : -c
    }
    return 0
  })
}

export function runView(view: BaseView, all: Note[], get: Getter, selfId: string): Note[] {
  const candidates = all.filter((n) => n.id !== selfId && (n.kind ?? 'markdown') === 'markdown')
  const active = view.filters.filter((f) => f.prop || f.op === 'has tag' || f.op === 'in folder')
  const rows = active.length
    ? candidates.filter((n) =>
        view.match === 'any' ? active.some((f) => matchFilter(n, f, get)) : active.every((f) => matchFilter(n, f, get)),
      )
    : candidates
  return sortRows(rows, view.sort, get)
}

export function groupRows(rows: Note[], by: string | null, get: Getter): [string, Note[]][] {
  if (!by) return [['', rows]]
  const groups = new Map<string, Note[]>()
  for (const n of rows) {
    const key = str(get(n, by)) || '(empty)'
    groups.set(key, [...(groups.get(key) ?? []), n])
  }
  return [...groups].sort(([a], [b]) => (a === '(empty)' ? 1 : b === '(empty)' ? -1 : a.localeCompare(b, undefined, { numeric: true })))
}

/** Every property id a view can show: file props, vault properties, formulas. */
export function allPropIds(propTypes: Record<string, PropType>, formulas: Record<string, string>): string[] {
  return [
    ...Object.keys(FILE_PROPS),
    ...Object.keys(propTypes).filter((k) => k !== 'tags').sort(),
    ...Object.keys(formulas).map((f) => `formula.${f}`),
  ]
}

export function formatValue(v: Value): string {
  if (v == null) return ''
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, '')
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return v
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  }
  return v
}
