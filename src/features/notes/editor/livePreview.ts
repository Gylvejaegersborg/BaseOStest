import { EditorState, Facet, StateEffect, StateField, type Range } from '@codemirror/state'
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view'
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'
import { parseWikiTarget } from '../vault'
import { openContextMenu } from '../menuBus'
import { editTable, focusTableCellSoon, parseTable, tableEdits, takePendingFocus, type TableModel } from './tableOps'

// Obsidian-style Live Preview: the document is always rendered, and the
// markdown syntax of an element only appears while the cursor is inside it
// (headings, quotes and rules reveal per line; callouts, tables and code
// blocks reveal as a whole block). When the editor isn't focused, nothing
// is revealed — the note reads like reading view.

export interface LivePreviewHandlers {
  openWiki(target: string): void
  openUrl(url: string): void
  openTag(tag: string): void
  /** Whether a wikilink's note part resolves to an existing note. */
  resolves(note: string): boolean
}

export const previewHandlers = Facet.define<LivePreviewHandlers, LivePreviewHandlers>({
  combine: (v) => v[0],
})

/** Dispatch after the note list changes so unresolved-link styling updates. */
export const refreshLinks = StateEffect.define<null>()

export const setFocus = StateEffect.define<boolean>()
const focusField = StateField.define<boolean>({
  create: () => false,
  update(v, tr) {
    for (const e of tr.effects) if (e.is(setFocus)) v = e.value
    return v
  },
})

// ---- widgets --------------------------------------------------------------

class BulletWidget extends WidgetType {
  eq() {
    return true
  }
  toDOM() {
    const s = document.createElement('span')
    s.className = 'cm-lp-bullet'
    s.textContent = '•'
    return s
  }
}

class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) {
    super()
  }
  eq(o: CheckboxWidget) {
    return o.checked === this.checked
  }
  toDOM() {
    const box = document.createElement('input')
    box.type = 'checkbox'
    box.className = 'cm-lp-task'
    box.checked = this.checked
    return box
  }
  ignoreEvent() {
    return false
  }
}

class HrWidget extends WidgetType {
  eq() {
    return true
  }
  toDOM() {
    const s = document.createElement('span')
    s.className = 'cm-lp-hr'
    return s
  }
  ignoreEvent() {
    return false
  }
}

class ImageWidget extends WidgetType {
  constructor(readonly src: string, readonly alt: string) {
    super()
  }
  eq(o: ImageWidget) {
    return o.src === this.src && o.alt === this.alt
  }
  toDOM() {
    const img = document.createElement('img')
    img.className = 'cm-lp-image'
    img.src = this.src
    img.alt = this.alt
    img.loading = 'lazy'
    return img
  }
  ignoreEvent() {
    return false
  }
}

// Lucide-style 24×24 stroke icons for callout headers.
const ICONS: Record<string, string> = {
  note: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  abstract: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  todo: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  tip: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.2.3 1.6 1.4 2.7 2.5 2.7Z"/>',
  success: '<path d="M20 6 9 17l-5-5"/>',
  question: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  warning: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  failure: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  danger: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  bug: '<path d="m8 2 1.9 1.9"/><path d="M14.1 3.9 16 2"/><path d="M9 7.1v-1a3 3 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/>',
  example: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
  quote: '<path d="M3 21c3 0 7-1 7-8V5c0-1.3-.8-2-2-2H4c-1.3 0-2 .8-2 2v6c0 1.3.8 2 2 2h3c0 4-2 6-4 6"/><path d="M15 21c3 0 7-1 7-8V5c0-1.3-.8-2-2-2h-4c-1.3 0-2 .8-2 2v6c0 1.3.8 2 2 2h3c0 4-2 6-4 6"/>',
}

const CALLOUT_ALIASES: Record<string, string> = {
  summary: 'abstract', tldr: 'abstract', hint: 'tip', important: 'tip', check: 'success', done: 'success',
  help: 'question', faq: 'question', caution: 'warning', attention: 'warning', fail: 'failure',
  missing: 'failure', error: 'danger', cite: 'quote',
}

