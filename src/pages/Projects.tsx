import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  FileText,
  Flag,
  GitCommitHorizontal,
  Hash,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { STATUS_META, type ProjectStatus } from '@/data/projects'
import { SECTIONS, sectionById, type SectionId } from '@/data/sections'
import {
  addEntry,
  completePlan,
  createProject,
  deleteProject,
  patchProject,
  removeEntry,
  renameProjectProp,
  setProjectProp,
  setStatus,
  useProjects,
  type HistoryKind,
  type ProjectView,
} from '@/features/projects/store'
import { useGlobalProps, useGlobalTags, normTag } from '@/features/connections/connections'
import { ListEditor, PropertiesPanel } from '@/features/notes/PropertiesPanel'
import { setPropType, useVault } from '@/features/notes/notesStore'
import { resolveNote } from '@/features/notes/vault'
import type { Note } from '@/data/notes'
import { Modal } from '@/components/ui/Modal'
import { StatusDot } from '@/components/ui/StatusDot'
import { relTime } from '@/lib/time'
import { cn } from '@/lib/cn'

const ORDER: ProjectStatus[] = ['idea', 'active', 'paused', 'shipped']
const STATUS_LABELS = Object.fromEntries(ORDER.map((s) => [s, STATUS_META[s].label])) as Record<ProjectStatus, string>

type SortMode = 'manual' | 'name' | 'updated' | 'created'
const SORT_LABEL: Record<SortMode, string> = { manual: 'Default order', name: 'Name', updated: 'Recently updated', created: 'Newest' }
const SORT_KEY = 'os:projects:sort'

const KIND_META: Record<HistoryKind, { label: string; icon: ReactNode; color: string }> = {
  move: { label: 'Move', icon: <GitCommitHorizontal size={13} />, color: '#46d369' },
  plan: { label: 'Next move', icon: <Flag size={13} />, color: '#f0a020' },
  comment: { label: 'Comment', icon: <MessageSquare size={13} />, color: '#ac92d9' },
  status: { label: 'Status', icon: <Circle size={13} />, color: '#6b7785' },
  created: { label: 'Created', icon: <Sparkles size={13} />, color: '#c77591' },
}

