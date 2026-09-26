import type { EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'

// Markdown table model + the edits the table widget offers (cell edits,
// inserting/deleting rows and columns, alignment). Every edit parses the
// table fresh from the document and writes the whole table back.

export type Align = 'left' | 'center' | 'right' | null

export interface TableModel {
  /** rows[0] is the header row. Cells are unescaped markdown. */
  rows: string[][]
  aligns: Align[]
}

export function splitRow(line: string): string[] {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1)
  return s.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'))
}

export function parseTable(src: string): TableModel {
  const lines = src.split('\n').filter((l) => l.trim())
  const header = splitRow(lines[0] ?? '')
  const aligns: Align[] = splitRow(lines[1] ?? '').map((c) =>
    c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : c.startsWith(':') ? 'left' : null,
  )
  const width = header.length
  const body = lines.slice(2).map(splitRow)
  const fit = (r: string[]) => Array.from({ length: width }, (_, i) => r[i] ?? '')
  return { rows: [fit(header), ...body.map(fit)], aligns: Array.from({ length: width }, (_, i) => aligns[i] ?? null) }
}

export function serializeTable(t: TableModel): string {
  const esc = (c: string) => c.replace(/\|/g, '\\|')
  const cols = t.rows[0].length
  const widths = Array.from({ length: cols }, (_, c) => Math.max(3, ...t.rows.map((r) => esc(r[c] ?? '').length)))
  const row = (r: string[]) => `| ${r.map((c, i) => esc(c).padEnd(widths[i])).join(' | ')} |`
  const delim = `| ${widths
    .map((w, i) => {
      const a = t.aligns[i]
      if (a === 'center') return `:${'-'.repeat(w - 2)}:`
      if (a === 'right') return `${'-'.repeat(w - 1)}:`
      if (a === 'left') return `:${'-'.repeat(w - 1)}`
      return '-'.repeat(w)
    })
    .join(' | ')} |`
  return [row(t.rows[0]), delim, ...t.rows.slice(1).map(row)].join('\n')
}

/** The document range (whole lines) of the table starting at/around `pos`. */
export function tableAt(state: EditorState, pos: number): { from: number; to: number } | null {
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(Math.min(pos + 1, state.doc.length), 1)
  while (node && node.name !== 'Table') node = node.parent
  if (!node) {
    // Resolve from the line start instead (block widgets sit at line start).
    const line = state.doc.lineAt(pos)
    node = syntaxTree(state).resolveInner(line.from, 1)
    while (node && node.name !== 'Table') node = node.parent
  }
  if (!node) return null
  return { from: state.doc.lineAt(node.from).from, to: state.doc.lineAt(node.to).to }
}

/** Parses the table at `pos`, applies `fn`, writes it back. */
export function editTable(view: EditorView, pos: number, fn: (t: TableModel) => void): boolean {
  const range = tableAt(view.state, pos)
  if (!range) return false
  const model = parseTable(view.state.sliceDoc(range.from, range.to))
  fn(model)
  const next = serializeTable(model)
  if (next === view.state.sliceDoc(range.from, range.to)) return false
  view.dispatch({ changes: { from: range.from, to: range.to, insert: next } })
  return true
}

export const tableEdits = {
  setCell: (r: number, c: number, value: string) => (t: TableModel) => {
    t.rows[r][c] = value.replace(/\n/g, ' ')
  },
  insertRow: (at: number) => (t: TableModel) => {
    // Never above the header: row 0 is the header, so the minimum is 1.
    t.rows.splice(Math.max(1, at), 0, t.rows[0].map(() => ''))
  },
  deleteRow: (r: number) => (t: TableModel) => {
    if (r > 0) t.rows.splice(r, 1)
  },
  insertCol: (at: number) => (t: TableModel) => {
    t.rows.forEach((row, i) => row.splice(at, 0, i === 0 ? `Column ${t.rows[0].length + 1}` : ''))
    t.aligns.splice(at, 0, null)
  },
  deleteCol: (c: number) => (t: TableModel) => {
    if (t.rows[0].length <= 1) return
    t.rows.forEach((row) => row.splice(c, 1))
    t.aligns.splice(c, 1)
  },
  align: (c: number, a: Align) => (t: TableModel) => {
    t.aligns[c] = a
  },
}

// After an edit the table widget is rebuilt; this remembers which cell
// should reopen for typing in the new DOM (e.g. Tab to the next cell).
let pending: { view: EditorView; from: number; r: number; c: number } | null = null

export function focusTableCellSoon(view: EditorView, from: number, r: number, c: number) {
  pending = { view, from, r, c }
}

export function takePendingFocus(view: EditorView, from: number): { r: number; c: number } | null {
  if (!pending || pending.view !== view || pending.from !== from) return null
  const { r, c } = pending
  pending = null
  return { r, c }
}