function calloutType(raw: string): string {
  const t = raw.toLowerCase()
  const c = CALLOUT_ALIASES[t] ?? t
  return ICONS[c] ? c : 'note'
}

function svgIcon(body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
}

class CalloutTitleWidget extends WidgetType {
  constructor(readonly type: string, readonly title: string) {
    super()
  }
  eq(o: CalloutTitleWidget) {
    return o.type === this.type && o.title === this.title
  }
  toDOM() {
    const s = document.createElement('span')
    s.className = 'cm-lp-callout-title'
    s.innerHTML = svgIcon(ICONS[this.type])
    const label = document.createElement('span')
    label.textContent = this.title
    s.appendChild(label)
    return s
  }
  ignoreEvent() {
    return false
  }
}

class CodeHeaderWidget extends WidgetType {
  constructor(readonly lang: string, readonly code: string) {
    super()
  }
  eq(o: CodeHeaderWidget) {
    return o.lang === this.lang && o.code === this.code
  }
  toDOM() {
    const s = document.createElement('span')
    s.className = 'cm-lp-code-header'
    const lang = document.createElement('span')
    lang.textContent = this.lang
    const copy = document.createElement('button')
    copy.className = 'cm-lp-code-copy'
    copy.textContent = 'copy'
    copy.dataset.lpCopy = ''
    copy.title = 'Copy code'
    s.append(lang, copy)
    return s
  }
  ignoreEvent() {
    return false
  }
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Small inline-markdown renderer for table cells (the table widget is
 *  plain DOM, outside the editor's own decorations). */
function renderInline(md: string, resolves: (note: string) => boolean): string {
  const codes: string[] = []
  let s = esc(md).replace(/`([^`]+)`/g, (_, c) => {
    codes.push(`<code class="cm-lp-code">${c}</code>`)
    return `\u0000${codes.length - 1}\u0000`
  })
  s = s
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target: string, alias?: string) => {
      const ok = resolves(parseWikiTarget(target.replace(/&amp;/g, '&')).note)
      return `<span class="cm-lp-wikilink cm-lp-live${ok ? '' : ' is-unresolved'}" data-lp-wiki="${target}">${alias ?? target}</span>`
    })
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<span class="cm-lp-link cm-lp-live" data-lp-href="$2">$1</span>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/==(.+?)==/g, '<mark class="cm-lp-highlight">$1</mark>')
    .replace(/(^|\s)#([\p{L}_\-/][\p{L}\p{N}_\-/]*)/gu, '$1<span class="cm-lp-tag cm-lp-live" data-lp-tag="$2">#$2</span>')
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)])
}

/** A rendered table you edit in place, like Obsidian/Confluence: click a
 *  cell to edit it (Tab/Enter move on), hover for the + bars that add a
 *  row or column, right-click a cell for insert/delete/align. Every edit
 *  is written straight back to the markdown. */
class TableWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly resolves: (note: string) => boolean,
  ) {
    super()
  }
  eq(o: TableWidget) {
    return o.src === this.src
  }

  toDOM(view: EditorView) {
    const model = parseTable(this.src)
    const wrap = document.createElement('div')
    wrap.className = 'cm-lp-table'
    const scroll = document.createElement('div')
    scroll.className = 'cm-lp-table-scroll'
    const table = document.createElement('table')
    model.rows.forEach((row, r) => {
      const tr = document.createElement('tr')
      row.forEach((cell, c) => {
        const td = document.createElement(r === 0 ? 'th' : 'td')
        td.dataset.r = String(r)
        td.dataset.c = String(c)
        td.style.textAlign = model.aligns[c] ?? 'left'
        td.innerHTML = renderInline(cell, this.resolves) || '&nbsp;'
        tr.appendChild(td)
      })
      ;(r === 0 ? table.createTHead() : table.tBodies[0] ?? table.createTBody()).appendChild(tr)
    })
    scroll.appendChild(table)
    const addRow = document.createElement('button')
    addRow.className = 'cm-lp-table-add cm-lp-table-add-row'
    addRow.title = 'Add row'
    addRow.textContent = '+'
    const addCol = document.createElement('button')
    addCol.className = 'cm-lp-table-add cm-lp-table-add-col'
    addCol.title = 'Add column'
    addCol.textContent = '+'
    wrap.append(scroll, addRow, addCol)

    const pos = () => view.posAtDOM(wrap)
    const cellEl = (r: number, c: number) => wrap.querySelector<HTMLElement>(`[data-r="${r}"][data-c="${c}"]`)
    const rows = model.rows.length
    const cols = model.rows[0].length

    const edit = (r: number, c: number) => {
      const el = cellEl(r, c)
      if (!el || el.querySelector('input')) return
      const original = model.rows[r][c]
      const input = document.createElement('input')
      input.className = 'cm-lp-table-input'
      input.value = original
      el.textContent = ''
      el.appendChild(input)
      input.focus()
      input.select()
      let done = false
      const finish = (next: { r: number; c: number } | null, addRow = false) => {
        if (done) return
        done = true
        const value = input.value
        const from = pos()
        if (next) focusTableCellSoon(view, from, next.r, next.c)
        const changed = editTable(view, from, (t) => {
          tableEdits.setCell(r, c, value)(t)
          if (addRow) tableEdits.insertRow(t.rows.length)(t)
        })
        if (!changed) {
          // Nothing to rebuild — restore this cell and move on directly.
          el.innerHTML = renderInline(original, this.resolves) || '&nbsp;'
          if (next) {
            takePendingFocus(view, from)
            edit(next.r, next.c)
          }
        }
      }
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault()
          const idx = r * cols + c + (e.shiftKey ? -1 : 1)
          if (idx < 0) return finish(null)
          if (idx >= rows * cols) return finish({ r: rows, c: 0 }, true)
          finish({ r: Math.floor(idx / cols), c: idx % cols })
        } else if (e.key === 'Enter') {
          e.preventDefault()
          finish(r + 1 < rows ? { r: r + 1, c } : null)
        } else if (e.key === 'Escape') {
          // Keep what was typed and leave the table (like Confluence).
          e.preventDefault()
          finish(null)
          view.focus()
        } else if (e.key === 'ArrowUp' && r > 0) {
          e.preventDefault()
          finish({ r: r - 1, c })
        } else if (e.key === 'ArrowDown' && r + 1 < rows) {
          e.preventDefault()
          finish({ r: r + 1, c })
        }
      })
      input.addEventListener('blur', () => finish(null))
    }

    wrap.addEventListener('mousedown', (e) => {
      const t = e.target as HTMLElement
      if (t.closest('input')) return
      e.preventDefault()
      if (e.button !== 0) return
      if (t === addRow) {
        focusTableCellSoon(view, pos(), rows, 0)
        editTable(view, pos(), tableEdits.insertRow(rows))
        return
      }
      if (t === addCol) {
        focusTableCellSoon(view, pos(), 0, cols)
        editTable(view, pos(), tableEdits.insertCol(cols))
        return
      }
      const link = t.closest<HTMLElement>('[data-lp-href],[data-lp-wiki],[data-lp-tag]')
      if (link) {
        const h = view.state.facet(previewHandlers)
        if (link.dataset.lpHref != null) h.openUrl(link.dataset.lpHref)
        else if (link.dataset.lpWiki != null) h.openWiki(link.dataset.lpWiki)
        else if (link.dataset.lpTag != null) h.openTag(link.dataset.lpTag)
        return
      }
      const cell = t.closest<HTMLElement>('[data-r]')
      if (cell) edit(Number(cell.dataset.r), Number(cell.dataset.c))
    })

    wrap.addEventListener('contextmenu', (e) => {
      const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-r]')
      if (!cell) return
      e.preventDefault()
      const r = Number(cell.dataset.r)
      const c = Number(cell.dataset.c)
      const run = (fn: (t: TableModel) => void) => () => editTable(view, pos(), fn)
      openContextMenu(e.clientX, e.clientY, [
        { kind: 'header', label: `Row ${r === 0 ? 'header' : r} · column ${c + 1}` },
        { label: 'Insert row above', disabled: r === 0, onSelect: run(tableEdits.insertRow(r)) },
        { label: 'Insert row below', onSelect: run(tableEdits.insertRow(r + 1)) },
        { label: 'Insert column left', onSelect: run(tableEdits.insertCol(c)) },
        { label: 'Insert column right', onSelect: run(tableEdits.insertCol(c + 1)) },
        { kind: 'separator' },
        {
          label: 'Align column',
          submenu: (['left', 'center', 'right'] as const).map((a) => ({
            label: a[0].toUpperCase() + a.slice(1),
            checked: (model.aligns[c] ?? 'left') === a,
            onSelect: run(tableEdits.align(c, a)),
          })),
        },
        {
          label: 'Edit as markdown',
          onSelect: () => {
            view.dispatch({ selection: { anchor: pos() } })
            view.focus()
          },
        },
        { kind: 'separator' },
        { label: 'Delete row', danger: true, disabled: r === 0 || rows <= 1, onSelect: run(tableEdits.deleteRow(r)) },
        { label: 'Delete column', danger: true, disabled: cols <= 1, onSelect: run(tableEdits.deleteCol(c)) },
      ])
    })

    // Reopen the cell an edit moved to (Tab/Enter/+ bars) once mounted.
    requestAnimationFrame(() => {
      if (!wrap.isConnected) return
      const next = takePendingFocus(view, pos())
      if (next) edit(next.r, next.c)
    })
    return wrap
  }

  ignoreEvent() {
    // The widget handles its own clicks and keys.
    return true
  }
}

// ---- decoration builder ---------------------------------------------------

const INLINE_MARKS: Record<string, string> = {
  Emphasis: 'EmphasisMark',
  StrongEmphasis: 'EmphasisMark',
  Strikethrough: 'StrikethroughMark',
  Highlight: 'HighlightMark',
  InlineCode: 'CodeMark',
}

const CALLOUT_RE = /^\s*>\s?\[!([\w-]+)\][+-]?[ \t]*(.*)$/

function topBlockquote(node: SyntaxNode): SyntaxNode | null {
  let top: SyntaxNode | null = null
  for (let n: SyntaxNode | null = node; n; n = n.parent) if (n.name === 'Blockquote') top = n
  return top
}

function build(state: EditorState): DecorationSet {
  const tree = ensureSyntaxTree(state, state.doc.length, 50) ?? syntaxTree(state)
  const doc = state.doc
  const focused = state.field(focusField)
  const handlers = state.facet(previewHandlers)
  const out: Range<Decoration>[] = []
  const replaced: [number, number][] = []

  const touches = (from: number, to: number) =>
    focused && state.selection.ranges.some((r) => r.from <= to && r.to >= from)
  const linesTouch = (from: number, to: number) => touches(doc.lineAt(from).from, doc.lineAt(to).to)
  const covered = (from: number, to: number) => replaced.some(([a, b]) => from < b && to > a)
  const replace = (from: number, to: number, spec: Parameters<typeof Decoration.replace>[0] = {}) => {
    if (to <= from || covered(from, to)) return
    replaced.push([from, to])
    out.push(Decoration.replace(spec).range(from, to))
  }
  const mark = (from: number, to: number, spec: Parameters<typeof Decoration.mark>[0]) => {
    if (to > from) out.push(Decoration.mark(spec).range(from, to))
  }
  const lines = (from: number, to: number, cls: (i: number, n: number) => string, attrs?: Record<string, string>) => {
    const a = doc.lineAt(from).number
    const b = doc.lineAt(to).number
    for (let l = a; l <= b; l++) {
      out.push(Decoration.line({ class: cls(l - a, b - a), attributes: attrs }).range(doc.line(l).from))
    }
  }
  const isCallout = (bq: SyntaxNode) => CALLOUT_RE.test(doc.lineAt(bq.from).text)

  tree.iterate({
    enter(ref) {
      const node = ref.node
      const name = ref.name

      if (/^ATXHeading\d$/.test(name)) {
        const level = name.slice(-1)
        lines(node.from, node.from, () => `cm-lp-h cm-lp-h${level}`)
        if (!linesTouch(node.from, node.to)) {
          const m = node.firstChild
          if (m?.name === 'HeaderMark' && m.from === node.from) replace(m.from, Math.min(m.to + 1, node.to))
          const close = node.lastChild
          if (close && close !== m && close.name === 'HeaderMark') replace(close.from, close.to)
        }
        return
      }

      if (/^SetextHeading\d$/.test(name)) {
        const level = name.slice(-1)
        lines(node.from, node.to, () => `cm-lp-h cm-lp-h${level}`)
        const m = node.getChild('HeaderMark')
        if (m && !linesTouch(node.from, node.to)) replace(m.from, m.to)
        return
      }

      if (name in INLINE_MARKS) {
        if (name === 'Highlight') mark(node.from, node.to, { class: 'cm-lp-highlight' })
        if (name === 'InlineCode') mark(node.from, node.to, { class: 'cm-lp-code' })
        if (!touches(node.from, node.to)) for (const m of node.getChildren(INLINE_MARKS[name])) replace(m.from, m.to)
        return
      }

      switch (name) {
        case 'Link': {
          const marks = node.getChildren('LinkMark')
          const url = node.getChild('URL')
          if (marks.length < 2 || !url) return
          const href = doc.sliceString(url.from, url.to)
          const live = !touches(node.from, node.to)
          mark(marks[0].to, marks[1].from, {
            class: `cm-lp-link${live ? ' cm-lp-live' : ''}`,
            attributes: { 'data-lp-href': href, title: href },
          })
          if (live) {
            replace(node.from, marks[0].to)
            replace(marks[1].from, node.to)
          }
          return
        }

        case 'URL': {
          const parent = node.parent?.name
          if (parent === 'Link' || parent === 'Image' || parent === 'LinkReference') return
          const href = doc.sliceString(node.from, node.to)
          const outer = parent === 'Autolink' ? node.parent! : node
          const live = !touches(outer.from, outer.to)
          mark(node.from, node.to, {
            class: `cm-lp-link cm-lp-url${live ? ' cm-lp-live' : ''}`,
            attributes: { 'data-lp-href': /^[\w.+-]+@[\w-]+\./.test(href) && !href.includes('://') ? `mailto:${href}` : href },
          })
          if (parent === 'Autolink' && live) for (const m of outer.getChildren('LinkMark')) replace(m.from, m.to)
          return
        }

        case 'Image': {
          const url = node.getChild('URL')
          if (!url) return
          const marks = node.getChildren('LinkMark')
          const alt = marks.length >= 2 ? doc.sliceString(marks[0].to, marks[1].from) : ''
          if (!touches(node.from, node.to)) {
            replace(node.from, node.to, { widget: new ImageWidget(doc.sliceString(url.from, url.to), alt) })
          }
          return false
        }

        case 'WikiLink':
        case 'WikiEmbed': {
          const target = node.getChild('WikiTarget')
          const alias = node.getChild('WikiAlias')
          const targetText = target ? doc.sliceString(target.from, target.to) : ''
          const exists = handlers.resolves(parseWikiTarget(targetText).note)
          const live = !touches(node.from, node.to)
          const spec = {
            class: `cm-lp-wikilink${exists ? '' : ' is-unresolved'}${live ? ' cm-lp-live' : ''}`,
            attributes: { 'data-lp-wiki': targetText, title: targetText },
          }
          const shown = alias ?? target
          if (live && shown) {
            replace(node.from, shown.from)
            replace(shown.to, node.to)
            mark(shown.from, shown.to, spec)
          } else {
            mark(node.from + (name === 'WikiEmbed' ? 3 : 2), node.to - 2, spec)
          }
          return false
        }

        case 'HashTag': {
          const live = !touches(node.from, node.to)
          mark(node.from, node.to, {
            class: `cm-lp-tag${live ? ' cm-lp-live' : ''}`,
            attributes: { 'data-lp-tag': doc.sliceString(node.from + 1, node.to) },
          })
          return false
        }

        case 'ListItem': {
          const lm = node.getChild('ListMark')
          if (!lm) return
          // Proportional fonts make leading spaces tiny — widen the indent
          // of nested items so the hierarchy reads like Obsidian's.
          const line = doc.lineAt(lm.from)
          if (lm.from > line.from && /^[ \t>]*$/.test(doc.sliceString(line.from, lm.from))) {
            const ws = /^[ \t]*/.exec(doc.sliceString(line.from, lm.from))![0].length
            if (ws) mark(line.from, line.from + ws, { class: 'cm-lp-indent' })
          }
          const task = node.getChild('Task')
          const tm = task?.getChild('TaskMarker')
          if (task && tm) {
            const checked = /x/i.test(doc.sliceString(tm.from, tm.to))
            if (!touches(lm.from, tm.to)) {
              replace(lm.from, tm.from)
              replace(tm.from, tm.to, { widget: new CheckboxWidget(checked) })
            }
            if (checked) mark(Math.min(tm.to + 1, task.to), task.to, { class: 'cm-lp-task-done' })
          } else if (node.parent?.name === 'BulletList' && !touches(lm.from, lm.to)) {
            replace(lm.from, lm.to, { widget: new BulletWidget() })
          }
          return
        }

        case 'Blockquote': {
          if (topBlockquote(node) !== node) return
          const first = doc.lineAt(node.from)
          const last = doc.lineAt(node.to)
          const m = CALLOUT_RE.exec(first.text)
          if (m) {
            const type = calloutType(m[1])
            lines(
              node.from,
              node.to,
              (i, n) => `cm-lp-callout${i === 0 ? ' cm-lp-callout-first' : ''}${i === n ? ' cm-lp-callout-last' : ''}`,
              { 'data-callout': type },
            )
            if (!touches(first.from, last.to)) {
              const title = m[2].trim() || m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase()
              replace(first.from, first.to, { widget: new CalloutTitleWidget(type, title) })
            }
          } else {
            lines(node.from, node.to, (i, n) => `cm-lp-quote${i === 0 ? ' cm-lp-quote-first' : ''}${i === n ? ' cm-lp-quote-last' : ''}`)
          }
          return
        }

        case 'QuoteMark': {
          const bq = topBlockquote(node)
          const hidden = bq && isCallout(bq) ? !touches(doc.lineAt(bq.from).from, doc.lineAt(bq.to).to) : !linesTouch(node.from, node.to)
          if (hidden) {
            const after = doc.sliceString(node.to, node.to + 1)
            replace(node.from, node.to + (after === ' ' ? 1 : 0))
          }
          return
        }

        case 'FencedCode': {
          const first = doc.lineAt(node.from)
          const last = doc.lineAt(node.to)
          const closed = last.number > first.number && /^\s*(```|~~~)/.test(last.text)
          const live = !touches(first.from, last.to)
          lines(
            node.from,
            node.to,
            (i, n) =>
              `cm-lp-codeblock${i === 0 ? ' cm-lp-codeblock-first' : ''}${i === n ? ' cm-lp-codeblock-last' : ''}${live && closed && i === n && n > 0 ? ' cm-lp-fence-hidden' : ''}`,
          )
          if (live) {
            const info = node.getChild('CodeInfo')
            const text = node.getChild('CodeText')
            replace(first.from, first.to, {
              widget: new CodeHeaderWidget(
                info ? doc.sliceString(info.from, info.to) : '',
                text ? doc.sliceString(text.from, text.to) : '',
              ),
            })
            if (closed) replace(last.from, last.to)
          }
          return false
        }

        case 'HorizontalRule': {
          if (!linesTouch(node.from, node.to)) replace(node.from, node.to, { widget: new HrWidget() })
          return
        }

        case 'Table': {
          const first = doc.lineAt(node.from)
          const last = doc.lineAt(node.to)
          if (!touches(first.from, last.to)) {
            replace(first.from, last.to, {
              widget: new TableWidget(doc.sliceString(first.from, last.to), handlers.resolves),
              block: true,
            })
            return false
          }
          lines(node.from, node.to, () => 'cm-lp-table-src')
          return
        }
      }
    },
  })

  return Decoration.set(out, true)
}

