import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  ChevronRight,
  Clock,
  Hash,
  List,
  Plus,
  Tags as TagsIcon,
  X,
} from 'lucide-react'
import type { Note } from '@/data/notes'
import { cn } from '@/lib/cn'
import { asList, coerce, inferType, type PropType, type PropValue } from './frontmatter'
import { openContextMenu } from './menuBus'
import { cleanTag } from './vault'

const TYPE_ICON: Record<PropType, ReactNode> = {
  text: <AlignLeft size={13} />,
  list: <List size={13} />,
  number: <Hash size={13} />,
  checkbox: <CheckSquare size={13} />,
  date: <Calendar size={13} />,
  datetime: <Clock size={13} />,
  tags: <TagsIcon size={13} />,
}

export const TYPE_LABEL: Record<PropType, string> = {
  text: 'Text',
  list: 'List',
  number: 'Number',
  checkbox: 'Checkbox',
  date: 'Date',
  datetime: 'Date & time',
  tags: 'Tags',
}

const COLLAPSE_KEY = 'os:notes:props-collapsed'

function blankFor(type: PropType): PropValue {
  if (type === 'list' || type === 'tags') return []
  if (type === 'checkbox') return false
  return null
}

/** Obsidian's Properties view: the note's frontmatter as typed, editable
 *  rows above the text. Tags show here too (merged from any legacy list). */
