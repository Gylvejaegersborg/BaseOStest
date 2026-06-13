import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, ChevronLeft, FileText, Hash, Pencil, Plus, Trash2, Wand2, X } from 'lucide-react'
import { NOTES, NOTE_FOLDERS, NOTE_TAGS, type Note } from '@/data/notes'
import { useOsOverlay, mergeById } from '@/features/team/osOverlay'
import { SearchInput } from '@/components/ui/SearchInput'
import { relTime } from '@/lib/time'
import { cn } from '@/lib/cn'

const STORAGE = {
  drafts: 'os:notes:drafts',
  userNotes: 'os:notes:user',
  deleted: 'os:notes:deleted',
  tags: 'os:notes:tags',
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}
function saveJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

// Derive a display title from the body's first H1 so renaming via the editor
// "just works"; fall back to the stored title.
function titleFromBody(body: string, fallback: string): string {
  const m = body.match(/^#\s+(.+)$/m)
  return m ? m[1].trim() : fallback
}

// Suggest tags based on which known keywords appear in the body. Adds to the
// existing list rather than replacing — manual additions are preserved.
function autotag(body: string, existing: string[]): string[] {
  const lower = ` ${body.toLowerCase()} `
  const out = new Set(existing)
  for (const t of NOTE_TAGS) {
    if (lower.includes(t.toLowerCase())) out.add(t)
  }
  return [...out]
}

export function Notes() {
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'note'>('list')

  const [drafts, setDrafts] = useState<Record<string, string>>(() => loadJSON(STORAGE.drafts, {}))
  const [userNotes, setUserNotes] = useState<Note[]>(() => loadJSON<Note[]>(STORAGE.userNotes, []))
  const [deleted, setDeleted] = useState<string[]>(() => loadJSON<string[]>(STORAGE.deleted, []))
  const [tagsOverride, setTagsOverride] = useState<Record<string, string[]>>(() =>
    loadJSON(STORAGE.tags, {}),
  )

  const overlay = useOsOverlay()
  const allNotes = useMemo<Note[]>(() => {
    const del = new Set(deleted)
    // Agent-authored notes (overlay) sit alongside the user's and the seed notes.
    return mergeById([...userNotes, ...NOTES], overlay.notes)
      .filter((n) => !del.has(n.id))
      .map((n) => ({ ...n, tags: tagsOverride[n.id] ?? n.tags }))
  }, [userNotes, deleted, tagsOverride, overlay.notes])

  const [selectedId, setSelectedId] = useState<string>(allNotes[0]?.id ?? '')
  const selected = allNotes.find((n) => n.id === selectedId) ?? allNotes[0]
  const body = selected ? drafts[selected.id] ?? selected.body : ''
  const displayTitle = selected ? titleFromBody(body, selected.title) : ''
  const currentTags = selected?.tags ?? []

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

  // ---- mutations -----------------------------------------------------------

  const updateBody = (id: string, next: string) => {
    const map = { ...drafts, [id]: next }
    setDrafts(map)
    saveJSON(STORAGE.drafts, map)
  }

  const updateTags = (id: string, next: string[]) => {
    const map = { ...tagsOverride, [id]: next }
    setTagsOverride(map)
    saveJSON(STORAGE.tags, map)
  }

  const addNote = () => {
    const id = `note-user-${Date.now()}`
    const folder = NOTE_FOLDERS.includes('Journal') ? 'Journal' : NOTE_FOLDERS[0]
    const note: Note = {
      id,
      title: 'Untitled',
      folder,
      tags: [],
      updated: new Date().toISOString(),
      body: '# Untitled\n\nStart typing…',
    }
    const next = [note, ...userNotes]
    setUserNotes(next)
    saveJSON(STORAGE.userNotes, next)
    setSelectedId(id)
    setMobileView('note')
    setEditing(true)
  }

  const deleteNote = (id: string) => {
    if (!window.confirm('Delete this note? This cannot be undone.')) return
    // Drop drafts and tag overrides for the dead note.
    const nextDrafts = { ...drafts }
    delete nextDrafts[id]
    const nextTags = { ...tagsOverride }
    delete nextTags[id]
    setDrafts(nextDrafts)
    saveJSON(STORAGE.drafts, nextDrafts)
    setTagsOverride(nextTags)
    saveJSON(STORAGE.tags, nextTags)

    if (id.startsWith('note-user-')) {
      const next = userNotes.filter((n) => n.id !== id)
      setUserNotes(next)
      saveJSON(STORAGE.userNotes, next)
    } else {
      const next = [...deleted, id]
      setDeleted(next)
      saveJSON(STORAGE.deleted, next)
    }
    setEditing(false)
    // pick the next available note
    const remaining = allNotes.filter((n) => n.id !== id)
    setSelectedId(remaining[0]?.id ?? '')
    setMobileView('list')
  }

  const finishEditing = () => {
    if (selected) {
      const suggested = autotag(body, currentTags)
      if (suggested.length !== currentTags.length) {
        updateTags(selected.id, suggested)
      }
    }
    setEditing(false)
  }

  const addTag = (t: string) => {
    if (!selected) return
    const clean = t.trim().toLowerCase().replace(/^#/, '')
    if (!clean) return
    if (currentTags.includes(clean)) return
    updateTags(selected.id, [...currentTags, clean])
  }

  const removeTag = (t: string) => {
    if (!selected) return
    updateTags(selected.id, currentTags.filter((x) => x !== t))
  }

  // ---- render --------------------------------------------------------------

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
          <div className="mb-2 flex items-center justify-between">
            <span className="label">Notes</span>
            <button
              onClick={addNote}
              title="New note"
              className="flex items-center gap-1 border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-dim hover:border-accent/60 hover:text-accent"
            >
              <Plus size={11} /> New
            </button>
          </div>
          <SearchInput value={query} onChange={setQuery} placeholder={`search ${allNotes.length} notes…`} />
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
                    <Highlight text={titleFromBody(drafts[n.id] ?? n.body, n.title)} q={query} />
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
        {!selected ? (
          <EmptyState onCreate={addNote} />
        ) : (
          <>
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
                <span className="truncate font-display text-text">{displayTitle}</span>
                <span className="hidden text-[10px] text-dim sm:inline">· {selected.folder}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={editing ? finishEditing : () => setEditing(true)}
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
                <button
                  onClick={() => deleteNote(selected.id)}
                  title="Delete note"
                  className="flex items-center gap-1 border border-line p-1.5 text-dim transition-colors hover:border-danger/60 hover:text-danger"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Editor body */}
            <div className="min-h-0 flex-1">
              {editing ? (
                <textarea
                  autoFocus
                  value={body}
                  onChange={(e) => updateBody(selected.id, e.target.value)}
                  onBlur={finishEditing}
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

            {/* Tag footer */}
            <TagBar
              tags={currentTags}
              onAdd={addTag}
              onRemove={removeTag}
              onAutotag={() => updateTags(selected.id, autotag(body, currentTags))}
            />
          </>
        )}
      </section>
    </div>
  )
}

function TagBar({
  tags,
  onAdd,
  onRemove,
  onAutotag,
}: {
  tags: string[]
  onAdd: (t: string) => void
  onRemove: (t: string) => void
  onAutotag: () => void
}) {
  const [draft, setDraft] = useState('')
  const submit = () => {
    if (!draft.trim()) return
    onAdd(draft)
    setDraft('')
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-line bg-panel/40 px-3 py-2">
      <span className="label mr-1">Tags</span>
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-accent"
        >
          #{t}
          <button onClick={() => onRemove(t)} className="text-accent/70 hover:text-danger" aria-label={`Remove tag ${t}`}>
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            submit()
          } else if (e.key === ',' || e.key === ' ') {
            // allow space/comma as quick separators
            if (draft.trim()) {
              e.preventDefault()
              submit()
            }
          }
        }}
        onBlur={submit}
        placeholder="add tag…"
        className="min-w-[80px] flex-1 bg-transparent px-1 py-0.5 text-[11px] text-text placeholder:text-dim focus:outline-none"
      />
      <button
        onClick={onAutotag}
        title="Suggest tags from the note body"
        className="ml-auto flex items-center gap-1 border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-dim hover:border-accent/60 hover:text-accent"
      >
        <Wand2 size={10} /> Auto
      </button>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-dim">
      <div className="font-display text-base">No notes</div>
      <p className="max-w-xs text-xs">Your vault is empty. Create the first note to get going.</p>
      <button
        onClick={onCreate}
        className="flex items-center gap-1 border border-accent/60 bg-accent/10 px-3 py-1.5 text-xs uppercase tracking-wider text-accent"
      >
        <Plus size={12} /> New note
      </button>
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
