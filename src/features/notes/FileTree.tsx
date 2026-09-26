import { useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { ChevronRight, FileText, Folder, FolderOpen, LayoutDashboard, Table2 } from 'lucide-react'
import type { Note } from '@/data/notes'
import { relTime } from '@/lib/time'
import { cn } from '@/lib/cn'
import { baseName, isWithin, parentOf } from './vault'

export type SortMode = 'name-asc' | 'name-desc' | 'modified-desc' | 'modified-asc' | 'created-desc' | 'created-asc'

export interface ExplorerView {
  sort: SortMode
  layout: 'tree' | 'flat'
  density: 'compact' | 'detailed'
  showTags: boolean
}

export const DEFAULT_VIEW: ExplorerView = { sort: 'name-asc', layout: 'tree', density: 'compact', showTags: false }

export const SORT_LABELS: Record<SortMode, string> = {
  'name-asc': 'File name (A to Z)',
  'name-desc': 'File name (Z to A)',
  'modified-desc': 'Modified time (new to old)',
  'modified-asc': 'Modified time (old to new)',
  'created-desc': 'Created time (new to old)',
  'created-asc': 'Created time (old to new)',
}

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
const time = (iso: string | undefined) => (iso ? new Date(iso).getTime() : 0)

export function sortNotes(notes: Note[], sort: SortMode): Note[] {
  const out = [...notes]
  switch (sort) {
    case 'name-asc':
      return out.sort((a, b) => byName(a.title, b.title))
    case 'name-desc':
      return out.sort((a, b) => byName(b.title, a.title))
    case 'modified-desc':
      return out.sort((a, b) => time(b.updated) - time(a.updated))
    case 'modified-asc':
      return out.sort((a, b) => time(a.updated) - time(b.updated))
    case 'created-desc':
      return out.sort((a, b) => time(b.created) - time(a.created))
    case 'created-asc':
      return out.sort((a, b) => time(a.created) - time(b.created))
  }
}

interface FolderNode {
  path: string
  folders: FolderNode[]
  notes: Note[]
  /** Notes in this folder and all subfolders. */
  total: number
}

function buildTree(notes: Note[], folders: string[], includeEmpty: boolean): FolderNode {
  const root: FolderNode = { path: '', folders: [], notes: [], total: 0 }
  const map = new Map<string, FolderNode>([['', root]])
  const ensure = (path: string): FolderNode => {
    const hit = map.get(path)
    if (hit) return hit
    const node: FolderNode = { path, folders: [], notes: [], total: 0 }
    map.set(path, node)
    ensure(parentOf(path)).folders.push(node)
    return node
  }
  if (includeEmpty) folders.forEach(ensure)
  for (const n of notes) {
    ensure(n.folder).notes.push(n)
    for (let f: string | null = n.folder; f != null; f = f ? parentOf(f) : null) map.get(f)!.total++
  }
  return root
}

export type TreeTarget = { kind: 'note'; id: string } | { kind: 'folder'; path: string }

export const NOTE_MIME = 'application/x-os-note'
const FOLDER_MIME = 'application/x-os-folder'

export interface FileTreeProps {
  notes: Note[]
  folders: string[]
  /** A search or tag filter is active: hide empty folders, expand everything. */
  filtering: boolean
  highlight: string
  activeId: string | null
  focusedFolder: string | null
  view: ExplorerView
  expanded: Set<string>
  renaming: TreeTarget | null
  tagsOf: (n: Note) => string[]
  onToggleFolder: (path: string, open?: boolean) => void
  onOpenNote: (id: string) => void
  onFocusFolder: (path: string | null) => void
  onContextMenu: (e: ReactMouseEvent, target: TreeTarget | null) => void
  onRequestRename: (target: TreeTarget) => void
  onRequestDelete: (target: TreeTarget) => void
  onRenameDone: (value: string | null) => void
  onMoveNote: (id: string, folder: string) => void
  onMoveFolder: (path: string, parent: string) => void
}

export function FileTree(props: FileTreeProps) {
  const { notes, folders, filtering, view } = props
  const tree = useMemo(() => buildTree(notes, folders, !filtering), [notes, folders, filtering])
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const hoverTimer = useRef<number | null>(null)

  useEffect(() => () => void (hoverTimer.current && window.clearTimeout(hoverTimer.current)), [])

  const dragKind = (e: DragEvent) =>
    e.dataTransfer.types.includes(NOTE_MIME) ? 'note' : e.dataTransfer.types.includes(FOLDER_MIME) ? 'folder' : null

  const dnd = {
    over(e: DragEvent, folder: string) {
      if (!dragKind(e)) return
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'
      if (dropTarget !== folder) {
        setDropTarget(folder)
        if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
        // Hovering a closed folder while dragging springs it open.
        if (folder && !props.expanded.has(folder)) {
          hoverTimer.current = window.setTimeout(() => props.onToggleFolder(folder, true), 650)
        }
      }
    },
    drop(e: DragEvent, folder: string) {
      const kind = dragKind(e)
      if (!kind) return
      e.preventDefault()
      e.stopPropagation()
      setDropTarget(null)
      if (kind === 'note') props.onMoveNote(e.dataTransfer.getData(NOTE_MIME), folder)
      else {
        const src = e.dataTransfer.getData(FOLDER_MIME)
        if (src && !isWithin(folder, src) && parentOf(src) !== folder) props.onMoveFolder(src, folder)
      }
    },
    end() {
      setDropTarget(null)
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
    },
  }

  const rowProps = { ...props, dnd, dropTarget }

  return (
    <div
      className={cn('min-h-full pb-10 pt-1 font-read', dropTarget === '' && 'bg-accent/5')}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest('[data-tree-row]')) return
        props.onContextMenu(e, null)
      }}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('[data-tree-row]')) props.onFocusFolder(null)
      }}
      onDragOver={(e) => dnd.over(e, '')}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null)
      }}
      onDrop={(e) => dnd.drop(e, '')}
    >
      {view.layout === 'flat' ? (
        sortNotes(notes, view.sort).map((n) => <NoteRow key={n.id} note={n} showFolder {...rowProps} />)
      ) : (
        <FolderChildren node={tree} {...rowProps} />
      )}
    </div>
  )
}