export function Projects() {
  const projects = useProjects()
  const { all: globalTags } = useGlobalTags()
  const [params, setParams] = useSearchParams()
  const openId = params.get('project')
  const setOpenId = (id: string | null) =>
    setParams((p) => {
      const next = new URLSearchParams(p)
      if (id) next.set('project', id)
      else next.delete('project')
      return next
    })
  const [freshId, setFreshId] = useState<string | null>(null)
  const [hover, setHover] = useState<{ project: ProjectView; x: number; y: number } | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  // ---- filters ----
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [tagsOpen, setTagsOpen] = useState(false)
  const [section, setSection] = useState<SectionId | ''>('')
  const [sort, setSortState] = useState<SortMode>(() => {
    try {
      return (localStorage.getItem(SORT_KEY) as SortMode) || 'manual'
    } catch {
      return 'manual'
    }
  })
  const setSort = (s: SortMode) => {
    setSortState(s)
    try {
      localStorage.setItem(SORT_KEY, s)
    } catch {
      /* ignore */
    }
  }

  const projectTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of projects) for (const t of p.tags) counts.set(normTag(t), (counts.get(normTag(t)) ?? 0) + 1)
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [projects])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = projects.filter((p) => {
      if (section && p.sectionId !== section) return false
      if (tagFilter.some((t) => !p.tags.map(normTag).includes(t))) return false
      if (!q) return true
      const hay = [p.name, p.tagline, p.what, p.tags.join(' '), ...p.history.map((h) => h.text)].join('\n').toLowerCase()
      return q.split(/\s+/).every((w) => hay.includes(w))
    })
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'updated') list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    else if (sort === 'created') list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return list
  }, [projects, query, tagFilter, section, sort])

  const openProject = openId ? projects.find((p) => p.id === openId) ?? null : null
  const activeProject = activeId ? projects.find((p) => p.id === activeId) ?? null : null
  const filtering = !!query.trim() || tagFilter.length > 0 || !!section

  const moveStatus = (projectId: string, dir: -1 | 1) => {
    const current = projects.find((p) => p.id === projectId)
    if (!current) return
    const next = ORDER[ORDER.indexOf(current.status) + dir]
    if (next) setStatus(current, next, STATUS_LABELS)
  }

  // MouseSensor only — touch users get the ‹ › arrows and the pop-up's
  // status select (drag-and-drop fought scrolling on phones).
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 8 } }))
  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id))
    setHover(null)
  }
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const overStatus = e.over?.id as ProjectStatus | undefined
    const current = projects.find((p) => p.id === String(e.active.id))
    if (overStatus && current) setStatus(current, overStatus, STATUS_LABELS)
  }

  const newProject = () => {
    const id = createProject({ sectionId: section || undefined, tags: tagFilter })
    setFreshId(id)
    setOpenId(id)
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="flex h-full min-h-0 flex-col p-3 sm:p-5">
        {/* Header + toolbar */}
        <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
          <h1 className="mr-2 font-display text-lg tracking-wider text-text">PROJECTS</h1>
          <span className="text-[11px] text-dim">
            {filtering ? `${visible.length} of ${projects.length}` : projects.length}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <div className="relative flex items-center">
              <Search size={13} className="pointer-events-none absolute left-2 text-dim" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
                placeholder="Search projects…"
                className="h-7 w-44 rounded-control border border-line bg-bg/60 pl-7 pr-2 text-[12px] text-text placeholder:text-dim focus:border-accent/60 focus:outline-none sm:w-56"
              />
            </div>
            <button
              onClick={() => setTagsOpen((o) => !o)}
              title="Filter by tag"
              className={cn(
                'relative flex h-7 items-center gap-1 rounded-control border px-2 text-[12px] transition-colors',
                tagsOpen || tagFilter.length ? 'border-accent/50 text-accent' : 'border-line text-dim hover:text-text',
              )}
            >
              <Hash size={13} /> Tags
              {tagFilter.length > 0 && <span className="rounded-full bg-accent px-1.5 text-[10px] text-bg">{tagFilter.length}</span>}
            </button>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value as SectionId | '')}
              className="h-7 rounded-control border border-line bg-bg px-2 text-[12px] text-text focus:border-accent/60 focus:outline-none"
              title="Filter by section"
            >
              <option value="">All sections</option>
              {SECTIONS.filter((s) => s.id !== 'home').map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="h-7 rounded-control border border-line bg-bg px-2 text-[12px] text-text focus:border-accent/60 focus:outline-none"
              title="Sort"
            >
              {(Object.keys(SORT_LABEL) as SortMode[]).map((s) => (
                <option key={s} value={s}>
                  {SORT_LABEL[s]}
                </option>
              ))}
            </select>
            <button
              onClick={newProject}
              title="New project"
              className="flex h-7 items-center gap-1 rounded-control bg-accent/15 px-2.5 text-[12px] text-accent transition-colors hover:bg-accent/25"
            >
              <Plus size={14} /> New
            </button>
          </div>
        </div>

        {tagsOpen && (
          <div className="mb-3 flex shrink-0 flex-wrap items-center gap-1 rounded-panel border border-line bg-panel/50 p-2">
            {projectTags.map(([t, count]) => {
              const on = tagFilter.includes(t)
              return (
                <button
                  key={t}
                  onClick={() => setTagFilter((f) => (on ? f.filter((x) => x !== t) : [...f, t]))}
                  className={cn('rounded-full px-2 py-0.5 text-[11px]', on ? 'bg-accent/30 text-text' : 'bg-panel-2 text-text/70 hover:text-text')}
                >
                  #{t} <span className="text-dim">{count}</span>
                </button>
              )
            })}
            {tagFilter.length > 0 && (
              <button onClick={() => setTagFilter([])} className="ml-1 text-[11px] text-dim hover:text-accent">
                clear
              </button>
            )}
          </div>
        )}

        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
            {ORDER.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                projects={visible.filter((p) => p.status === status)}
                onOpen={setOpenId}
                onHover={setHover}
                onMoveStatus={moveStatus}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>
            {activeProject ? <CardVisual project={activeProject} dragging /> : null}
          </DragOverlay>
        </DndContext>

        {hover && !openId && !activeId && <HoverPreview project={hover.project} x={hover.x} y={hover.y} />}
      </div>

      {openProject && (
        <ProjectModal
          project={openProject}
          fresh={freshId === openProject.id}
          tagPool={globalTags.map((t) => t.tag)}
          onClose={() => {
            setOpenId(null)
            setFreshId(null)
          }}
          onOpenProject={setOpenId}
          onFilterTag={(t) => {
            setTagFilter([normTag(t)])
            setTagsOpen(true)
            setOpenId(null)
          }}
        />
      )}
    </div>
  )
}

