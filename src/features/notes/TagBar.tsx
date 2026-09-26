import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Plus, Wand2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { cleanTag } from './vault'

/** The note footer: the note's own tags (removable), its inline #tags
 *  (read-only, they live in the text), and an input that suggests existing
 *  vault tags as you type. `right` renders at the far end (stats, backlinks). */
export function TagBar({
  tags,
  inlineTags,
  vaultTags,
  onAdd,
  onRemove,
  onAutotag,
  onTagClick,
  right,
}: {
  tags: string[]
  inlineTags: string[]
  /** Every tag in the vault with its note count — the suggestion pool. */
  vaultTags: [string, number][]
  onAdd: (t: string) => void
  onRemove: (t: string) => void
  onAutotag: () => void
  onTagClick: (t: string) => void
  right?: ReactNode
}) {
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const present = useMemo(() => new Set([...tags, ...inlineTags]), [tags, inlineTags])
  const q = cleanTag(draft)
  const suggestions = useMemo(() => {
    const pool = vaultTags.filter(([t]) => !present.has(t))
    const hits = q
      ? pool
          .filter(([t]) => t.includes(q))
          .sort(([a], [b]) => Number(!a.startsWith(q)) - Number(!b.startsWith(q)) || a.localeCompare(b))
      : pool
    const out: { tag: string; count: number | null }[] = hits.slice(0, 8).map(([tag, count]) => ({ tag, count }))
    if (q && !present.has(q) && !vaultTags.some(([t]) => t === q)) out.push({ tag: q, count: null })
    return out
  }, [vaultTags, present, q])

  const pick = (t: string) => {
    const clean = cleanTag(t)
    if (clean && !present.has(clean)) onAdd(clean)
    setDraft('')
    setActive(0)
    inputRef.current?.focus()
  }

  return (
    <div className="relative flex flex-wrap items-center gap-1.5 border-t border-line bg-panel/40 px-3 py-1.5 font-read">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full bg-accent/15 py-0.5 pl-2 pr-1 text-[11px] text-accent-1"
        >
          <button onClick={() => onTagClick(t)} title={`Filter by #${t}`}>
            #{t}
          </button>
          <button onClick={() => onRemove(t)} className="text-accent-1/60 hover:text-danger" aria-label={`Remove tag ${t}`}>
            <X size={11} />
          </button>
        </span>
      ))}
      {inlineTags
        .filter((t) => !tags.includes(t))
        .map((t) => (
          <button
            key={`inline-${t}`}
            onClick={() => onTagClick(t)}
            title="From the note text"
            className="rounded-full border border-dashed border-accent/30 px-2 py-0.5 text-[11px] text-accent-1/70 hover:text-accent-1"
          >
            #{t}
          </button>
        ))}

      <div className="relative min-w-[110px] flex-1">
        <div className="flex items-center gap-1 text-dim">
          <Plus size={12} className="shrink-0" />
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setOpen(true)
              setActive(0)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setOpen(true)
                setActive((a) => Math.min(a + 1, suggestions.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter' || e.key === 'Tab') {
                const choice = open ? suggestions[active]?.tag : null
                if (choice || q) {
                  e.preventDefault()
                  pick(choice ?? q)
                }
              } else if (e.key === ',' || e.key === ' ') {
                if (q) {
                  e.preventDefault()
                  pick(q)
                }
              } else if (e.key === 'Escape') {
                setOpen(false)
              } else if (e.key === 'Backspace' && !draft && tags.length) {
                onRemove(tags[tags.length - 1])
              }
            }}
            placeholder="add tag…"
            className="w-full bg-transparent py-0.5 text-[12px] text-text placeholder:text-dim focus:outline-none"
          />
        </div>
        {open && suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 z-30 mb-2 max-h-64 w-56 overflow-y-auto rounded-panel border border-line-2 bg-panel py-1 shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
            {suggestions.map((s, i) => (
              <button
                key={s.tag}
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(s.tag)
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-3 py-1 text-left text-[12px]',
                  i === active ? 'bg-accent/20 text-text' : 'text-text/80',
                )}
              >
                <span className="truncate">
                  {s.count == null && <span className="text-dim">Create </span>}#{s.tag}
                </span>
                {s.count != null && <span className="text-[10px] text-dim">{s.count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onAutotag}
        title="Suggest tags from the note text"
        className="flex items-center gap-1 rounded-control px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-dim hover:bg-panel-2 hover:text-accent"
      >
        <Wand2 size={11} /> Auto
      </button>
      {right}
    </div>
  )
}