type RowProps = FileTreeProps & {
  dnd: {
    over: (e: DragEvent, folder: string) => void
    drop: (e: DragEvent, folder: string) => void
    end: () => void
  }
  dropTarget: string | null
}

function FolderChildren({ node, ...p }: RowProps & { node: FolderNode }) {
  const folders = [...node.folders].sort((a, b) =>
    p.view.sort === 'name-desc' ? byName(baseName(b.path), baseName(a.path)) : byName(baseName(a.path), baseName(b.path)),
  )
  return (
    <>
      {folders.map((f) => (
        <FolderRow key={f.path} node={f} {...p} />
      ))}
      {sortNotes(node.notes, p.view.sort).map((n) => (
        <NoteRow key={n.id} note={n} {...p} />
      ))}
    </>
  )
}

function FolderRow({ node, ...p }: RowProps & { node: FolderNode }) {
  const open = p.filtering || p.expanded.has(node.path)
  const renaming = p.renaming?.kind === 'folder' && p.renaming.path === node.path
  const Icon = open ? FolderOpen : Folder
  return (
    <div>
      <div
        data-tree-row
        role="treeitem"
        aria-expanded={open}
        tabIndex={0}
        draggable={!renaming}
        onDragStart={(e) => {
          e.dataTransfer.setData(FOLDER_MIME, node.path)
          e.dataTransfer.effectAllowed = 'move'
        }}
        onDragEnd={p.dnd.end}
        onDragOver={(e) => p.dnd.over(e, node.path)}
        onDrop={(e) => p.dnd.drop(e, node.path)}
        onClick={() => {
          p.onFocusFolder(node.path)
          p.onToggleFolder(node.path)
        }}
        onContextMenu={(e) => p.onContextMenu(e, { kind: 'folder', path: node.path })}
        onKeyDown={(e) => {
          if (e.key === 'F2') p.onRequestRename({ kind: 'folder', path: node.path })
          else if (e.key === 'Delete') p.onRequestDelete({ kind: 'folder', path: node.path })
          else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            p.onToggleFolder(node.path)
          } else if (e.key === 'ArrowRight') p.onToggleFolder(node.path, true)
          else if (e.key === 'ArrowLeft') p.onToggleFolder(node.path, false)
        }}
        className={cn(
          'group mx-1 flex cursor-pointer select-none items-center gap-1 rounded-control py-[3px] pl-1.5 pr-2 text-[13px] text-text/85 outline-none transition-colors hover:bg-panel-2 focus-visible:ring-1 focus-visible:ring-accent/50',
          p.focusedFolder === node.path && 'bg-panel-2/70',
          p.dropTarget === node.path && 'bg-accent/15 ring-1 ring-accent/50',
        )}
      >
        <ChevronRight size={13} className={cn('shrink-0 text-dim transition-transform', open && 'rotate-90')} />
        <Icon size={13} className="shrink-0 text-dim" />
        {renaming ? (
          <RenameInput initial={baseName(node.path)} onDone={p.onRenameDone} />
        ) : (
          <span className="min-w-0 flex-1 truncate">{baseName(node.path)}</span>
        )}
        {!renaming && <span className="shrink-0 text-[10px] text-dim opacity-0 group-hover:opacity-100">{node.total}</span>}
      </div>
      {open && (node.folders.length > 0 || node.notes.length > 0) && (
        <div role="group" className="ml-[17px] border-l border-line/80">
          <FolderChildren node={node} {...p} />
        </div>
      )}
    </div>
  )
}