// ---- board ----------------------------------------------------------------

function KanbanColumn({
  status,
  projects,
  onOpen,
  onHover,
  onMoveStatus,
}: {
  status: ProjectStatus
  projects: ProjectView[]
  onOpen: (id: string) => void
  onHover: (h: { project: ProjectView; x: number; y: number } | null) => void
  onMoveStatus: (id: string, dir: -1 | 1) => void
}) {
  const meta = STATUS_META[status]
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-0 w-[78vw] shrink-0 snap-start flex-col rounded-panel border bg-panel/40 transition-colors sm:w-[250px] lg:w-auto lg:flex-1',
        isOver ? 'border-line-2 bg-panel/80' : 'border-line',
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2">
        <StatusDot color={meta.color} size={7} />
        <span className="label" style={{ color: meta.color }}>
          {meta.label}
        </span>
        <span className="text-[10px] text-dim">{projects.length}</span>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} onOpen={onOpen} onHover={onHover} onMoveStatus={onMoveStatus} />
        ))}
        {projects.length === 0 && (
          <div className="rounded-control border border-dashed border-line px-2 py-5 text-center text-[10px] uppercase tracking-wider text-dim/60">
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}

function ProjectCard({
  project,
  onOpen,
  onHover,
  onMoveStatus,
}: {
  project: ProjectView
  onOpen: (id: string) => void
  onHover: (h: { project: ProjectView; x: number; y: number } | null) => void
  onMoveStatus: (id: string, dir: -1 | 1) => void
}) {
  const draggable = useDraggable({ id: project.id })
  const idx = ORDER.indexOf(project.status)
  return (
    <div
      ref={draggable.setNodeRef}
      {...draggable.listeners}
      {...draggable.attributes}
      onClick={() => onOpen(project.id)}
      onPointerEnter={(e) => e.pointerType !== 'touch' && onHover({ project, x: e.clientX, y: e.clientY })}
      onPointerMove={(e) => e.pointerType !== 'touch' && onHover({ project, x: e.clientX, y: e.clientY })}
      onPointerLeave={() => onHover(null)}
      className={cn('group cursor-pointer touch-manipulation', draggable.isDragging && 'opacity-30')}
    >
      <CardVisual
        project={project}
        arrows={
          <span className="flex shrink-0 items-center opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMoveStatus(project.id, -1)
              }}
              disabled={idx === 0}
              aria-label="Move to previous status"
              className="p-0.5 text-dim hover:text-accent disabled:opacity-20"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMoveStatus(project.id, 1)
              }}
              disabled={idx === ORDER.length - 1}
              aria-label="Move to next status"
              className="p-0.5 text-dim hover:text-accent disabled:opacity-20"
            >
              <ChevronRight size={13} />
            </button>
          </span>
        }
      />
    </div>
  )
}

