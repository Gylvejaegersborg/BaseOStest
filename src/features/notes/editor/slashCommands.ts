import type { EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { startCompletion, type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete'
import { focusTableCellSoon } from './tableOps'

// The `/` command menu (Notion/Confluence style). Editing commands run
// here; commands that reach outside the editor (new notes, properties)
// go to the page through `PageCommand`.

export type PageCommand = 'new-note' | 'link-new-note' | 'new-canvas' | 'new-base' | 'add-property'

/** Returns text to insert for `link-new-note` (the new note's title). */
export type RunPageCommand = (cmd: PageCommand) => string | void

interface SlashItem {
  label: string
  detail: string
  section: string
  keywords: string
  run: (view: EditorView, from: number, to: number, page: RunPageCommand) => void
}

/** Cheap check: inside inline code on this line, or a fenced block. */
export function inCode(state: EditorState, pos: number): boolean {
  const line = state.doc.lineAt(pos)
  const before = line.text.slice(0, pos - line.from)
  if ((before.match(/`/g)?.length ?? 0) % 2 === 1) return true
  let fences = 0
  for (let i = 1; i < line.number; i++) if (/^\s*(```|~~~)/.test(state.doc.line(i).text)) fences++
  return fences % 2 === 1
}

/** Replaces the `/command` with `text`, starting a new line first when the
 *  command was typed after other text and `block` is set. `cursor` is the
 *  caret offset within `text` (default: its end). */
function insert(view: EditorView, from: number, to: number, text: string, opts: { block?: boolean; cursor?: number; select?: number } = {}) {
  const line = view.state.doc.lineAt(from)
  const lead = opts.block && view.state.sliceDoc(line.from, from).trim() ? '\n' : ''
  const full = lead + text
  const anchor = from + lead.length + (opts.cursor ?? text.length)
  view.dispatch({
    changes: { from, to, insert: full },
    selection: { anchor, head: opts.select != null ? anchor + opts.select : anchor },
    scrollIntoView: true,
  })
  view.focus()
}

const block = (prefix: string) => (view: EditorView, from: number, to: number) => insert(view, from, to, prefix, { block: true })

const callout = (type: string, title = '') => (view: EditorView, from: number, to: number) => {
  const head = `> [!${type}]${title ? ` ${title}` : ''}\n> `
  insert(view, from, to, head, { block: true })
}

const pad = (n: number) => String(n).padStart(2, '0')

const ITEMS: SlashItem[] = [
  { section: 'Basic blocks', label: 'Heading 1', detail: 'Big section heading', keywords: 'h1 title', run: block('# ') },
  { section: 'Basic blocks', label: 'Heading 2', detail: 'Medium heading', keywords: 'h2 subtitle', run: block('## ') },
  { section: 'Basic blocks', label: 'Heading 3', detail: 'Small heading', keywords: 'h3', run: block('### ') },
  { section: 'Basic blocks', label: 'Bullet list', detail: 'A simple list', keywords: 'ul unordered bullets', run: block('- ') },
  { section: 'Basic blocks', label: 'Numbered list', detail: 'A list with numbers', keywords: 'ol ordered 1.', run: block('1. ') },
  { section: 'Basic blocks', label: 'Task', detail: 'A checkbox item', keywords: 'todo checkbox checklist', run: block('- [ ] ') },
  { section: 'Basic blocks', label: 'Quote', detail: 'A blockquote', keywords: 'blockquote >', run: block('> ') },
  {
    section: 'Basic blocks',
    label: 'Divider',
    detail: 'A horizontal rule',
    keywords: 'hr rule line separator ---',
    run: (view, from, to) => insert(view, from, to, '---\n', { block: true }),
  },
  {
    section: 'Insert',
    label: 'Table',
    detail: 'A 3×3 table you can edit in place',
    keywords: 'grid columns rows',
    run: (view, from, to) => {
      const table = '| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |\n'
      const line = view.state.doc.lineAt(from)
      const lead = view.state.sliceDoc(line.from, from).trim() ? '\n\n' : ''
      insert(view, from, to, lead + table)
      // Open the first header cell for typing, like Confluence.
      focusTableCellSoon(view, from + lead.length, 0, 0)
    },
  },
  {
    section: 'Insert',
    label: 'Code block',
    detail: 'Fenced code with syntax highlighting',
    keywords: 'code fence snippet ```',
    run: (view, from, to) => insert(view, from, to, '```\n\n```\n', { block: true, cursor: 4 }),
  },
  { section: 'Insert', label: 'Callout', detail: 'A note callout box', keywords: 'admonition note box', run: callout('note') },
  { section: 'Insert', label: 'Tip callout', detail: 'Cyan tip box', keywords: 'hint callout', run: callout('tip') },
  { section: 'Insert', label: 'Info callout', detail: 'Blue info box', keywords: 'callout', run: callout('info') },
  { section: 'Insert', label: 'Warning callout', detail: 'Orange warning box', keywords: 'caution callout', run: callout('warning') },
  { section: 'Insert', label: 'Todo callout', detail: 'A box of tasks', keywords: 'task callout', run: (v, f, t) => insert(v, f, t, '> [!todo]\n> - [ ] ', { block: true }) },
  {
    section: 'Insert',
    label: 'Image',
    detail: 'Embed an image from a URL',
    keywords: 'picture img photo',
    run: (view, from, to) => insert(view, from, to, '![](https://)', { cursor: 4, select: 8 }),
  },
  {
    section: 'Insert',
    label: 'Link to note',
    detail: 'A [[wikilink]] with suggestions',
    keywords: 'wikilink internal [[',
    run: (view, from, to) => {
      insert(view, from, to, '[[]]', { cursor: 2 })
      startCompletion(view)
    },
  },
  {
    section: 'Insert',
    label: 'Embed note',
    detail: 'An ![[embed]] of another note',
    keywords: 'transclude embed',
    run: (view, from, to) => {
      insert(view, from, to, '![[]]', { cursor: 3 })
      startCompletion(view)
    },
  },
  {
    section: 'Insert',
    label: 'External link',
    detail: 'A [text](url) link',
    keywords: 'url web href',
    run: (view, from, to) => insert(view, from, to, '[](https://)', { cursor: 1 }),
  },
  {
    section: 'Insert',
    label: 'Highlight',
    detail: '==Highlighted== text',
    keywords: 'mark',
    run: (view, from, to) => insert(view, from, to, '====', { cursor: 2 }),
  },
  {
    section: 'Insert',
    label: "Today's date",
    detail: 'YYYY-MM-DD',
    keywords: 'date today now',
    run: (view, from, to) => {
      const d = new Date()
      insert(view, from, to, `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
    },
  },
  {
    section: 'Insert',
    label: 'Current time',
    detail: 'HH:MM',
    keywords: 'time clock now',
    run: (view, from, to) => {
      const d = new Date()
      insert(view, from, to, `${pad(d.getHours())}:${pad(d.getMinutes())}`)
    },
  },
  {
    section: 'Note',
    label: 'Add property',
    detail: 'Add a property to this note',
    keywords: 'property frontmatter metadata yaml field',
    run: (view, from, to, page) => {
      view.dispatch({ changes: { from, to, insert: '' } })
      page('add-property')
    },
  },
  {
    section: 'Note',
    label: 'New note',
    detail: 'Create a note and open it',
    keywords: 'create page file',
    run: (view, from, to, page) => {
      view.dispatch({ changes: { from, to, insert: '' } })
      page('new-note')
    },
  },
  {
    section: 'Note',
    label: 'Link to new note',
    detail: 'Create a note and link to it here',
    keywords: 'create page subpage child',
    run: (view, from, to, page) => {
      const title = page('link-new-note')
      if (title) insert(view, from, to, `[[${title}]]`)
    },
  },
  {
    section: 'Note',
    label: 'New canvas',
    detail: 'Create a canvas with cards and drawing',
    keywords: 'whiteboard board draw sketch',
    run: (view, from, to, page) => {
      view.dispatch({ changes: { from, to, insert: '' } })
      page('new-canvas')
    },
  },
  {
    section: 'Note',
    label: 'New base',
    detail: 'Create a base (table of notes)',
    keywords: 'database table view',
    run: (view, from, to, page) => {
      view.dispatch({ changes: { from, to, insert: '' } })
      page('new-base')
    },
  },
]

function score(item: SlashItem, q: string): number {
  if (!q) return 1
  const label = item.label.toLowerCase()
  if (label.startsWith(q)) return 4
  if (item.keywords.split(' ').some((k) => k.startsWith(q))) return 3
  if (label.includes(q) || item.keywords.includes(q)) return 2
  // Subsequence ("cblk" → "Code block").
  let i = 0
  for (const ch of label) if (ch === q[i]) i++
  return i === q.length ? 1 : 0
}

export function slashSource(page: () => RunPageCommand) {
  return (ctx: CompletionContext): CompletionResult | null => {
    const m = ctx.matchBefore(/(?:^|\s)\/[\w'-]*(?: [\w'-]*)?$/)
    if (!m) return null
    const slash = m.from + m.text.indexOf('/')
    if (inCode(ctx.state, slash)) return null
    const q = ctx.state.sliceDoc(slash + 1, ctx.pos).toLowerCase().trim()
    const options: Completion[] = ITEMS.map((item) => ({ item, s: score(item, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map(({ item }, i) => ({
        label: item.label,
        detail: item.detail,
        section: q ? undefined : item.section,
        boost: -i,
        apply: (view: EditorView, _c: Completion, _from: number, to: number) => item.run(view, slash, to, page()),
      }))
    if (!options.length) return null
    return { from: slash + 1, options, filter: false }
  }
}
