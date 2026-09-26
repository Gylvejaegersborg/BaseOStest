import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronsDownUp,
  ChevronsUpDown,
  Clipboard,
  Copy,
  CornerUpLeft,
  FilePlus,
  FileText,
  FolderInput,
  FolderPlus,
  Hash,
  LayoutDashboard,
  Link2,
  LocateFixed,
  MoreHorizontal,
  Pencil,
  Plus,
  ScanSearch,
  Sparkles,
  Search,
  SlidersHorizontal,
  Table2,
  Trash2,
  X,
} from 'lucide-react'
import type { Note } from '@/data/notes'
import {
  createFolder,
  createNote,
  deleteFolder,
  deleteNote,
  duplicateFolder,
  duplicateNote,
  loadJSON,
  moveFolder,
  moveNote,
  renameNote,
  renameProperty,
  saveJSON,
  setPropType,
  setProperty,
  setTags,
  updateBody,
  useVault,
} from '@/features/notes/notesStore'
import { splitFrontmatter, withProps, type PropValue } from '@/features/notes/frontmatter'
import { PropertiesPanel } from '@/features/notes/PropertiesPanel'
import { Omnisearch } from '@/features/notes/Omnisearch'
import type { NoteEditorApi } from '@/features/notes/editor/NoteEditor'
import type { PageCommand } from '@/features/notes/editor/slashCommands'
import { useGlobalProps, useGlobalTags, useLinkGraph } from '@/features/connections/connections'
import { createProject, patchProject, setProjectProp, setStatus as setProjectStatus, useProjects } from '@/features/projects/store'
import { STATUS_META, type ProjectStatus } from '@/data/projects'
import {
  baseName,
  backlinks,
  cleanTag,
  hasTag,
  inlineTags,
  isEmptyQuery,
  isWithin,
  joinPath,
  matchesQuery,
  normFolder,
  notePath,
  noteTags,
  parentOf,
  parseQuery,
  parseWikiTarget,
  resolveNote,
} from '@/features/notes/vault'
import {
  DEFAULT_VIEW,
  FileTree,
  SORT_LABELS,
  type ExplorerView,
  type SortMode,
  type TreeTarget,
} from '@/features/notes/FileTree'
import { ContextMenu, type MenuItem, type MenuState } from '@/features/notes/ContextMenu'
import { TagBar } from '@/features/notes/TagBar'
import { useResizablePanel } from '@/components/ui/useResizablePanel'
import { ResizeHandle } from '@/components/ui/ResizeHandle'
import { cn } from '@/lib/cn'

// CodeMirror is sizeable — load it only when the Notes page opens.
const NoteEditor = lazy(() => import('@/features/notes/editor/NoteEditor'))
const CanvasView = lazy(() => import('@/features/notes/canvas/CanvasView').then((m) => ({ default: m.CanvasView })))
const BaseView = lazy(() => import('@/features/notes/bases/BaseView').then((m) => ({ default: m.BaseView })))

const UI = {
  view: 'os:notes:view',
  expanded: 'os:notes:expanded',
  last: 'os:notes:last',
  width: 'os:notes:sidebar-width',
}

const copy = (text: string) => void navigator.clipboard?.writeText(text).catch(() => {})

