import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, ChevronLeft, FileText, Hash, Pencil, Plus, X } from 'lucide-react'
import { NOTES, NOTE_TAGS, type Note } from '@/data/notes'
import { SearchInput } from '@/components/ui/SearchInput'
import { relTime } from '@/lib/time'
import { cn } from '@/lib/cn'

// ─── Auto-tag heuristics ────────────────────────────────────────────────────
const TAG_SIGNALS: Record<string, string[]> = {
  release:     ['release', 'launch', 'ship', 'publish', 'drop'],
  mixing:      ['mix', 'master', 'eq', 'compression', 'loudness', 'lufs', 'stem'],
  lyrics:      ['lyric', 'verse', 'chorus', 'hook', 'bar', 'rhyme'],
  homeserver:  ['homeserver', 'server', 'nginx', 'docker', 'container', 'reverse proxy'],
  agents:      ['agent', 'claude', 'hemera', 'nyx', 'llm', 'prompt', 'ai'],
  copyparty:   ['copyparty', 'upload', 'file server', 'drop'],
  idea:        ['idea', 'concept', 'maybe', 'consider', 'experiment'],
  todo:        ['todo', 'to-do', '[ ]', '- [ ]', 'task', 'action item'],
  reference:   ['reference', 'doc', 'documentation', 'guide', 'resource'],
  discord:     ['discord', 'bot', 'webhook', 'channel', 'guild'],
  shortcuts:   ['shortcut', 'ios', 'iphone', 'automation', 'trigger'],
  beats:       ['beat', 'bpm', 'sample', 'trap', 'drill', 'track', 'melody'],
  review:      ['review', 'feedback', 'notes on', 'thoughts on', 'summary'],
  infra:       ['infra', 'infrastructure', 'deploy', 'ci', 'pipeline', 'monitor'],
}

function autoTag(title: string, body: string): string[] {
  const hay = (title + ' ' + body).toLowerCase()
  return NOTE_TAGS.filter((tag) => {
    const signals = TAG_SIGNALS[tag] ?? [tag]
    return signals.some((s) => hay.includes(s))
  })
}

// ─── Custom-note persistence ─────────────────────────────────────────────────
function loadCustomNotes(): Note[] {
  try { return JSON.parse(localStorage.getItem('os:notes:custom') ?? '[]') }
  catch { return [] }
}

function saveCustomNotes(notes: Note[]) {
  localStorage.setItem('os:notes:custom', JSON.stringify(notes))
}

function loadDrafts(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem('os:notes:drafts') ?? '{}') }
  catch { return {} }
}

