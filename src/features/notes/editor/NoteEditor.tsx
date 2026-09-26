import { useEffect, useMemo, useRef } from 'react'
import { Annotation, EditorSelection, EditorState, type Extension } from '@codemirror/state'
import { EditorView, drawSelection, dropCursor, keymap, placeholder } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { foldGutter, foldKeymap } from '@codemirror/language'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { autocompletion, closeBrackets, closeBracketsKeymap, type Completion, type CompletionContext } from '@codemirror/autocomplete'
import { search, searchKeymap } from '@codemirror/search'
import type { Note } from '@/data/notes'
import { noteTags, parseWikiTarget, resolveNote } from '../vault'
import { obsidianSyntax } from './syntax'
import { livePreview, previewHandlers, refreshLinks, setFocus, toggleTask } from './livePreview'
import { editorTheme, markdownHighlight } from './theme'

export interface NoteEditorProps {
  noteId: string
  value: string
  notes: Note[]
  onChange: (body: string) => void
  onOpenWiki: (target: string) => void
  onOpenTag: (tag: string) => void
  /** Scroll to (and put the cursor on) a heading — set when following a
   *  [[Note#Heading]] link. `nonce` re-triggers the same heading. */
  jump?: { heading: string; nonce: number } | null
  /** Focus the editor when this note opens (e.g. a freshly created note). */
  focusOnOpen?: boolean
}

/** Marks transactions that sync the doc from props, so they don't echo back
 *  through onChange. */
const External = Annotation.define<boolean>()

const wrap = (marker: string) => (view: EditorView) => {
  const n = marker.length
  view.dispatch(
    view.state.changeByRange((r) => {
      const before = view.state.sliceDoc(r.from - n, r.from)
      const after = view.state.sliceDoc(r.to, r.to + n)
      if (before === marker && after === marker) {
        return {
          changes: [{ from: r.from - n, to: r.from }, { from: r.to, to: r.to + n }],
          range: EditorSelection.range(r.from - n, r.to - n),
        }
      }
      return {
        changes: [{ from: r.from, insert: marker }, { from: r.to, insert: marker }],
        range: EditorSelection.range(r.from + n, r.to + n),
      }
    }),
  )
  return true
}

function insertLink(view: EditorView) {
  view.dispatch(
    view.state.changeByRange((r) => {
      const text = view.state.sliceDoc(r.from, r.to)
      if (/^https?:\/\/\S+$/.test(text)) {
        return { changes: { from: r.from, to: r.to, insert: `[](${text})` }, range: EditorSelection.cursor(r.from + 1) }
      }
      const insert = `[${text}]()`
      return { changes: { from: r.from, to: r.to, insert }, range: EditorSelection.cursor(r.from + insert.length - 1) }
    }),
  )
  return true
}

/** Completion `apply` that inserts `text` and steps past the closing `]]`
 *  (adding it when closeBrackets didn't). */
function applyWiki(text: string) {
  return (view: EditorView, _c: Completion, from: number, to: number) => {
    let end = to
    while (end < view.state.doc.length && !/[\]\n]/.test(view.state.sliceDoc(end, end + 1))) end++
    const hasClose = view.state.sliceDoc(end, end + 2) === ']]'
    view.dispatch({
      changes: { from, to: hasClose ? end : to, insert: hasClose ? text : `${text}]]` },
      selection: { anchor: from + text.length + 2 },
    })
  }
}

function headingsOf(body: string): string[] {
  const out: string[] = []
  let inCode = false
  for (const line of body.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) inCode = !inCode
    const m = !inCode && /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line)
    if (m) out.push(m[1])
  }
  return out
}