/** Compact card: name, section, a couple of tags, next-move flag. */
function CardVisual({ project, dragging, arrows }: { project: ProjectView; dragging?: boolean; arrows?: ReactNode }) {
  const section = sectionById(project.sectionId)
  return (
    <div
      className={cn(
        'rounded-control border border-line bg-panel/70 px-2.5 py-2 transition-colors group-hover:border-line-2',
        dragging && 'border-line-2 shadow-glow',
      )}
      style={{ borderLeftColor: section.accent, borderLeftWidth: 2 }}
    >
      <div className="flex items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[13px] text-text group-hover:text-accent-1">{project.name}</span>
        {arrows}
      </div>
      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-dim">
        <span className="shrink-0" style={{ color: section.accent }}>
          {section.label}
        </span>
        <span className="truncate">{project.tags.slice(0, 3).map((t) => `#${t}`).join(' ')}</span>
        {project.plans.length > 0 && (
          <span className="ml-auto flex shrink-0 items-center gap-0.5 text-amber/80" title={`${project.plans.length} open next move${project.plans.length > 1 ? 's' : ''}`}>
            <Flag size={10} />
            {project.plans.length}
          </span>
        )}
      </div>
    </div>
  )
}

/** Hover card (desktop): the quick read — everything but the full history. */
function HoverPreview({ project, x, y }: { project: ProjectView; x: number; y: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: x + 16, top: y + 16 })
  useEffect(() => {
    const el = ref.current
    const w = el?.offsetWidth ?? 320
    const h = el?.offsetHeight ?? 240
    setPos({
      left: x + 16 + w > window.innerWidth - 8 ? Math.max(8, x - w - 16) : x + 16,
      top: Math.max(8, Math.min(y + 16, window.innerHeight - h - 8)),
    })
  }, [x, y])
  const section = sectionById(project.sectionId)
  const meta = STATUS_META[project.status]
  const moves = project.history.filter((h) => h.kind === 'move').slice(0, 2)
  const comments = project.history.filter((h) => h.kind === 'comment').length
  return (
    <div
      ref={ref}
      className="pointer-events-none fixed z-40 w-[330px] animate-fade-in rounded-panel border bg-panel/95 p-3 font-read shadow-[0_16px_40px_rgba(0,0,0,0.55)] backdrop-blur-md"
      style={{ ...pos, borderColor: `${section.accent}66` }}
    >
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider">
        <span style={{ color: section.accent }}>{section.label}</span>
        <span className="flex items-center gap-1" style={{ color: meta.color }}>
          <StatusDot color={meta.color} size={5} />
          {meta.label}
        </span>
      </div>
      <div className="text-[14px] font-semibold text-text">{project.name}</div>
      {project.tagline && <p className="mt-0.5 text-[12px] text-text/70">{project.tagline}</p>}
      {project.what && <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-text/85">{project.what}</p>}
      {project.plans.length > 0 && (
        <div className="mt-2.5">
          <div className="mb-0.5 text-[10px] uppercase tracking-wider text-amber">Next up</div>
          {project.plans.slice(0, 2).map((p) => (
            <div key={p.id} className="flex gap-1.5 text-[12px] text-text/85">
              <Flag size={11} className="mt-0.5 shrink-0 text-amber" />
              <span className="line-clamp-2">{p.text}</span>
            </div>
          ))}
        </div>
      )}
      {moves.length > 0 && (
        <div className="mt-2.5">
          <div className="mb-0.5 text-[10px] uppercase tracking-wider text-neon-green">Recent moves</div>
          {moves.map((m) => (
            <div key={m.id} className="flex gap-1.5 text-[12px] text-text/80">
              <span className="shrink-0 text-[10px] tabular-nums text-dim">{m.date.slice(5, 10)}</span>
              <span className="line-clamp-1">{m.text}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-1 border-t border-line pt-2 text-[10px] text-dim">
        {project.tags.map((t) => (
          <span key={t} className="rounded-full bg-accent/15 px-1.5 text-accent-1">
            #{t}
          </span>
        ))}
        <span className="ml-auto">
          {project.history.length} entries · {comments} comments · updated {relTime(new Date(project.updatedAt))}
        </span>
      </div>
    </div>
  )
}

// ---- pop-up ---------------------------------------------------------------

function ProjectModal({
  project,
  fresh,
  tagPool,
  onClose,
  onOpenProject,
  onFilterTag,
}: {
  project: ProjectView
  fresh: boolean
  tagPool: string[]
  onClose: () => void
  onOpenProject: (id: string) => void
  onFilterTag: (t: string) => void
}) {
  const navigate = useNavigate()
  const section = sectionById(project.sectionId)
  const { index, all } = useGlobalTags()
  const { propTypes, suggestions } = useGlobalProps()
  const { notes } = useVault()
  const nameRef = useRef<HTMLInputElement>(null)
  // The Properties panel works on anything note-shaped: id, title, props.
  const asNote = useMemo(
    () => ({ id: project.id, title: project.name, folder: '', tags: [], updated: project.updatedAt, body: '', props: project.props }) as Note,
    [project.id, project.name, project.updatedAt, project.props],
  )
  const openWiki = (target: string) => {
    const hit = resolveNote(notes, target)
    if (hit) navigate(`/notes?note=${encodeURIComponent(hit.id)}`)
  }

  useEffect(() => {
    if (fresh) nameRef.current?.select()
  }, [fresh])

  const related = useMemo(() => {
    const notes = new Map<string, { id: string; title: string; shared: string[] }>()
    const projects = new Map<string, { id: string; name: string; shared: string[] }>()
    for (const t of project.tags.map(normTag)) {
      const e = index.get(t)
      if (!e) continue
      for (const n of e.notes) notes.set(n.id, { id: n.id, title: n.title, shared: [...(notes.get(n.id)?.shared ?? []), t] })
      for (const p of e.projects)
        if (p.id !== project.id) projects.set(p.id, { id: p.id, name: p.name, shared: [...(projects.get(p.id)?.shared ?? []), t] })
    }
    const byShared = <T extends { shared: string[] }>(a: T, b: T) => b.shared.length - a.shared.length
    return { notes: [...notes.values()].sort(byShared), projects: [...projects.values()].sort(byShared) }
  }, [index, project.tags, project.id])

  return (
    <Modal open onClose={onClose} title="Project" code={section.code} accent={section.accent} width={980}>
      <div className="grid gap-5 font-read md:grid-cols-[1fr_260px]">
        {/* Main column */}
        <div className="min-w-0">
          <input
            key={`${project.id}:${project.name}`}
            ref={nameRef}
            defaultValue={project.name}
            autoFocus={fresh}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            onBlur={(e) => e.currentTarget.value.trim() && e.currentTarget.value !== project.name && patchProject(project.id, { name: e.currentTarget.value.trim() })}
            className="w-full rounded-control border border-transparent bg-transparent px-1 py-0.5 text-xl font-semibold text-text outline-none hover:border-line focus:border-accent/50"
          />
          <input
            key={`${project.id}:t:${project.tagline}`}
            defaultValue={project.tagline}
            placeholder="One-line tagline"
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            onBlur={(e) => e.currentTarget.value !== project.tagline && patchProject(project.id, { tagline: e.currentTarget.value })}
            className="mt-0.5 w-full rounded-control border border-transparent bg-transparent px-1 py-0.5 text-[13px] text-text/70 outline-none placeholder:text-dim hover:border-line focus:border-accent/50"
          />
          <textarea
            key={`${project.id}:w:${project.what}`}
            defaultValue={project.what}
            placeholder="What is this project?"
            rows={3}
            onBlur={(e) => e.currentTarget.value !== project.what && patchProject(project.id, { what: e.currentTarget.value })}
            className="mt-2 w-full resize-y rounded-control border border-line/60 bg-bg/30 px-2 py-1.5 text-[13px] leading-relaxed text-text/90 outline-none placeholder:text-dim focus:border-accent/50"
          />

          <div className="group/note mt-3">
            <PropertiesPanel
              note={asNote}
              propTypes={propTypes}
              suggestions={suggestions}
              vaultTags={all.map((t) => [t.tag, t.notes.length + t.projects.length] as [string, number])}
              addNonce={0}
              onSet={(key, value) => setProjectProp(project.id, key, value)}
              onRename={(from, to) => renameProjectProp(project.id, from, to)}
              onSetType={setPropType}
              onOpenWiki={openWiki}
              onTagClick={onFilterTag}
            />
          </div>

          <History project={project} />
        </div>

        {/* Meta column */}
        <aside className="space-y-4 text-[12px]">
          <Field label="Status">
            <div className="flex flex-wrap gap-1">
              {ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(project, s, STATUS_LABELS)}
                  className={cn(
                    'flex items-center gap-1 rounded-control border px-2 py-1 text-[11px] uppercase tracking-wider',
                    project.status === s ? '' : 'border-line text-dim hover:text-text',
                  )}
                  style={project.status === s ? { borderColor: `${STATUS_META[s].color}88`, color: STATUS_META[s].color } : undefined}
                >
                  <StatusDot color={STATUS_META[s].color} size={5} />
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Section">
            <select
              value={project.sectionId}
              onChange={(e) => patchProject(project.id, { sectionId: e.target.value as SectionId })}
              className="w-full rounded-control border border-line bg-bg px-2 py-1 text-[12px] text-text focus:border-accent/60 focus:outline-none"
            >
              {SECTIONS.filter((s) => s.id !== 'home').map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tags · shared across BaseSpace">
            <div className="rounded-control border border-line/60 bg-bg/30 py-1">
              <ListEditor
                tags
                values={project.tags}
                suggestions={tagPool}
                onChange={(v) => patchProject(project.id, { tags: Array.isArray(v) ? v : [] })}
                onOpenWiki={() => {}}
                onTagClick={onFilterTag}
              />
            </div>
          </Field>
          {(related.notes.length > 0 || related.projects.length > 0) && (
            <Field label="Related by tags">
              <div className="space-y-0.5">
                {related.projects.slice(0, 6).map((p) => (
                  <button key={p.id} onClick={() => onOpenProject(p.id)} className="flex w-full items-center gap-1.5 rounded-control px-1 py-0.5 text-left hover:bg-panel-2">
                    <Sparkles size={12} className="shrink-0 text-accent/70" />
                    <span className="min-w-0 flex-1 truncate text-text/85">{p.name}</span>
                    <span className="shrink-0 text-[10px] text-dim">#{p.shared.join(' #')}</span>
                  </button>
                ))}
                {related.notes.slice(0, 8).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => navigate(`/notes?note=${encodeURIComponent(n.id)}`)}
                    className="flex w-full items-center gap-1.5 rounded-control px-1 py-0.5 text-left hover:bg-panel-2"
                  >
                    <FileText size={12} className="shrink-0 text-dim" />
                    <span className="min-w-0 flex-1 truncate text-text/85">{n.title}</span>
                    <span className="shrink-0 text-[10px] text-dim">#{n.shared.join(' #')}</span>
                  </button>
                ))}
              </div>
            </Field>
          )}
          {project.links && project.links.length > 0 && (
            <Field label="Links">
              <div className="flex flex-wrap gap-1.5">
                {project.links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-control border border-line px-2 py-0.5 text-accent hover:border-accent/60"
                  >
                    {l.label} <ArrowUpRight size={11} />
                  </a>
                ))}
              </div>
            </Field>
          )}
          <div className="space-y-0.5 border-t border-line pt-3 text-[11px] text-dim">
            <div>Updated {relTime(new Date(project.updatedAt))}</div>
            <div>{project.history.length} history entries</div>
          </div>
          <button
            onClick={() => {
              if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return
              deleteProject(project.id)
              onClose()
            }}
            className="flex items-center gap-1.5 text-[11px] text-dim hover:text-danger"
          >
            <Trash2 size={12} /> Delete project
          </button>
        </aside>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wider text-dim">{label}</div>
      {children}
    </div>
  )
}

/** Next moves (open plans), a composer, and the full history feed. */
function History({ project }: { project: ProjectView }) {
  const [kind, setKind] = useState<'comment' | 'move' | 'plan'>('comment')
  const [text, setText] = useState('')
  const submit = () => {
    if (!text.trim()) return
    addEntry(project.id, kind, text)
    setText('')
  }
  const feed = project.history.filter((h) => h.kind !== 'plan')
  return (
    <div className="mt-4">
      {project.plans.length > 0 && (
        <div className="mb-3 rounded-panel border border-amber/25 bg-amber/5 p-2">
          <div className="mb-1 px-1 text-[10px] uppercase tracking-wider text-amber">Next up</div>
          {project.plans.map((p) => (
            <div key={p.id} className="group flex items-start gap-2 rounded-control px-1 py-1 hover:bg-panel-2/60">
              <button onClick={() => completePlan(project.id, p)} title="Mark done — it becomes a move" className="mt-0.5 text-amber hover:text-neon-green">
                <Circle size={14} />
              </button>
              <span className="min-w-0 flex-1 text-[13px] text-text/90">{p.text}</span>
              <span className="shrink-0 text-[10px] text-dim">{relTime(new Date(p.date))}</span>
              <button onClick={() => removeEntry(project.id, p)} className="text-dim opacity-0 hover:text-danger group-hover:opacity-100" aria-label="Remove">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-panel border border-line bg-bg/30 p-2">
        <div className="mb-1.5 flex gap-1">
          {(['comment', 'move', 'plan'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cn(
                'flex items-center gap-1 rounded-control px-2 py-0.5 text-[11px]',
                kind === k ? 'bg-panel-2 text-text' : 'text-dim hover:text-text',
              )}
              style={kind === k ? { color: KIND_META[k].color } : undefined}
            >
              {KIND_META[k].icon}
              {KIND_META[k].label}
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              submit()
            }
          }}
          rows={2}
          placeholder={kind === 'comment' ? 'Write a comment…' : kind === 'move' ? 'What just happened?' : 'What should happen next?'}
          className="w-full resize-y bg-transparent px-1 text-[13px] text-text outline-none placeholder:text-dim"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-dim">Ctrl/Cmd + Enter to add</span>
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="rounded-control bg-accent/15 px-2.5 py-1 text-[12px] text-accent hover:bg-accent/25 disabled:opacity-40"
          >
            Add {KIND_META[kind].label.toLowerCase()}
          </button>
        </div>
      </div>

      <ol className="mt-3 space-y-0.5">
        {feed.map((h) => (
          <li key={h.id} className="group flex items-start gap-2 rounded-control px-1 py-1.5 hover:bg-panel-2/40">
            <span className="mt-0.5 shrink-0" style={{ color: KIND_META[h.kind].color }} title={KIND_META[h.kind].label}>
              {h.kind === 'move' ? <CheckCircle2 size={14} /> : KIND_META[h.kind].icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className={cn('text-[13px]', h.kind === 'status' || h.kind === 'created' ? 'text-dim' : 'text-text/90')}>
                {h.kind === 'status' ? `Status changed: ${h.text}` : h.text}
              </div>
              <div className="text-[10px] text-dim" title={new Date(h.date).toLocaleString()}>
                {KIND_META[h.kind].label} · {relTime(new Date(h.date))}
              </div>
            </div>
            <button onClick={() => removeEntry(project.id, h)} className="mt-0.5 text-dim opacity-0 hover:text-danger group-hover:opacity-100" aria-label="Remove entry">
              <X size={12} />
            </button>
          </li>
        ))}
        {!feed.length && <li className="px-1 py-2 text-[12px] text-dim">No history yet.</li>}
      </ol>
    </div>
  )
}