function NoteRow({ note, showFolder, ...p }: RowProps & { note: Note; showFolder?: boolean }) {
  const active = note.id === p.activeId
  const renaming = p.renaming?.kind === 'note' && p.renaming.id === note.id
  const tags = p.view.showTags || p.view.density === 'detailed' ? p.tagsOf(note) : []
  const KindIcon = note.kind === 'canvas' ? LayoutDashboard : note.kind === 'base' ? Table2 : FileText
  return (
    <div
      data-tree-row
      role="treeitem"
      aria-selected={active}
      tabIndex={0}
      draggable={!renaming}
      onDragStart={(e) => {
        e.dataTransfer.setData(NOTE_MIME, note.id)
        // Dropping into the editor inserts a link, like Obsidian.
        e.dataTransfer.setData('text/plain', `[[${note.title}]]`)
        e.dataTransfer.effectAllowed = 'copyMove'
      }}
      onDragEnd={p.dnd.end}
      onDragOver={(e) => p.dnd.over(e, note.folder)}
      onDrop={(e) => p.dnd.drop(e, note.folder)}
      onClick={() => {
        p.onFocusFolder(note.folder || null)
        p.onOpenNote(note.id)
      }}
      onContextMenu={(e) => p.onContextMenu(e, { kind: 'note', id: note.id })}
      onKeyDown={(e) => {
        if (e.key === 'F2') p.onRequestRename({ kind: 'note', id: note.id })
        else if (e.key === 'Delete') p.onRequestDelete({ kind: 'note', id: note.id })
        else if (e.key === 'Enter') p.onOpenNote(note.id)
      }}
      className={cn(
        'mx-1 flex cursor-pointer select-none gap-1.5 rounded-control py-[3px] pl-2 pr-2 text-[13px] outline-none transition-colors focus-visible:ring-1 focus-visible:ring-accent/50',
        p.view.density === 'detailed' ? 'items-start py-1.5' : 'items-center',
        active ? 'bg-accent/15 text-text' : 'text-text/75 hover:bg-panel-2 hover:text-text',
      )}
    >
      <KindIcon size={12} className={cn('shrink-0', active ? 'text-accent' : 'text-dim/70', p.view.density === 'detailed' && 'mt-[3px]')} />
      <span className="min-w-0 flex-1">
        {renaming ? (
          <RenameInput initial={note.title} onDone={p.onRenameDone} />
        ) : (
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate">
              <Highlight text={note.title} q={p.highlight} />
            </span>
            {showFolder && note.folder && <span className="shrink-0 truncate text-[10px] text-dim">{note.folder}</span>}
            {p.view.density === 'compact' && tags.length > 0 && (
              <span className="ml-auto shrink truncate text-[10px] text-accent/70">{tags.map((t) => `#${t}`).join(' ')}</span>
            )}
          </span>
        )}
        {p.view.density === 'detailed' && !renaming && (
          <span className="mt-0.5 flex items-center gap-2 text-[10px] text-dim">
            <span className="shrink-0">{relTime(new Date(note.updated))}</span>
            <span className="truncate text-accent/70">{tags.map((t) => `#${t}`).join(' ')}</span>
          </span>
        )}
      </span>
    </div>
  )
}

function RenameInput({ initial, onDone }: { initial: string; onDone: (v: string | null) => void }) {
  const done = useRef(false)
  const finish = (v: string | null) => {
    if (done.current) return
    done.current = true
    onDone(v)
  }
  return (
    <input
      autoFocus
      defaultValue={initial}
      onFocus={(e) => e.currentTarget.select()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') finish(e.currentTarget.value)
        else if (e.key === 'Escape') finish(null)
      }}
      onBlur={(e) => finish(e.currentTarget.value)}
      className="w-full min-w-0 rounded-sm border border-accent/60 bg-bg px-1 text-[13px] text-text outline-none"
    />
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
      <mark className="rounded-sm bg-accent/30 text-text">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  )
}