export function NoteEditor(props: NoteEditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const states = useRef(new Map<string, EditorState>())
  const latest = useRef(props)
  latest.current = props

  const extensions = useMemo<Extension[]>(() => {
    const currentNote = () => latest.current.notes.find((n) => n.id === latest.current.noteId) ?? null

    const wikiSource = (ctx: CompletionContext) => {
      const m = ctx.matchBefore(/!?\[\[[^\]\n]*/)
      if (!m) return null
      const open = m.text.indexOf('[[') + 2
      const inner = m.text.slice(open)
      if (inner.includes('|')) return null
      const { notes } = latest.current
      const hash = inner.indexOf('#')
      if (hash !== -1) {
        const target = resolveNote(notes, parseWikiTarget(inner).note, currentNote())
        if (!target) return null
        return {
          from: m.from + open + hash + 1,
          options: headingsOf(target.body).map((h) => ({ label: h, apply: applyWiki(h) })),
          validFor: /^[^\]|#\n]*$/,
        }
      }
      const titleCount = new Map<string, number>()
      for (const n of notes) titleCount.set(n.title.toLowerCase(), (titleCount.get(n.title.toLowerCase()) ?? 0) + 1)
      return {
        from: m.from + open,
        options: notes.map((n) => {
          const ambiguous = (titleCount.get(n.title.toLowerCase()) ?? 0) > 1
          const text = ambiguous && n.folder ? `${n.folder}/${n.title}` : n.title
          return { label: n.title, detail: n.folder || 'vault root', apply: applyWiki(text) }
        }),
        validFor: /^[^\]|#\n]*$/,
      }
    }

    const tagSource = (ctx: CompletionContext) => {
      const m = ctx.matchBefore(/(?:^|[\s(])#[\p{L}\p{N}_\-/]+/u)
      if (!m) return null
      const from = m.from + m.text.indexOf('#') + 1
      if (syntaxIsCode(ctx.state, from)) return null
      // Count from the other notes plus this note's saved text minus the
      // tag being typed — otherwise the half-typed tag suggests itself.
      const typing = ctx.state.sliceDoc(from, ctx.pos).toLowerCase()
      const counts = new Map<string, number>()
      for (const n of latest.current.notes) {
        const own = n.id === latest.current.noteId
        for (const t of noteTags(n)) if (!own || t !== typing) counts.set(t, (counts.get(t) ?? 0) + 1)
      }
      return {
        from,
        options: [...counts].map(([t, c]) => ({ label: t, detail: String(c), apply: t })),
        validFor: /^[\p{L}\p{N}_\-/]*$/u,
      }
    }

    return [
      history(),
      drawSelection(),
      dropCursor(),
      EditorView.lineWrapping,
      markdown({ base: markdownLanguage, codeLanguages: languages, extensions: obsidianSyntax, completeHTMLTags: false }),
      markdownLanguage.data.of({ closeBrackets: { brackets: ['(', '['] } }),
      closeBrackets(),
      autocompletion({ override: [wikiSource, tagSource], icons: false }),
      search({ top: true }),
      foldGutter({ openText: '⌄', closedText: '›' }),
      placeholder('Start writing…'),
      editorTheme,
      markdownHighlight,
      livePreview(),
      previewHandlers.of({
        openWiki: (t) => latest.current.onOpenWiki(t),
        openTag: (t) => latest.current.onOpenTag(t),
        openUrl: (url) => window.open(url, '_blank', 'noopener,noreferrer'),
        resolves: (note) => !note || !!resolveNote(latest.current.notes, note, currentNote()),
      }),
      keymap.of([
        { key: 'Mod-b', run: wrap('**') },
        { key: 'Mod-i', run: wrap('*') },
        { key: 'Mod-Shift-h', run: wrap('==') },
        { key: 'Mod-k', run: insertLink },
        { key: 'Mod-Enter', run: toggleTask },
        indentWithTab,
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        ...foldKeymap,
      ]),
      EditorView.contentAttributes.of({ spellcheck: 'true', autocapitalize: 'sentences' }),
      EditorView.updateListener.of((u) => {
        if (u.docChanged && !u.transactions.some((tr) => tr.annotation(External))) {
          latest.current.onChange(u.state.doc.toString())
        }
      }),
    ]
  }, [])

  const stateFor = (id: string, value: string): EditorState => {
    const cached = states.current.get(id)
    if (!cached) return EditorState.create({ doc: value, extensions })
    if (cached.doc.toString() === value) return cached
    return cached.update({ changes: { from: 0, to: cached.doc.length, insert: value }, annotations: External.of(true) }).state
  }

  // Create the view once.
  useEffect(() => {
    const view = new EditorView({ state: stateFor(props.noteId, props.value), parent: host.current! })
    viewRef.current = view
    if (props.focusOnOpen) view.focus()
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Switch notes — keeping each note's own undo history and cursor.
  const shownId = useRef(props.noteId)
  useEffect(() => {
    const view = viewRef.current
    if (!view || shownId.current === props.noteId) return
    states.current.set(shownId.current, view.state)
    shownId.current = props.noteId
    view.setState(stateFor(props.noteId, props.value))
    view.scrollDOM.scrollTop = 0
    if (props.focusOnOpen) view.focus()
    view.dispatch({ effects: setFocus.of(view.hasFocus) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.noteId])

  // External edits (link rewrites after a rename, another tab) — sync in.
  useEffect(() => {
    const view = viewRef.current
    if (!view || shownId.current !== props.noteId) return
    const doc = view.state.doc.toString()
    if (doc === props.value) return
    view.dispatch({ changes: { from: 0, to: doc.length, insert: props.value }, annotations: External.of(true) })
  }, [props.value, props.noteId])

  // Re-evaluate resolved/unresolved links when the vault changes.
  useEffect(() => {
    viewRef.current?.dispatch({ effects: refreshLinks.of(null) })
  }, [props.notes])

  useEffect(() => {
    const view = viewRef.current
    if (!view || !props.jump) return
    const wanted = props.jump.heading.trim().toLowerCase()
    const doc = view.state.doc
    for (let i = 1; i <= doc.lines; i++) {
      const line = doc.line(i)
      const m = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line.text)
      if (m && m[1].toLowerCase() === wanted) {
        view.dispatch({
          selection: { anchor: line.to },
          effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 24 }),
        })
        view.focus()
        return
      }
    }
  }, [props.jump])

  return <div ref={host} className="h-full min-h-0" />
}

function syntaxIsCode(state: EditorState, pos: number): boolean {
  const line = state.doc.lineAt(pos)
  // Cheap check: inside inline code on this line, or inside a fenced block.
  const before = line.text.slice(0, pos - line.from)
  if ((before.match(/`/g)?.length ?? 0) % 2 === 1) return true
  let fences = 0
  for (let i = 1; i < line.number; i++) if (/^\s*(```|~~~)/.test(state.doc.line(i).text)) fences++
  return fences % 2 === 1
}

export default NoteEditor