export function Notes() {
  const { notes, folders } = useVault()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const pageRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const editorApi = useRef<NoteEditorApi | null>(null)
  const noteScroll = useRef<HTMLDivElement>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [addPropNonce, setAddPropNonce] = useState(0)

  // ---- explorer state ------------------------------------------------------
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [tagsOpen, setTagsOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [view, setViewState] = useState<ExplorerView>(() => ({ ...DEFAULT_VIEW, ...loadJSON(UI.view, {}) }))
  const [expanded, setExpandedState] = useState<Set<string>>(() => new Set(loadJSON<string[]>(UI.expanded, [])))
  const [focusedFolder, setFocusedFolder] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<TreeTarget | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  // A deep link (?note=…, e.g. from a project) opens straight to the note on phones.
  const [mobileView, setMobileView] = useState<'list' | 'note'>(() => (new URLSearchParams(window.location.search).get('note') ? 'note' : 'list'))
  const sidebar = useResizablePanel({ defaultWidth: 290, min: 210, max: 520, edge: 'right', storageKey: UI.width })

  const setView = (patch: Partial<ExplorerView>) =>
    setViewState((v) => {
      const next = { ...v, ...patch }
      saveJSON(UI.view, next)
      return next
    })
  const setExpanded = (fn: (s: Set<string>) => Set<string>) =>
    setExpandedState((s) => {
      const next = fn(new Set(s))
      saveJSON(UI.expanded, [...next])
      return next
    })
  const toggleFolder = (path: string, open?: boolean) =>
    setExpanded((s) => {
      if (open ?? !s.has(path)) s.add(path)
      else s.delete(path)
      return s
    })
  const reveal = (folder: string) =>
    setExpanded((s) => {
      for (let f = folder; f; f = parentOf(f)) s.add(f)
      return s
    })

  // ---- navigation (with back/forward history) ------------------------------
  const [hist, setHist] = useState<{ stack: string[]; index: number }>(() => {
    const wanted = searchParams.get('note') ?? loadJSON<string | null>(UI.last, null)
    const first = notes.find((n) => n.id === wanted) ?? notes.find((n) => n.id === 'vault-welcome') ?? notes[0]
    return { stack: first ? [first.id] : [], index: 0 }
  })
  const selected = notes.find((n) => n.id === hist.stack[hist.index]) ?? null
  const [jump, setJump] = useState<{ heading?: string; text?: string; nonce: number } | null>(null)
  const [freshId, setFreshId] = useState<string | null>(null)

  useEffect(() => {
    if (selected) {
      saveJSON(UI.last, selected.id)
      reveal(selected.folder)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id])

  const openNote = useCallback((id: string, opts?: { heading?: string | null; text?: string | null }) => {
    setHist((h) => (h.stack[h.index] === id ? h : { stack: [...h.stack.slice(0, h.index + 1), id], index: h.index + 1 }))
    setMobileView('note')
    setJump(
      opts?.heading || opts?.text ? { heading: opts.heading ?? undefined, text: opts.text ?? undefined, nonce: Date.now() } : null,
    )
  }, [])

  // Scroll a newly opened note back to the top.
  useEffect(() => {
    noteScroll.current?.scrollTo({ top: 0 })
  }, [selected?.id])


  // Ctrl/Cmd+Shift+F: search inside every note.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        e.stopPropagation()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
  const canBack = hist.index > 0
  const canForward = hist.index < hist.stack.length - 1
  const goBack = () => setHist((h) => ({ ...h, index: Math.max(0, h.index - 1) }))
  const goForward = () => setHist((h) => ({ ...h, index: Math.min(h.stack.length - 1, h.index + 1) }))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key === 'ArrowLeft') setHist((h) => ({ ...h, index: Math.max(0, h.index - 1) }))
      else if (e.key === 'ArrowRight') setHist((h) => ({ ...h, index: Math.min(h.stack.length - 1, h.index + 1) }))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The history may point at a deleted note — fall back to something real.
  useEffect(() => {
    if (!selected && notes.length) setHist({ stack: [notes[0].id], index: 0 })
  }, [selected, notes])

  // ---- derived -------------------------------------------------------------
  const tagMap = useMemo(() => new Map(notes.map((n) => [n.id, noteTags(n)])), [notes])
  const tagsOf = useCallback((n: Note) => tagMap.get(n.id) ?? n.tags, [tagMap])
  const vaultTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const tags of tagMap.values()) for (const t of tags) counts.set(t, (counts.get(t) ?? 0) + 1)
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [tagMap])

  const parsed = useMemo(() => parseQuery(query), [query])
  const filtering = !isEmptyQuery(parsed) || tagFilter.length > 0
  const filtered = useMemo(
    () =>
      filtering
        ? notes.filter((n) => matchesQuery(n, parsed, tagsOf(n)) && tagFilter.every((t) => hasTag(tagsOf(n), t)))
        : notes,
    [notes, parsed, tagFilter, filtering, tagsOf],
  )

  const links = useMemo(() => (selected ? backlinks(notes, selected) : []), [notes, selected])
  const fm = useMemo(() => splitFrontmatter(selected?.body ?? ''), [selected?.body])
  const words = useMemo(() => fm.content.match(/\S+/g)?.length ?? 0, [fm.content])

  // Property types/values and tags are shared with projects (connections).
  const { propTypes, suggestions } = useGlobalProps()
  const { all: globalTags } = useGlobalTags()
  /** Tag suggestions: the vault's tags plus tags only projects use. */
  const tagPool = useMemo<[string, number][]>(() => {
    const seen = new Set(vaultTags.map(([t]) => t))
    return [...vaultTags, ...globalTags.filter((g) => !seen.has(g.tag)).map((g) => [g.tag, g.projects.length] as [string, number])]
  }, [vaultTags, globalTags])

  // Projects as note-shaped rows so a base can list them (source: projects).
  const projects = useProjects()
  const projectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects])
  const projectNames = useMemo(() => projects.map((p) => ({ id: p.id, name: p.name })), [projects])
  const graph = useLinkGraph()
  const projectBacklinks = useMemo(() => (selected ? graph.projectsLinkingTo(selected.id) : []), [graph, selected])
  const projectRows = useMemo<Note[]>(
    () =>
      projects.map((p) => ({
        id: p.id,
        title: p.name,
        folder: 'Projects',
        tags: p.tags,
        updated: p.updatedAt,
        created: p.createdAt,
        body: p.what,
        kind: 'markdown',
        props: { status: p.status, section: p.sectionId, tagline: p.tagline, ...p.props },
      })),
    [projects],
  )
  const setRowProp = (row: Note, key: string, value: PropValue | undefined) => {
    const project = projects.find((p) => p.id === row.id)
    if (!project) return setProperty(row, key, value)
    if (key === 'status' && typeof value === 'string' && value in STATUS_META)
      return setProjectStatus(project, value as ProjectStatus, Object.fromEntries(Object.entries(STATUS_META).map(([k, m]) => [k, m.label])) as Record<ProjectStatus, string>)
    if (key === 'tagline') return patchProject(project.id, { tagline: value == null ? '' : String(value) })
    if (key === 'section') return
    setProjectProp(project.id, key, value)
  }

  // ---- actions -------------------------------------------------------------
  const newNote = (folder = focusedFolder ?? '', kind: Note['kind'] = 'markdown', body?: string) => {
    const id = createNote(notes, { folder, kind, body })
    reveal(folder)
    setFreshId(id)
    openNote(id)
    return id
  }

  /** Slash commands that reach outside the editor. */
  const runCommand = (cmd: PageCommand): string | void => {
    const folder = selected?.folder ?? ''
    switch (cmd) {
      case 'new-note':
        newNote(folder)
        return
      case 'new-canvas':
        newNote(folder, 'canvas')
        return
      case 'new-base':
        newNote(folder, 'base')
        return
      case 'add-property':
        setAddPropNonce((n) => n + 1)
        return
      case 'link-new-note': {
        const id = createNote(notes, { folder })
        reveal(folder)
        return notes.find((n) => n.id === id)?.title ?? 'Untitled'
      }
    }
  }

  const newFolder = (parent = focusedFolder ?? '') => {
    const path = createFolder(folders, parent)
    reveal(parent)
    setFocusedFolder(path)
    setRenaming({ kind: 'folder', path })
  }

  const filterByTag = (t: string) => {
    setTagFilter([cleanTag(t)])
    setTagsOpen(true)
    setMobileView('list')
  }

  const removeNote = (id: string) => {
    const note = notes.find((n) => n.id === id)
    if (!note || !window.confirm(`Delete "${note.title}"? This cannot be undone.`)) return
    deleteNote(id)
    if (selected?.id === id) {
      const next = notes.find((n) => n.id !== id && n.folder === note.folder) ?? notes.find((n) => n.id !== id)
      if (next) openNote(next.id)
      setMobileView('list')
    }
  }

  const removeFolder = (path: string) => {
    const inside = notes.filter((n) => isWithin(n.folder, path)).length
    const msg = inside
      ? `Delete the folder "${path}" and the ${inside} note${inside === 1 ? '' : 's'} in it? This cannot be undone.`
      : `Delete the folder "${path}"?`
    if (!window.confirm(msg)) return
    deleteFolder(notes, path)
    if (focusedFolder && isWithin(focusedFolder, path)) setFocusedFolder(null)
  }

  const remapExpanded = (from: string, to: string) =>
    setExpanded((s) => new Set([...s].map((f) => (isWithin(f, from) ? to + f.slice(from.length) : f))))

  const relocateFolder = (path: string, dest: string) => {
    const moved = moveFolder(notes, path, dest)
    if (!moved) return
    remapExpanded(path, moved)
    reveal(parentOf(moved))
    if (focusedFolder && isWithin(focusedFolder, path)) setFocusedFolder(moved + focusedFolder.slice(path.length))
  }

  const finishRename = (value: string | null) => {
    const target = renaming
    setRenaming(null)
    if (!target || value == null) return
    if (target.kind === 'note') renameNote(notes, target.id, value)
    else {
      const name = value.replace(/\//g, '-').trim()
      if (name && name !== baseName(target.path)) relocateFolder(target.path, joinPath(parentOf(target.path), name))
    }
  }

  const commitTitle = (value: string) => {
    if (!selected) return
    const final = renameNote(notes, selected.id, value)
    if (titleRef.current && titleRef.current.value !== final) titleRef.current.value = final
  }

  const openWiki = (raw: string) => {
    const { note, heading } = parseWikiTarget(raw)
    if (!note) {
      if (heading) setJump({ heading, nonce: Date.now() })
      return
    }
    const hit = resolveNote(notes, note, selected)
    if (hit) return openNote(hit.id, { heading })
    // Notes and projects link to each other: a project name opens it.
    const project = projects.find((p) => p.name.toLowerCase() === note.trim().toLowerCase())
    if (project) return navigate(`/projects?project=${encodeURIComponent(project.id)}`)
    // Unresolved link → create the note, like Obsidian.
    const path = normFolder(note)
    const folder = path.includes('/') ? parentOf(path) : selected?.folder ?? ''
    const id = createNote(notes, { folder, title: baseName(path) })
    reveal(folder)
    openNote(id)
  }

  const autotag = () => {
    if (!selected) return
    const words = new Set(selected.body.toLowerCase().match(/[\p{L}\p{N}_\-/]+/gu) ?? [])
    const found = vaultTags.map(([t]) => t).filter((t) => words.has(t) || words.has(baseName(t)))
    setTags(selected, [...new Set([...selected.tags, ...found.filter((t) => !inlineTags(selected.body).includes(t))])])
  }

  // ---- menus ---------------------------------------------------------------
  const folderTargets = (current: string, onPick: (folder: string) => void, exclude?: string): MenuItem[] => [
    { label: 'Vault root', checked: current === '', disabled: current === '', onSelect: () => onPick('') },
    ...[...folders]
      .filter((f) => !exclude || !isWithin(f, exclude))
      .sort((a, b) => a.localeCompare(b))
      .map((f) => ({ label: f, checked: f === current, disabled: f === current, onSelect: () => onPick(f) })),
  ]

  const noteMenu = (note: Note, fromHeader = false): MenuItem[] => {
    const tags = tagsOf(note)
    return [
      { kind: 'header', label: notePath(note), mono: true },
      ...(!fromHeader ? [{ label: 'Open', icon: <FileText size={13} />, onSelect: () => openNote(note.id) }] : []),
      { kind: 'separator' },
      {
        label: 'Rename',
        icon: <Pencil size={13} />,
        hint: fromHeader ? undefined : 'F2',
        onSelect: () =>
          fromHeader ? titleRef.current?.select() : (reveal(note.folder), setRenaming({ kind: 'note', id: note.id })),
      },
      {
        label: 'Duplicate',
        icon: <Copy size={13} />,
        onSelect: () => {
          const id = duplicateNote(notes, note.id)
          if (id) openNote(id)
        },
      },
      {
        label: 'Move to',
        icon: <FolderInput size={13} />,
        submenu: folderTargets(note.folder, (f) => {
          moveNote(notes, note.id, f)
          reveal(f)
        }),
      },
      { kind: 'separator' },
      { label: 'Copy link', icon: <Link2 size={13} />, onSelect: () => copy(`[[${note.title}]]`) },
      { label: 'Copy path', icon: <Clipboard size={13} />, onSelect: () => copy(notePath(note)) },
      {
        label: 'Reveal in explorer',
        icon: <LocateFixed size={13} />,
        onSelect: () => {
          setQuery('')
          setTagFilter([])
          reveal(note.folder)
          setMobileView('list')
          window.setTimeout(() => {
            pageRef.current?.querySelector('[role="treeitem"][aria-selected="true"]')?.scrollIntoView({ block: 'center' })
          }, 50)
        },
      },
      {
        label: 'View tags',
        icon: <Hash size={13} />,
        submenu: tags.length
          ? tags.map((t) => ({ label: `#${t}`, onSelect: () => filterByTag(t) }))
          : [{ label: 'No tags', disabled: true }],
      },
      { kind: 'separator' },
      { label: 'Delete', icon: <Trash2 size={13} />, danger: true, hint: fromHeader ? undefined : 'Del', onSelect: () => removeNote(note.id) },
    ]
  }

  const setAllFolders = (open: boolean, within?: string) =>
    setExpanded((s) => {
      for (const f of folders) if (!within || isWithin(f, within)) open ? s.add(f) : s.delete(f)
      return s
    })

  const folderMenu = (path: string): MenuItem[] => [
    { kind: 'header', label: `${path}/`, mono: true },
    { label: 'New note', icon: <FilePlus size={13} />, onSelect: () => newNote(path) },
    { label: 'New canvas', icon: <LayoutDashboard size={13} />, onSelect: () => newNote(path, 'canvas') },
    { label: 'New base', icon: <Table2 size={13} />, onSelect: () => newNote(path, 'base') },
    { label: 'New folder', icon: <FolderPlus size={13} />, onSelect: () => newFolder(path) },
    { kind: 'separator' },
    { label: 'Rename', icon: <Pencil size={13} />, hint: 'F2', onSelect: () => setRenaming({ kind: 'folder', path }) },
    {
      label: 'Duplicate',
      icon: <Copy size={13} />,
      onSelect: () => {
        const dest = duplicateFolder(notes, folders, path)
        reveal(dest)
      },
    },
    { label: 'Move to', icon: <FolderInput size={13} />, submenu: folderTargets(parentOf(path), (f) => relocateFolder(path, joinPath(f, baseName(path))), path) },
    { kind: 'separator' },
    { label: 'Copy path', icon: <Clipboard size={13} />, onSelect: () => copy(path) },
    { label: 'Expand all inside', icon: <ChevronsUpDown size={13} />, onSelect: () => (toggleFolder(path, true), setAllFolders(true, path)) },
    { label: 'Collapse all inside', icon: <ChevronsDownUp size={13} />, onSelect: () => setAllFolders(false, path) },
    { kind: 'separator' },
    { label: 'Delete', icon: <Trash2 size={13} />, danger: true, hint: 'Del', onSelect: () => removeFolder(path) },
  ]

  const sortItems = (): MenuItem[] =>
    (Object.keys(SORT_LABELS) as SortMode[]).map((s) => ({ label: SORT_LABELS[s], checked: view.sort === s, onSelect: () => setView({ sort: s }) }))

  const blankMenu = (): MenuItem[] => [
    { label: 'New note', icon: <FilePlus size={13} />, onSelect: () => newNote('') },
    { label: 'New canvas', icon: <LayoutDashboard size={13} />, onSelect: () => newNote('', 'canvas') },
    { label: 'New base', icon: <Table2 size={13} />, onSelect: () => newNote('', 'base') },
    { label: 'New folder', icon: <FolderPlus size={13} />, onSelect: () => newFolder('') },
    { kind: 'separator' },
    { label: 'Sort by', submenu: sortItems() },
    {
      label: 'Layout',
      submenu: [
        { label: 'Folder tree', checked: view.layout === 'tree', onSelect: () => setView({ layout: 'tree' }) },
        { label: 'Flat list', checked: view.layout === 'flat', onSelect: () => setView({ layout: 'flat' }) },
      ],
    },
    { kind: 'separator' },
    { label: 'Expand all', icon: <ChevronsUpDown size={13} />, onSelect: () => setAllFolders(true) },
    { label: 'Collapse all', icon: <ChevronsDownUp size={13} />, onSelect: () => setAllFolders(false) },
  ]

  const openMenu = (e: ReactMouseEvent, target: TreeTarget | null) => {
    e.preventDefault()
    e.stopPropagation()
    if (!target) return setMenu({ x: e.clientX, y: e.clientY, items: blankMenu() })
    if (target.kind === 'folder') return setMenu({ x: e.clientX, y: e.clientY, items: folderMenu(target.path) })
    const note = notes.find((n) => n.id === target.id)
    if (note) setMenu({ x: e.clientX, y: e.clientY, items: noteMenu(note) })
  }

  const requestDelete = (t: TreeTarget) => (t.kind === 'note' ? removeNote(t.id) : removeFolder(t.path))

  // Focus + select the title of a freshly created note, like Obsidian.
  useEffect(() => {
    if (freshId && selected?.id === freshId) {
      titleRef.current?.focus()
      titleRef.current?.select()
    }
  }, [freshId, selected?.id])

  // ---- render --------------------------------------------------------------
  return (
    <div ref={pageRef} className="relative flex h-full overflow-hidden">
      {/* Warm atmosphere wash (Phase 5, page-specific patterns) — Notes is the
          system's warmest context tint, distinct from Workbench/Ops' cool-alert
          register; a wash behind the content, not a full repaint. */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(circle at 12% -10%, rgba(240,160,32,0.07), transparent 45%), radial-gradient(circle at 90% 105%, rgba(224,180,120,0.05), transparent 50%)',
        }}
      />

      {/* Explorer */}
      <aside
        style={{ '--sb': `${sidebar.width}px` } as React.CSSProperties}
        className={cn(
          'relative z-10 w-full shrink-0 flex-col bg-panel/40 lg:flex lg:w-[var(--sb)]',
          mobileView === 'note' ? 'hidden' : 'flex',
        )}
      >
        <div className="relative border-b border-line p-2">
          <div className="flex items-center gap-1">
            <div className="relative flex min-w-0 flex-1 items-center">
              <Search size={13} className="pointer-events-none absolute left-2 text-dim" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
                placeholder="Search…"
                title={`Search ${notes.length} notes — supports tag:, path:, file: and "quoted phrases"`}
                className="h-7 w-full rounded-control border border-line bg-bg/60 pl-7 pr-6 font-read text-[12px] text-text placeholder:text-dim focus:border-accent/60 focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-1.5 text-dim hover:text-text" aria-label="Clear search">
                  <X size={12} />
                </button>
              )}
            </div>
            <ToolButton
              title="Tags"
              active={tagsOpen || tagFilter.length > 0}
              onClick={() => {
                setTagsOpen((o) => !o)
                setViewOpen(false)
              }}
            >
              <Hash size={14} />
              {tagFilter.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-accent px-0.5 text-[9px] text-bg">
                  {tagFilter.length}
                </span>
              )}
            </ToolButton>
            <ToolButton
              title="Sort and view options"
              active={viewOpen}
              onClick={() => {
                setViewOpen((o) => !o)
                setTagsOpen(false)
              }}
            >
              <SlidersHorizontal size={14} />
            </ToolButton>
            <ToolButton title="Search inside all notes (Ctrl/Cmd+Shift+F)" onClick={() => setSearchOpen(true)}>
              <ScanSearch size={14} />
            </ToolButton>
            <ToolButton title="New folder" onClick={() => newFolder()}>
              <FolderPlus size={14} />
            </ToolButton>
            <ToolButton
              title="New note (right-click for canvas or base)"
              onClick={() => newNote()}
              onContextMenu={(e) => {
                e.preventDefault()
                setMenu({
                  x: e.clientX,
                  y: e.clientY,
                  items: [
                    { label: 'New note', icon: <FilePlus size={13} />, onSelect: () => newNote() },
                    { label: 'New canvas', icon: <LayoutDashboard size={13} />, onSelect: () => newNote(undefined, 'canvas') },
                    { label: 'New base', icon: <Table2 size={13} />, onSelect: () => newNote(undefined, 'base') },
                  ],
                })
              }}
              accent
            >
              <Plus size={15} />
            </ToolButton>
          </div>

          {tagsOpen && (
            <div className="mt-2 max-h-48 overflow-y-auto">
              <div className="mb-1 flex items-center justify-between font-read text-[11px] text-dim">
                <span>{vaultTags.length} tags · click to filter</span>
                {tagFilter.length > 0 && (
                  <button onClick={() => setTagFilter([])} className="hover:text-accent">
                    clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {vaultTags.map(([t, count]) => {
                  const on = tagFilter.includes(t)
                  return (
                    <button
                      key={t}
                      onClick={() => setTagFilter((f) => (on ? f.filter((x) => x !== t) : [...f, t]))}
                      className={cn(
                        'rounded-full px-2 py-0.5 font-read text-[11px] transition-colors',
                        on ? 'bg-accent/30 text-text' : 'bg-panel-2 text-text/70 hover:text-text',
                      )}
                    >
                      #{t} <span className="text-dim">{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {!tagsOpen && tagFilter.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tagFilter.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-accent/20 py-0.5 pl-2 pr-1 font-read text-[11px] text-text">
                  #{t}
                  <button onClick={() => setTagFilter((f) => f.filter((x) => x !== t))} aria-label={`Remove filter ${t}`}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {viewOpen && (
            <ViewOptions
              view={view}
              onChange={setView}
              onExpandAll={() => setAllFolders(true)}
              onCollapseAll={() => setAllFolders(false)}
              onClose={() => setViewOpen(false)}
            />
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <FileTree
            notes={filtered}
            folders={folders}
            filtering={filtering}
            highlight={parsed.terms[0] ?? parsed.files[0] ?? ''}
            activeId={selected?.id ?? null}
            focusedFolder={focusedFolder}
            view={view}
            expanded={expanded}
            renaming={renaming}
            tagsOf={tagsOf}
            onToggleFolder={toggleFolder}
            onOpenNote={(id) => openNote(id)}
            onFocusFolder={setFocusedFolder}
            onContextMenu={openMenu}
            onRequestRename={setRenaming}
            onRequestDelete={requestDelete}
            onRenameDone={finishRename}
            onMoveNote={(id, folder) => {
              moveNote(notes, id, folder)
              reveal(folder)
            }}
            onMoveFolder={(path, parent) => relocateFolder(path, joinPath(parent, baseName(path)))}
          />
          {filtering && !filtered.length && <div className="p-4 font-read text-xs text-dim">No notes match.</div>}
        </div>
      </aside>
      <ResizeHandle onMouseDown={sidebar.onMouseDown} className="relative z-10 hidden border-r border-line lg:block" />

      {/* Note */}
      <section className={cn('relative z-10 min-w-0 flex-1 flex-col lg:flex', mobileView === 'list' ? 'hidden' : 'flex')}>
        {!selected ? (
          <EmptyState onCreate={() => newNote('')} />
        ) : (
          <>
            <div className="flex items-center gap-1 border-b border-line px-2 py-1.5">
              <button
                onClick={() => setMobileView('list')}
                className="rounded-control p-1 text-dim hover:text-text lg:hidden"
                aria-label="Back to list"
              >
                <ChevronLeft size={16} />
              </button>
              <ToolButton title="Back (Alt+←)" onClick={goBack} disabled={!canBack}>
                <ArrowLeft size={14} />
              </ToolButton>
              <ToolButton title="Forward (Alt+→)" onClick={goForward} disabled={!canForward}>
                <ArrowRight size={14} />
              </ToolButton>
              <input
                key={`${selected.id}:${selected.title}`}
                ref={titleRef}
                defaultValue={selected.title}
                spellCheck={false}
                aria-label="Note title"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'ArrowDown') {
                    e.preventDefault()
                    commitTitle(e.currentTarget.value)
                    setFreshId(null)
                    pageRef.current?.querySelector<HTMLElement>('.cm-content')?.focus()
                  } else if (e.key === 'Escape') {
                    e.currentTarget.value = selected.title
                    e.currentTarget.blur()
                  }
                }}
                onBlur={(e) => {
                  commitTitle(e.currentTarget.value)
                  setFreshId(null)
                }}
                className="min-w-0 flex-1 rounded-control border border-transparent bg-transparent px-2 py-0.5 font-read text-[15px] font-semibold text-text outline-none transition-colors hover:border-line focus:border-accent/50 focus:bg-bg/40"
              />
              <ToolButton
                title="More options"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect()
                  setMenu({ x: r.right - 200, y: r.bottom + 4, items: noteMenu(selected, true) })
                }}
              >
                <MoreHorizontal size={15} />
              </ToolButton>
            </div>

            {selected.kind === 'canvas' ? (
              <div className="min-h-0 flex-1">
                <Suspense fallback={<div className="h-full" />}>
                  <CanvasView note={selected} notes={notes} onChange={(body) => updateBody(selected.id, body)} onOpenNote={(id) => openNote(id)} />
                </Suspense>
              </div>
            ) : selected.kind === 'base' ? (
              <div className="min-h-0 flex-1">
                <Suspense fallback={<div className="h-full" />}>
                  <BaseView
                    base={selected}
                    notes={notes}
                    propTypes={propTypes}
                    suggestions={suggestions}
                    onChange={(body) => updateBody(selected.id, body)}
                    projectRows={projectRows}
                    onOpenNote={(id) => (projectIds.has(id) ? navigate(`/projects?project=${encodeURIComponent(id)}`) : openNote(id))}
                    onCreateNote={(folder, props: Record<string, PropValue>, source) => {
                      if (source === 'projects') {
                        const { status, ...rest } = props
                        const id = createProject({ status: typeof status === 'string' && status in STATUS_META ? (status as ProjectStatus) : undefined })
                        for (const [k, v] of Object.entries(rest)) setProjectProp(id, k, v)
                        navigate(`/projects?project=${encodeURIComponent(id)}`)
                      } else newNote(folder, 'markdown', withProps('', props))
                    }}
                    onSetProp={setRowProp}
                    onOpenWiki={openWiki}
                    onTagClick={filterByTag}
                  />
                </Suspense>
              </div>
            ) : (
              <>
                <div
                  ref={noteScroll}
                  className="group/note min-h-0 flex-1 cursor-text overflow-y-auto overflow-x-hidden"
                  onMouseDown={(e) => {
                    // Clicking the empty space below the text puts the cursor at the end.
                    const t = e.target as HTMLElement
                    if (t === e.currentTarget || t.dataset.noteColumn != null) {
                      e.preventDefault()
                      editorApi.current?.focusEnd()
                    }
                  }}
                >
                  <div data-note-column className="mx-auto w-full max-w-[47rem] px-4 pb-[40vh] pt-7 sm:px-8">
                    <PropertiesPanel
                      note={selected}
                      propTypes={propTypes}
                      suggestions={suggestions}
                      vaultTags={tagPool}
                      addNonce={addPropNonce}
                      onSet={(key, value) => setProperty(selected, key, value)}
                      onRename={(from, to) => renameProperty(selected, from, to)}
                      onSetType={setPropType}
                      onOpenWiki={openWiki}
                      onTagClick={filterByTag}
                    />
                    <div className="-ml-5">
                      <Suspense fallback={<div className="h-40" />}>
                        <NoteEditor
                          noteId={selected.id}
                          value={fm.content}
                          notes={notes}
                          projects={projectNames}
                          onChange={(content) => updateBody(selected.id, splitFrontmatter(selected.body).block + content)}
                          onOpenWiki={openWiki}
                          onOpenTag={filterByTag}
                          jump={jump}
                          focusOnOpen={false}
                          onCommand={runCommand}
                          apiRef={editorApi}
                        />
                      </Suspense>
                    </div>
                  </div>
                </div>

                <TagBar
                  tags={selected.tags}
                  inlineTags={inlineTags(selected.body)}
                  vaultTags={tagPool}
                  onAdd={(t) => setTags(selected, [...selected.tags, t])}
                  onRemove={(t) => setTags(selected, selected.tags.filter((x) => x !== t))}
                  onAutotag={autotag}
                  onTagClick={filterByTag}
                  right={
                    <FooterStats
                      words={words}
                      chars={fm.content.length}
                      links={links}
                      projectLinks={projectBacklinks}
                      onOpen={(id) => openNote(id)}
                      onOpenProject={(id) => navigate(`/projects?project=${encodeURIComponent(id)}`)}
                    />
                  }
                />
              </>
            )}
          </>
        )}
      </section>

      <ContextMenu menu={menu} onClose={() => setMenu(null)} />
      {searchOpen && (
        <Omnisearch notes={notes} onClose={() => setSearchOpen(false)} onOpen={(id, match) => openNote(id, { text: match })} />
      )}
    </div>
  )
}

function ToolButton({
  children,
  title,
  onClick,
  active,
  accent,
  disabled,
  onContextMenu,
}: {
  children: React.ReactNode
  title: string
  onClick: (e: ReactMouseEvent<HTMLButtonElement>) => void
  onContextMenu?: (e: ReactMouseEvent<HTMLButtonElement>) => void
  active?: boolean
  accent?: boolean
  disabled?: boolean
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      onContextMenu={onContextMenu}
      disabled={disabled}
      className={cn(
        'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-control transition-colors disabled:opacity-30 disabled:hover:bg-transparent',
        accent
          ? 'bg-accent/15 text-accent hover:bg-accent/25'
          : active
            ? 'bg-panel-2 text-accent'
            : 'text-dim hover:bg-panel-2 hover:text-text',
      )}
    >
      {children}
    </button>
  )
}

function ViewOptions({
  view,
  onChange,
  onExpandAll,
  onCollapseAll,
  onClose,
}: {
  view: ExplorerView
  onChange: (patch: Partial<ExplorerView>) => void
  onExpandAll: () => void
  onCollapseAll: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!ref.current?.contains(t) && !t.closest('[title="Sort and view options"]')) onClose()
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [onClose])

  const Seg = <T extends string>({ value, options, set }: { value: T; options: [T, string][]; set: (v: T) => void }) => (
    <div className="flex rounded-control border border-line p-0.5">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => set(v)}
          className={cn('flex-1 rounded-sm px-2 py-0.5 text-[11px]', value === v ? 'bg-accent/20 text-text' : 'text-dim hover:text-text')}
        >
          {label}
        </button>
      ))}
    </div>
  )

  return (
    <div
      ref={ref}
      className="absolute left-2 right-2 top-full z-30 mt-1 space-y-2.5 rounded-panel border border-line-2 bg-panel p-3 font-read text-[12px] shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
    >
      <div>
        <div className="mb-1 text-[11px] text-dim">Sort by</div>
        <select
          value={view.sort}
          onChange={(e) => onChange({ sort: e.target.value as SortMode })}
          className="w-full rounded-control border border-line bg-bg px-2 py-1 text-[12px] text-text focus:border-accent/60 focus:outline-none"
        >
          {(Object.keys(SORT_LABELS) as SortMode[]).map((s) => (
            <option key={s} value={s}>
              {SORT_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <div className="mb-1 text-[11px] text-dim">Layout</div>
        <Seg value={view.layout} options={[['tree', 'Folders'], ['flat', 'Flat list']]} set={(layout) => onChange({ layout })} />
      </div>
      <div>
        <div className="mb-1 text-[11px] text-dim">Density</div>
        <Seg value={view.density} options={[['compact', 'Compact'], ['detailed', 'Detailed']]} set={(density) => onChange({ density })} />
      </div>
      <label className="flex cursor-pointer items-center justify-between text-text/85">
        Show tags in list
        <input
          type="checkbox"
          checked={view.showTags}
          onChange={(e) => onChange({ showTags: e.target.checked })}
          className="accent-[#c77591]"
        />
      </label>
      <div className="flex gap-1.5 pt-0.5">
        <button onClick={onExpandAll} className="flex flex-1 items-center justify-center gap-1 rounded-control border border-line py-1 text-[11px] text-dim hover:text-text">
          <ChevronsUpDown size={12} /> Expand all
        </button>
        <button onClick={onCollapseAll} className="flex flex-1 items-center justify-center gap-1 rounded-control border border-line py-1 text-[11px] text-dim hover:text-text">
          <ChevronsDownUp size={12} /> Collapse all
        </button>
      </div>
    </div>
  )
}

function FooterStats({
  words,
  chars,
  links,
  projectLinks,
  onOpen,
  onOpenProject,
}: {
  words: number
  chars: number
  links: Note[]
  projectLinks: { id: string; name: string }[]
  onOpen: (id: string) => void
  onOpenProject: (id: string) => void
}) {
  const total = links.length + projectLinks.length
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={ref} className="relative ml-1 flex items-center gap-3 text-[11px] text-dim">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={!total}
        title="Notes and projects that link here"
        className="flex items-center gap-1 rounded-control px-1.5 py-0.5 hover:bg-panel-2 hover:text-text disabled:hover:bg-transparent disabled:hover:text-dim"
      >
        <CornerUpLeft size={11} /> {total} backlink{total === 1 ? '' : 's'}
      </button>
      <span className="hidden sm:inline">
        {words} words · {chars} chars
      </span>
      {open && total > 0 && (
        <div className="absolute bottom-full right-0 z-30 mb-2 w-64 rounded-panel border border-line-2 bg-panel py-1 shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
          <div className="px-3 py-1 text-[11px] text-dim">Linked mentions</div>
          {links.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                setOpen(false)
                onOpen(n.id)
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-text/85 hover:bg-panel-2 hover:text-text"
            >
              <FileText size={12} className="shrink-0 text-dim" />
              <span className="truncate">{n.title}</span>
              {n.folder && <span className="ml-auto shrink-0 truncate text-[10px] text-dim">{n.folder}</span>}
            </button>
          ))}
          {projectLinks.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setOpen(false)
                onOpenProject(p.id)
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-text/85 hover:bg-panel-2 hover:text-text"
            >
              <Sparkles size={12} className="shrink-0 text-accent/70" />
              <span className="truncate">{p.name}</span>
              <span className="ml-auto shrink-0 text-[10px] text-dim">project</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center font-read text-dim">
      <div className="text-base text-text">No note open</div>
      <p className="max-w-xs text-xs">Your vault is empty. Create the first note to get going.</p>
      <button
        onClick={onCreate}
        className="flex items-center gap-1 rounded-control bg-accent/15 px-3 py-1.5 text-xs text-accent hover:bg-accent/25"
      >
        <Plus size={12} /> New note
      </button>
    </div>
  )
}