export function PropertiesPanel({
  note,
  propTypes,
  suggestions,
  vaultTags,
  addNonce,
  onSet,
  onRename,
  onSetType,
  onOpenWiki,
  onTagClick,
}: {
  note: Note
  propTypes: Record<string, PropType>
  /** Values already used for a property across the vault (list autocomplete). */
  suggestions: (key: string) => string[]
  vaultTags: [string, number][]
  /** Changes when the page asks to start adding a property (/property). */
  addNonce: number
  onSet: (key: string, value: PropValue | undefined) => void
  onRename: (from: string, to: string) => void
  onSetType: (key: string, type: PropType) => void
  onOpenWiki: (target: string) => void
  onTagClick: (tag: string) => void
}) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)

  useEffect(() => {
    if (!addNonce) return
    setCollapsed(false)
    setAdding(true)
  }, [addNonce])

  const props = useMemo(() => {
    const p: Record<string, PropValue> = { ...(note.props ?? {}) }
    // Legacy tags (from before tags were a property) show in the tags row.
    if (note.tags.length) p.tags = note.tags
    return p
  }, [note.props, note.tags])
  const entries = Object.entries(props)
  const typeOf = (k: string, v: PropValue): PropType => propTypes[k] ?? inferType(k, v)

  if (!entries.length && !adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="mb-3 flex items-center gap-1.5 rounded-control px-1 py-0.5 font-read text-[12px] text-dim opacity-0 transition-opacity hover:bg-panel-2 hover:text-text focus:opacity-100 group-hover/note:opacity-100"
      >
        <Plus size={12} /> Add property
      </button>
    )
  }

  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1')
      } catch {
        /* storage unavailable */
      }
      return !c
    })

  return (
    <div className="mb-5 border-b border-line/70 pb-3 font-read text-[13px]">
      <button onClick={toggle} className="mb-1 flex items-center gap-1 text-[12px] font-semibold text-text/80 hover:text-text">
        <ChevronRight size={13} className={cn('text-dim transition-transform', !collapsed && 'rotate-90')} />
        Properties
        {collapsed && <span className="font-normal text-dim">({entries.length})</span>}
      </button>
      {!collapsed && (
        <div className="space-y-px">
          {entries.map(([key, value]) => {
            const type = typeOf(key, value)
            return (
              <div key={key} className="group flex min-h-[30px] items-start gap-2 rounded-control hover:bg-panel-2/60">
                <button
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect()
                    openContextMenu(r.left, r.bottom + 2, [
                      { kind: 'header', label: key, mono: true },
                      {
                        label: 'Property type',
                        submenu: (Object.keys(TYPE_LABEL) as PropType[])
                          .filter((t) => t !== 'tags' || key === 'tags')
                          .map((t) => ({
                            label: TYPE_LABEL[t],
                            checked: t === type,
                            onSelect: () => {
                              onSetType(key, t)
                              onSet(key, coerce(value, t))
                            },
                          })),
                      },
                      { label: 'Rename', disabled: key === 'tags', onSelect: () => setRenaming(key) },
                      { kind: 'separator' },
                      { label: 'Remove', danger: true, onSelect: () => onSet(key, undefined) },
                    ])
                  }}
                  title="Property options"
                  className="flex w-[150px] shrink-0 items-center gap-2 truncate px-1.5 py-1.5 text-left text-dim hover:text-text"
                >
                  <span className="shrink-0">{TYPE_ICON[type]}</span>
                  {renaming === key ? (
                    <input
                      autoFocus
                      defaultValue={key}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur()
                        if (e.key === 'Escape') setRenaming(null)
                      }}
                      onBlur={(e) => {
                        const to = e.currentTarget.value.trim()
                        setRenaming(null)
                        if (to && to !== key) onRename(key, to)
                      }}
                      className="w-full min-w-0 rounded-sm border border-accent/60 bg-bg px-1 text-text outline-none"
                    />
                  ) : (
                    <span className="truncate">{key}</span>
                  )}
                </button>
                <div className="min-w-0 flex-1 py-1">
                  <ValueEditor
                    type={type}
                    value={value}
                    suggestions={type === 'tags' ? vaultTags.map(([t]) => t) : suggestions(key)}
                    onChange={(v) => onSet(key, v)}
                    onOpenWiki={onOpenWiki}
                    onTagClick={onTagClick}
                  />
                </div>
              </div>
            )
          })}
          {adding ? (
            <AddProperty
              existing={Object.keys(props)}
              known={propTypes}
              onDone={(key) => {
                setAdding(false)
                if (!key) return
                onSet(key, blankFor(propTypes[key] ?? (key === 'tags' ? 'tags' : 'text')))
              }}
            />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="mt-1 flex items-center gap-1.5 rounded-control px-1.5 py-1 text-[12px] text-dim hover:bg-panel-2 hover:text-text"
            >
              <Plus size={12} /> Add property
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function AddProperty({
  existing,
  known,
  onDone,
}: {
  existing: string[]
  known: Record<string, PropType>
  onDone: (key: string | null) => void
}) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const done = useRef(false)
  const finish = (key: string | null) => {
    if (done.current) return
    done.current = true
    onDone(key?.trim() || null)
  }
  const options = Object.keys(known)
    .filter((k) => !existing.includes(k) && k.toLowerCase().includes(q.trim().toLowerCase()))
    .sort()
    .slice(0, 8)
  return (
    <div className="relative mt-1 flex items-center gap-2 px-1.5 py-1">
      <Plus size={13} className="text-dim" />
      <input
        autoFocus
        value={q}
        placeholder="Property name"
        onChange={(e) => {
          setQ(e.target.value)
          setActive(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, options.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            finish(options[active] ?? q)
          } else if (e.key === 'Escape') finish(null)
        }}
        onBlur={() => window.setTimeout(() => finish(q || null), 120)}
        className="w-[150px] rounded-sm border border-accent/60 bg-bg px-1.5 py-0.5 text-text outline-none"
      />
      {options.length > 0 && (
        <div className="absolute left-7 top-full z-30 mt-1 w-56 rounded-panel border border-line-2 bg-panel py-1 shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
          {options.map((k, i) => (
            <button
              key={k}
              onMouseDown={(e) => {
                e.preventDefault()
                finish(k)
              }}
              onMouseEnter={() => setActive(i)}
              className={cn('flex w-full items-center gap-2 px-3 py-1 text-left', i === active ? 'bg-accent/20 text-text' : 'text-text/80')}
            >
              <span className="text-dim">{TYPE_ICON[known[k]]}</span>
              {k}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const LINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

export function ValueEditor({
  type,
  value,
  suggestions,
  onChange,
  onOpenWiki,
  onTagClick,
}: {
  type: PropType
  value: PropValue
  suggestions: string[]
  onChange: (v: PropValue) => void
  onOpenWiki: (t: string) => void
  onTagClick: (t: string) => void
}) {
  const field = 'w-full min-w-0 rounded-sm bg-transparent px-1.5 py-0.5 text-text outline-none focus:bg-bg/60 focus:ring-1 focus:ring-accent/50'
  switch (type) {
    case 'checkbox':
      return (
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="ml-1.5 mt-1 h-3.5 w-3.5 cursor-pointer accent-[#c77591]"
        />
      )
    case 'number':
      return (
        <input
          key={String(value)}
          type="number"
          defaultValue={value == null ? '' : String(value)}
          placeholder="Empty"
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          onBlur={(e) => onChange(e.currentTarget.value === '' ? null : Number(e.currentTarget.value))}
          className={cn(field, 'placeholder:text-dim')}
        />
      )
    case 'date':
    case 'datetime':
      return (
        <input
          key={String(value)}
          type={type === 'date' ? 'date' : 'datetime-local'}
          defaultValue={value == null ? '' : String(value).slice(0, type === 'date' ? 10 : 16)}
          onChange={(e) => onChange(e.target.value || null)}
          className={cn(field, '[color-scheme:dark]')}
        />
      )
    case 'list':
    case 'tags':
      return (
        <ListEditor
          tags={type === 'tags'}
          values={asList(value)}
          suggestions={suggestions}
          onChange={onChange}
          onOpenWiki={onOpenWiki}
          onTagClick={onTagClick}
        />
      )
    default:
      return <TextValue value={value == null ? '' : String(value)} onChange={onChange} onOpenWiki={onOpenWiki} className={field} />
  }
}

/** Text shows rendered (so [[links]] are clickable) until clicked. */
function TextValue({
  value,
  onChange,
  onOpenWiki,
  className,
}: {
  value: string
  onChange: (v: PropValue) => void
  onOpenWiki: (t: string) => void
  className: string
}) {
  const [editing, setEditing] = useState(false)
  if (editing || !value) {
    return (
      <input
        autoFocus={editing}
        defaultValue={value}
        placeholder="Empty"
        onFocus={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            e.currentTarget.value = value
            e.currentTarget.blur()
          }
        }}
        onBlur={(e) => {
          setEditing(false)
          if (e.currentTarget.value !== value) onChange(e.currentTarget.value || null)
        }}
        className={cn(className, 'placeholder:text-dim')}
      />
    )
  }
  const parts: ReactNode[] = []
  let last = 0
  for (const m of value.matchAll(LINK_RE)) {
    parts.push(value.slice(last, m.index))
    const target = m[1]
    parts.push(
      <button
        key={m.index}
        onClick={(e) => {
          e.stopPropagation()
          onOpenWiki(target)
        }}
        className="text-accent-2 underline decoration-accent-2/40 underline-offset-2 hover:decoration-accent-2"
      >
        {m[2] ?? target}
      </button>,
    )
    last = (m.index ?? 0) + m[0].length
  }
  parts.push(value.slice(last))
  return (
    <div onClick={() => setEditing(true)} className="cursor-text break-words rounded-sm px-1.5 py-0.5 text-text">
      {parts}
    </div>
  )
}

function ListEditor({
  tags,
  values,
  suggestions,
  onChange,
  onOpenWiki,
  onTagClick,
}: {
  tags: boolean
  values: string[]
  suggestions: string[]
  onChange: (v: PropValue) => void
  onOpenWiki: (t: string) => void
  onTagClick: (t: string) => void
}) {
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const norm = (s: string) => (tags ? cleanTag(s) : s.trim())
  const q = norm(draft).toLowerCase()
  const options = suggestions.filter((s) => !values.includes(s) && s.toLowerCase().includes(q)).slice(0, 8)
  const add = (raw: string) => {
    const v = norm(raw)
    if (v && !values.includes(v)) onChange([...values, v])
    setDraft('')
    setActive(0)
  }
  return (
    <div className="relative flex flex-wrap items-center gap-1 px-1">
      {values.map((v) => {
        const link = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/.exec(v)
        return (
          <span
            key={v}
            className={cn(
              'inline-flex items-center gap-1 rounded-full py-px pl-2 pr-1 text-[12px]',
              tags ? 'bg-accent/15 text-accent-1' : 'bg-panel-2 text-text/90',
            )}
          >
            <button
              onClick={() => (tags ? onTagClick(v) : link ? onOpenWiki(link[1]) : undefined)}
              className={cn(link && 'text-accent-2 underline decoration-accent-2/40 underline-offset-2')}
            >
              {tags ? `#${v}` : link ? (link[2] ?? link[1]) : v}
            </button>
            <button onClick={() => onChange(values.filter((x) => x !== v))} className="opacity-60 hover:text-danger hover:opacity-100" aria-label={`Remove ${v}`}>
              <X size={11} />
            </button>
          </span>
        )
      })}
      <input
        value={draft}
        placeholder={values.length ? '' : 'Empty'}
        onChange={(e) => {
          setDraft(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120)
          if (draft.trim()) add(draft)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, options.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add(open && options[active] && q ? options[active] : draft)
          } else if (e.key === 'Backspace' && !draft && values.length) {
            onChange(values.slice(0, -1))
          } else if (e.key === 'Escape') setOpen(false)
        }}
        className="min-w-[80px] flex-1 bg-transparent px-0.5 py-0.5 text-text outline-none placeholder:text-dim"
      />
      {open && options.length > 0 && q !== '' && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-56 w-56 overflow-y-auto rounded-panel border border-line-2 bg-panel py-1 shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
          {options.map((o, i) => (
            <button
              key={o}
              onMouseDown={(e) => {
                e.preventDefault()
                add(o)
              }}
              onMouseEnter={() => setActive(i)}
              className={cn('block w-full truncate px-3 py-1 text-left text-[12px]', i === active ? 'bg-accent/20 text-text' : 'text-text/80')}
            >
              {tags ? `#${o}` : o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