const previewField = StateField.define<DecorationSet>({
  create: build,
  update(deco, tr) {
    if (
      tr.docChanged ||
      tr.selection ||
      tr.effects.some((e) => e.is(setFocus) || e.is(refreshLinks)) ||
      syntaxTree(tr.state) !== syntaxTree(tr.startState)
    ) {
      return build(tr.state)
    }
    return deco.map(tr.changes)
  },
  provide: (f) => EditorView.decorations.from(f),
})

function toggleTaskAt(view: EditorView, pos: number) {
  const text = view.state.doc.sliceString(pos, pos + 3)
  if (!/^\[[ xX]\]$/.test(text)) return
  view.dispatch({ changes: { from: pos + 1, to: pos + 2, insert: text[1] === ' ' ? 'x' : ' ' } })
}

const clicks = EditorView.domEventHandlers({
  mousedown(e, view) {
    if (e.button !== 0) return false
    const t = e.target as HTMLElement

    if (t.matches('input.cm-lp-task')) {
      e.preventDefault()
      toggleTaskAt(view, view.posAtDOM(t))
      return true
    }

    const copy = t.closest<HTMLElement>('[data-lp-copy]')
    if (copy) {
      e.preventDefault()
      const header = copy.closest('.cm-line')
      const pos = header ? view.posAtDOM(header) : -1
      if (pos >= 0) {
        let node: SyntaxNode | null = syntaxTree(view.state).resolveInner(pos, 1)
        while (node && node.name !== 'FencedCode') node = node.parent
        const code = node?.getChild('CodeText')
        if (code) void navigator.clipboard?.writeText(view.state.doc.sliceString(code.from, code.to))
      }
      copy.textContent = 'copied'
      window.setTimeout(() => (copy.textContent = 'copy'), 1200)
      return true
    }

    const el = t.closest<HTMLElement>('[data-lp-href],[data-lp-wiki],[data-lp-tag]')
    if (!el) return false
    const mod = e.metaKey || e.ctrlKey
    if (!mod && !el.classList.contains('cm-lp-live')) return false
    e.preventDefault()
    const h = view.state.facet(previewHandlers)
    if (el.dataset.lpHref != null) h.openUrl(el.dataset.lpHref)
    else if (el.dataset.lpWiki != null) h.openWiki(el.dataset.lpWiki)
    else if (el.dataset.lpTag != null) h.openTag(el.dataset.lpTag)
    return true
  },
})

/** Toggle the task checkbox on each selected line — turning a plain line
 *  or list item into a task first, like Obsidian's "Toggle checkbox". */
export function toggleTask(view: EditorView): boolean {
  const changes = []
  const seen = new Set<number>()
  for (const r of view.state.selection.ranges) {
    const line = view.state.doc.lineAt(r.head)
    if (seen.has(line.number)) continue
    seen.add(line.number)
    const task = /^(\s*(?:>\s*)*[-*+] \[)([ xX])\]/.exec(line.text)
    if (task) {
      const at = line.from + task[1].length
      changes.push({ from: at, to: at + 1, insert: task[2] === ' ' ? 'x' : ' ' })
      continue
    }
    const list = /^(\s*(?:>\s*)*[-*+] )/.exec(line.text)
    if (list) changes.push({ from: line.from + list[1].length, insert: '[ ] ' })
    else {
      const indent = /^\s*/.exec(line.text)![0].length
      changes.push({ from: line.from + indent, insert: '- [ ] ' })
    }
  }
  view.dispatch({ changes })
  return true
}

export function livePreview() {
  return [
    focusField,
    EditorView.focusChangeEffect.of((_, focusing) => setFocus.of(focusing)),
    previewField,
    clicks,
  ]
}
