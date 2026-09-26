import { useMemo, useState } from 'react'
import { ChevronLeft, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNotesList } from '@/features/notes/notesStore'
import { contentOf } from '@/features/notes/frontmatter'
import { SearchInput } from '@/components/ui/SearchInput'
import { relTime } from '@/lib/time'

/**
 * The Workbench's docked Notes reference panel (Phase 5, "Send to Notes" /
 * sidepanel docking) — a search-and-preview pane that lives in RightPanel
 * alongside Tasks/Flow/etc. `dockedNoteId` is owned by Workbench so a chat
 * message's "Send to Notes" action and the composer's note picker can both
 * summon the same panel instance to the same note.
 */
export function NotesTab({
  dockedNoteId,
  onSelectNote,
}: {
  dockedNoteId: string | null
  onSelectNote: (id: string | null) => void
}) {
  const notes = useNotesList()
  const [query, setQuery] = useState('')
  const docked = dockedNoteId ? notes.find((n) => n.id === dockedNoteId) ?? null : null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q) || n.tags.some((t) => t.includes(q)),
    )
  }, [notes, query])

  if (docked) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2">
          <button onClick={() => onSelectNote(null)} className="text-dim hover:text-text" title="Back to notes">
            <ChevronLeft size={14} />
          </button>
          <span className="truncate text-xs text-text">{docked.title}</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="prose-term prose-read">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{contentOf(docked.body)}</ReactMarkdown>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search notes…" autoFocus />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 && <p className="p-4 text-center text-xs text-dim">No notes found.</p>}
        {filtered.map((n) => (
          <button
            key={n.id}
            onClick={() => onSelectNote(n.id)}
            className="flex w-full items-start gap-2 border-b border-line/60 px-3 py-2 text-left hover:bg-panel-2"
          >
            <FileText size={13} className="mt-0.5 shrink-0 text-dim" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-text">{n.title}</span>
              <span className="block truncate text-[10px] text-dim">
                {n.folder} · {relTime(new Date(n.updated))}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
