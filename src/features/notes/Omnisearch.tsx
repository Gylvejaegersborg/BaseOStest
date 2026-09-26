import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import MiniSearch, { type SearchResult } from 'minisearch'
import { FileText, LayoutDashboard, Search, Table2 } from 'lucide-react'
import type { Note } from '@/data/notes'
import { cn } from '@/lib/cn'
import { contentOf } from './frontmatter'
import { parseCanvas } from './canvas/types'
import { joinPath, noteTags } from './vault'

// Vault-wide full-text search, modelled on the Omnisearch plugin: ranked
// (BM25), prefix- and typo-tolerant, searching titles, headings, tags,
// properties and text, with highlighted excerpts. Enter opens the note
// at the first match.

interface Doc {
  id: string
  title: string
  path: string
  headings: string
  tags: string
  props: string
  content: string
}

/** Markdown → plain-ish text, so excerpts read cleanly. */
function plain(md: string): string {
  return md
    .replace(/```[^\n]*\n/g, '')
    .replace(/```/g, '')
    .replace(/!?\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/!?\[\[([^\]]+)\]\]/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^>\s*\[![\w-]+\][+-]?\s*/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\*\*|__|==|~~|`/g, '')
    .replace(/^\|?\s*:?-{3,}.*$/gm, '')
    .replace(/\|/g, ' ')
}

function toDoc(n: Note): Doc {
  const base = { id: n.id, title: n.title, path: joinPath(n.folder, n.title), tags: noteTags(n).join(' ') }
  if (n.kind === 'canvas') {
    const data = parseCanvas(n.body)
    const text = data.nodes.map((x) => [x.text, x.label, x.url].filter(Boolean).join(' ')).join('\n')
    return { ...base, headings: '', props: '', content: plain(text) }
  }
  if (n.kind === 'base') return { ...base, headings: '', props: '', content: '' }
  const content = contentOf(n.body)
  const headings = [...content.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => m[1]).join(' ')
  const props = Object.entries(n.props ?? {})
    .map(([k, v]) => `${k} ${Array.isArray(v) ? v.join(' ') : v ?? ''}`)
    .join(' ')
  return { ...base, headings, props, content: plain(content) }
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function highlight(text: string, re: RegExp | null): ReactNode {
  if (!re) return text
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(re)) {
    out.push(text.slice(last, m.index))
    out.push(
      <mark key={m.index} className="rounded-sm bg-amber/25 text-text">
        {m[0]}
      </mark>,
    )
    last = (m.index ?? 0) + m[0].length
  }
  out.push(text.slice(last))
  return out
}

/** Up to two excerpts around the first matches of the matched terms. */
function excerpts(content: string, terms: string[]): string[] {
  const lower = content.toLowerCase()
  const hits: number[] = []
  for (const t of terms) {
    const i = lower.indexOf(t.toLowerCase())
    if (i !== -1 && !hits.some((h) => Math.abs(h - i) < 120)) hits.push(i)
  }
  return hits
    .sort((a, b) => a - b)
    .slice(0, 2)
    .map((i) => {
      const from = Math.max(0, content.lastIndexOf(' ', Math.max(0, i - 70)))
      const to = Math.min(content.length, content.indexOf(' ', i + 110) === -1 ? content.length : content.indexOf(' ', i + 110))
      return `${from > 0 ? '…' : ''}${content.slice(from, to).replace(/\s+/g, ' ').trim()}${to < content.length ? '…' : ''}`
    })
}

export function Omnisearch({
  notes,
  onClose,
  onOpen,
}: {
  notes: Note[]
  onClose: () => void
  /** Opens a note; `match` is the text to jump to, when there is one. */
  onOpen: (id: string, match: string | null) => void
}) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const { index, docs } = useMemo(() => {
    const docs = new Map(notes.map((n) => [n.id, toDoc(n)]))
    const index = new MiniSearch<Doc>({
      fields: ['title', 'path', 'headings', 'tags', 'props', 'content'],
      storeFields: ['id'],
      processTerm: (t) => t.toLowerCase(),
    })
    index.addAll([...docs.values()])
    return { index, docs }
  }, [notes])

  const results = useMemo<SearchResult[]>(() => {
    const query = q.trim()
    if (!query) return []
    const opts = {
      boost: { title: 4, headings: 2, tags: 2, props: 1.5, path: 1 },
      prefix: true,
      fuzzy: (term: string) => (term.length > 3 ? 0.2 : false),
    }
    const all = index.search(query, { ...opts, combineWith: 'AND' })
    return (all.length ? all : index.search(query, { ...opts, combineWith: 'OR' })).slice(0, 50)
  }, [index, q])

  useEffect(() => setActive(0), [q])
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const byId = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes])

  const open = (r: SearchResult | undefined) => {
    if (!r) return
    const doc = docs.get(r.id as string)
    const term = r.terms.find((t) => doc?.content.toLowerCase().includes(t)) ?? null
    onOpen(r.id as string, term)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[90] flex justify-center bg-black/50 px-4 pt-[10vh] backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="flex max-h-[75vh] w-full max-w-[680px] flex-col overflow-hidden rounded-panel border border-line-2 bg-panel font-read shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Search size={16} className="shrink-0 text-accent" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(a + 1, results.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                open(results[active])
              } else if (e.key === 'Escape') onClose()
            }}
            placeholder="Search every note…"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-text outline-none placeholder:text-dim"
          />
          <kbd className="rounded border border-line-2 px-1.5 py-0.5 font-mono text-[10px] text-dim">esc</kbd>
        </div>
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto py-1">
          {!q.trim() && (
            <div className="px-4 py-6 text-center text-[12px] text-dim">
              Searches titles, headings, tags, properties and the text of every note and canvas.
              <br />
              Matches word beginnings and tolerates small typos. <span className="text-text/70">↑ ↓</span> to move,{' '}
              <span className="text-text/70">Enter</span> to open at the match.
            </div>
          )}
          {q.trim() && !results.length && <div className="px-4 py-6 text-center text-[12px] text-dim">No matches.</div>}
          {results.map((r, i) => {
            const note = byId.get(r.id as string)
            const doc = docs.get(r.id as string)
            if (!note || !doc) return null
            const re = r.terms.length ? new RegExp(`(${r.terms.map(escapeRe).join('|')})`, 'gi') : null
            const Icon = note.kind === 'canvas' ? LayoutDashboard : note.kind === 'base' ? Table2 : FileText
            return (
              <button
                key={r.id}
                data-idx={i}
                onMouseEnter={() => setActive(i)}
                onClick={() => open(r)}
                className={cn('block w-full px-4 py-2 text-left', i === active ? 'bg-accent/15' : 'hover:bg-panel-2')}
              >
                <div className="flex items-center gap-2">
                  <Icon size={13} className="shrink-0 text-dim" />
                  <span className="truncate text-[13px] font-semibold text-text">{highlight(note.title, re)}</span>
                  {note.folder && <span className="ml-auto shrink-0 truncate text-[11px] text-dim">{note.folder}</span>}
                </div>
                {excerpts(doc.content, r.terms).map((ex, j) => (
                  <div key={j} className="mt-1 line-clamp-2 pl-[21px] text-[12px] leading-relaxed text-text/65">
                    {highlight(ex, re)}
                  </div>
                ))}
              </button>
            )
          })}
        </div>
        {results.length > 0 && (
          <div className="border-t border-line px-4 py-1.5 text-[11px] text-dim">
            {results.length} note{results.length === 1 ? '' : 's'}
          </div>
        )}
      </div>
    </div>
  )
}