// ─── Component ───────────────────────────────────────────────────────────────
export function Notes() {
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [customNotes, setCustomNotes] = useState<Note[]>(loadCustomNotes)
  const [selectedId, setSelectedId] = useState<string>(NOTES[0].id)
  const [editing, setEditing] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>(loadDrafts)
  const [mobileView, setMobileView] = useState<'list' | 'note'>('list')

  const allNotes = useMemo(() => [...NOTES, ...customNotes], [customNotes])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allNotes.filter((n) => {
      if (tag && !n.tags.includes(tag)) return false
      if (!q) return true
      return n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q) || n.tags.some((t) => t.includes(q))
    })
  }, [allNotes, query, tag])

  const grouped = useMemo(() => {
    const map = new Map<string, Note[]>()
    for (const n of filtered) {
      const arr = map.get(n.folder) ?? []
      arr.push(n)
      map.set(n.folder, arr)
    }
    return [...map.entries()]
  }, [filtered])

  const selected = allNotes.find((n) => n.id === selectedId) ?? allNotes[0]
  const body = drafts[selected.id] ?? selected.body
  const isCustom = customNotes.some((n) => n.id === selected.id)

  const updateDraft = (id: string, text: string) => {
    setDrafts((d) => {
      const next = { ...d, [id]: text }
      localStorage.setItem('os:notes:drafts', JSON.stringify(next))
      return next
    })
  }

  const updateTags = (id: string, tags: string[]) => {
    setCustomNotes((prev) => {
      const next = prev.map((n) => n.id === id ? { ...n, tags, updated: new Date().toISOString() } : n)
      saveCustomNotes(next)
      return next
    })
  }

  const createNote = () => {
    const id = `custom-${Date.now()}`
    const note: Note = {
      id,
      title: 'Untitled',
      folder: 'Journal',
      tags: [],
      updated: new Date().toISOString(),
      body: '# Untitled\n\n',
    }
    setCustomNotes((prev) => {
      const next = [note, ...prev]
      saveCustomNotes(next)
      return next
    })
    setSelectedId(id)
    setEditing(true)
    setMobileView('note')
  }

  const commitDraftTitle = (id: string) => {
    const currentBody = drafts[id] ?? ''
    const firstLine = currentBody.split('\n')[0].replace(/^#+\s*/, '').trim()
    const title = firstLine || 'Untitled'
    const tags = autoTag(title, currentBody)
    setCustomNotes((prev) => {
      const next = prev.map((n) => n.id === id ? { ...n, title, tags, updated: new Date().toISOString() } : n)
      saveCustomNotes(next)
      return next
    })
  }

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
          <div className="flex items-center gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder={`search ${allNotes.length} notes…`} className="flex-1" />
            <button
              onClick={createNote}
              className="flex h-8 w-8 shrink-0 items-center justify-center border border-line text-dim transition-colors hover:border-accent/60 hover:text-accent"
              title="New note"
            >
              <Plus size={15} />
            </button>
          </div>
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
            {filtered.length} / {allNotes.length} notes
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
            onClick={() => {
              if (editing && isCustom) commitDraftTitle(selected.id)
              setEditing((e) => !e)
            }}
            className={cn(
              'flex items-center gap-1 border px-2.5 py-1 text-[11px] uppercase tracking-wider transition-colors',
              editing ? 'border-accent/60 bg-accent/10 text-accent' : 'border-line text-dim hover:text-text',
            )}
          >
            {editing ? <><Check size={12} /> Done</> : <><Pencil size={12} /> Edit</>}
          </button>
        </div>

        <div className="min-h-0 flex-1">
          {editing ? (
            <textarea
              autoFocus
              value={body}
              onChange={(e) => updateDraft(selected.id, e.target.value)}
              onBlur={() => {
                if (isCustom) commitDraftTitle(selected.id)
                setEditing(false)
              }}
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

        {/* Tag bar */}
        <TagBar
          tags={selected.tags}
          editable={isCustom}
          onChange={(tags) => updateTags(selected.id, tags)}
        />
      </section>
    </div>
  )
}

// ─── Tag bar ──────────────────────────────────────────────────────────────────
function TagBar({ tags, editable, onChange }: { tags: string[]; editable: boolean; onChange: (t: string[]) => void }) {
  const [adding, setAdding] = useState(false)
  const [input, setInput] = useState('')

  const addTag = (t: string) => {
    const clean = t.trim().toLowerCase().replace(/\s+/g, '-')
    if (clean && !tags.includes(clean)) onChange([...tags, clean])
    setInput('')
    setAdding(false)
  }

  const suggest = NOTE_TAGS.filter((t) => !tags.includes(t) && t.includes(input.toLowerCase())).slice(0, 5)

  return (
    <div className="flex min-h-[36px] flex-wrap items-center gap-1.5 border-t border-line px-4 py-2">
      {tags.map((t) => (
        <span
          key={t}
          className="flex items-center gap-1 border border-line bg-bg/40 px-1.5 py-0.5 text-[10px] text-dim"
        >
          #{t}
          {editable && (
            <button onClick={() => onChange(tags.filter((x) => x !== t))} className="hover:text-danger">
              <X size={9} />
            </button>
          )}
        </span>
      ))}

      {editable && !adding && (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-0.5 border border-dashed border-line px-1.5 py-0.5 text-[10px] text-dim hover:border-accent/60 hover:text-accent"
        >
          <Plus size={9} /> tag
        </button>
      )}

      {editable && adding && (
        <div className="relative">
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTag(input)
              if (e.key === 'Escape') { setAdding(false); setInput('') }
            }}
            onBlur={() => { if (!input) setAdding(false) }}
            placeholder="tag…"
            className="w-24 border border-accent/40 bg-bg/60 px-1.5 py-0.5 text-[10px] text-text outline-none"
          />
          {suggest.length > 0 && input && (
            <div className="absolute bottom-full left-0 z-10 mb-1 flex flex-col border border-line bg-panel shadow-glow">
              {suggest.map((s) => (
                <button
                  key={s}
                  onMouseDown={() => addTag(s)}
                  className="px-2 py-1 text-left text-[10px] text-dim hover:bg-accent/10 hover:text-accent"
                >
                  #{s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!editable && tags.length === 0 && (
        <span className="text-[10px] text-dim">no tags</span>
      )}
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
