import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, ChevronLeft, FileText, Hash, Pencil } from 'lucide-react'
import { NOTES, NOTE_TAGS, type Note } from '@/data/notes'
import { SearchInput } from '@/components/ui/SearchInput'
import { relTime } from '@/lib/time'
import { cn } from '@/lib/cn'

export function Notes() {
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string>(NOTES[0].id)
  const [editing, setEditing] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('os:notes:drafts') ?? '{}') }
    catch { return {} }
  })
  // mobile master-detail: 'list' shows the browser, 'note' shows the editor
  const [mobileView, setMobileView] = useState<'list' | 'note'>('list')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return NOTES.filter((n) => {
      if (tag && !n.tags.includes(tag)) return false
      if (!q) return true
      return n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q) || n.tags.some((t) => t.includes(q))
    })
  }, [query, tag])

  const grouped = useMemo(() => {
    const map = new Map<string, Note[]>()
    for (const n of filtered) {
      const arr = map.get(n.folder) ?? []
      arr.push(n)
      map.set(n.folder, arr)
    }
    return [...map.entries()]
  }, [filtered])

  const selected = NOTES.find((n) => n.id === selectedId)!
  const body = drafts[selectedId] ?? selected.body

  return (
    <div className="flex h-full">
      {/* Browser */}
      <aside
        className={cn(
          'w-full shrink-0 flex-col border-r border-line bg-panel/40 lg:flex lg:w-[300px]',
          mobileView === 'note' ? 'hidden' : 'flex',
        )}
      >
        <div className="border-b border-line p-3">
          <SearchInput value={query} onChange={setQuery} placeholder="search 320 notes…" />
          <div className="mt-2 flex flex-wrap gap-1">
            {NOTE_TAGS.slice(0, 8).map((t) => (
              <button
                key={t}
                onClick={() => setTag(tag === t ? null : t)}
                className={cn(
                  'border px-1.5 py-0.5 text-[10px] uppercase tracking-wider transition-colors',
                  tag === t ? 'border-accent/60 text-accent' : 'border-line text-dim hover:text-text',
                )}
              >
                #{t}
              </button>
            ))}
          </div>
          <div className="mt-2 text-[10px] tracking-wider text-dim">
            {filtered.length} / {NOTES.length} notes
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {grouped.map(([folder, items]) => (
            <div key={folder}>
              <div className="sticky top-0 z-10 flex items-center gap-1.5 bg-panel/95 px-3 py-1.5 backdrop-blur">
                <FileText size={11} className="text-dim" />
                <span className="label">{folder}</span>
                <span className="text-[10px] text-dim">[{items.length}]</span>
              </div>
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setSelectedId(n.id)
                    setMobileView('note')
                    setEditing(false)
                  }}
                  className={cn(
                    'flex w-full flex-col gap-0.5 border-l-2 px-3 py-2 text-left transition-colors',
                    n.id === selectedId
                      ? 'border-accent bg-accent/5'
                      : 'border-transparent hover:bg-panel-2/50',
                  )}
                >
                  <span className="truncate text-xs text-text">
                    <Highlight text={n.title} q={query} />
                  </span>
                  <span className="flex items-center gap-2 text-[10px] text-dim">
                    <span>{relTime(new Date(n.updated))}</span>
                    <span className="truncate">{n.tags.map((t) => `#${t}`).join(' ')}</span>
                  </span>
                </button>
              ))}
            </div>
          ))}
          {!filtered.length && <div className="p-4 text-xs text-dim">No notes match.</div>}
        </div>
      </aside>

      {/* Editor / preview */}
      <section
        className={cn(
          'min-w-0 flex-1 flex-col lg:flex',
          mobileView === 'list' ? 'hidden' : 'flex',
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setMobileView('list')}
              className="text-dim hover:text-text lg:hidden"
              aria-label="Back to list"
            >
              <ChevronLeft size={16} />
            </button>
            <Hash size={13} className="text-dim" />
            <span className="truncate font-display text-text">{selected.title}</span>
            <span className="hidden text-[10px] text-dim sm:inline">· {selected.folder}</span>
          </div>
          <button
            onClick={() => setEditing((e) => !e)}
            className={cn(
              'flex items-center gap-1 border px-2.5 py-1 text-[11px] uppercase tracking-wider transition-colors',
              editing ? 'border-accent/60 bg-accent/10 text-accent' : 'border-line text-dim hover:text-text',
            )}
          >
            {editing ? (
              <>
                <Check size={12} /> Done
              </>
            ) : (
              <>
                <Pencil size={12} /> Edit
              </>
            )}
          </button>
        </div>

        {/* Single rendered view. Click the page (or Edit) to drop into the raw
            markdown; blurring or hitting Done returns to the rendered note. */}
        <div className="min-h-0 flex-1">
          {editing ? (
            <textarea
              autoFocus
              value={body}
              onChange={(e) => {
                const next = { ...drafts, [selectedId]: e.target.value }
                setDrafts(next)
                localStorage.setItem('os:notes:drafts', JSON.stringify(next))
              }}
              onBlur={() => setEditing(false)}
              spellCheck={false}
              className="h-full w-full resize-none bg-bg/40 p-5 text-sm leading-relaxed text-text/90 outline-none"
            />
          ) : (
            <div
              onClick={() => setEditing(true)}
              title="Click to edit"
              className="h-full cursor-text overflow-y-auto p-5"
            >
              <article className="prose-term mx-auto w-full max-w-3xl">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
              </article>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function Highlight({ text, q }: { text: string; q: string }) {
  const term = q.trim()
  if (!term) return <>{text}</>
  const idx = text.toLowerCase().indexOf(term.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent/30 text-text">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  )
}
