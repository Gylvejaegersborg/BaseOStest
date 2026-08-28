import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, ChevronRight, X } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { PROJECTS, STATUS_META, type Project, type ProjectStatus } from '@/data/projects'
import { useOsOverlay, mergeById } from '@/features/team/osOverlay'
import { useProjectOverrides, applyOverrides } from '@/features/projects/overrides'
import { ProjectDetailBody } from '@/features/projects/ProjectDetailBody'
import { sectionById } from '@/data/sections'
import { Badge } from '@/components/ui/Badge'
import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/lib/cn'

const ORDER: ProjectStatus[] = ['idea', 'active', 'paused', 'shipped']

export function Projects() {
  const { overrides, updateProject } = useProjectOverrides()
  const [openId, setOpenId] = useState<string | null>(null)
  const [hover, setHover] = useState<{ project: Project; x: number; y: number } | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Agents can add projects or patch existing ones (lastMove/nextMove/progress…)
  // via the OS overlay; the user's local overrides still win on top. Same
  // overrides store the Home HUD's planet detail writes to, so an edit made
  // on either surface stays in sync.
  const overlay = useOsOverlay()
  const base = useMemo(() => mergeById(PROJECTS, overlay.projects as Project[]), [overlay.projects])

  const projects = applyOverrides(base, overrides)
  const openProject = openId ? projects.find((p) => p.id === openId) ?? null : null
  const activeProject = activeId ? projects.find((p) => p.id === activeId) ?? null : null

  // Distance/delay-based activation constraints let a plain tap/click still
  // reach the card's onClick — the drag only "activates" once the pointer
  // has genuinely moved (mouse) or been held+moved (touch), so short taps to
  // open the popup and real drags to change status don't fight each other.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  )

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const overStatus = e.over?.id as ProjectStatus | undefined
    const projectId = String(e.active.id)
    const current = projects.find((p) => p.id === projectId)
    if (!overStatus || !current || current.status === overStatus) return
    updateProject(projectId, { status: overStatus })
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Padding lives on this inner wrapper (not the relative container
       *  above) so ProjectPopup/backdrop below can be absolute inset-0 and
       *  sit flush against the page edges — same edge-to-edge docking as
       *  Home's HUD panel, instead of being inset by the page's own padding. */}
      <div className="flex h-full min-h-0 flex-col p-6">
        <div className="mb-4 shrink-0">
          <h1 className="font-display text-2xl tracking-wider text-text">PROJECT OVERVIEW</h1>
          <p className="text-xs text-dim">
            {projects.length} projects · drag a card to change status, click for detail.
          </p>
        </div>

        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          {/* Horizontal snap-scroll on every breakpoint rather than switching to
           *  a vertical stack on mobile: a Kanban board that stacks status
           *  columns vertically forces a user to scroll past every other
           *  column's full card list just to reach the next status, which is
           *  worse than just letting them swipe sideways between fixed-width
           *  columns — the standard mobile Kanban pattern (Trello/Jira do the
           *  same). snap-x + snap-start gives each column a natural resting
           *  point on touch. */}
          <div className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
            {ORDER.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                projects={projects.filter((p) => p.status === status)}
                onOpen={setOpenId}
                onHover={setHover}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>
            {activeProject ? <ProjectCardVisual project={activeProject} dragging /> : null}
          </DragOverlay>
        </DndContext>

        {hover && !openId && !activeId && (
          <HoverPreview project={hover.project} x={hover.x} y={hover.y} />
        )}
      </div>

      {openProject && (
        <ProjectPopup
          project={openProject}
          onClose={() => setOpenId(null)}
          onUpdate={(patch) => updateProject(openProject.id, patch)}
        />
      )}
    </div>
  )
}

function KanbanColumn({
  status,
  projects,
  onOpen,
  onHover,
}: {
  status: ProjectStatus
  projects: Project[]
  onOpen: (id: string) => void
  onHover: (h: { project: Project; x: number; y: number } | null) => void
}) {
  const meta = STATUS_META[status]
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        // Fixed-ish width columns sized to comfortably show ~1.15 columns on
        // a phone (a peek of the next column signals "swipe for more") and
        // settle at a normal Kanban width from sm/lg up.
        'flex min-h-0 w-[82vw] shrink-0 snap-start flex-col border bg-panel/50 transition-colors sm:w-[280px] lg:w-auto lg:flex-1',
        isOver ? 'border-line-2 bg-panel/80' : 'border-line',
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5">
        <StatusDot color={meta.color} size={7} />
        <span className="label" style={{ color: meta.color }}>
          {meta.label}
        </span>
        <span className="text-[10px] text-dim">[{projects.length}]</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
        {projects.map((p) => (
          <DraggableCard key={p.id} project={p} onOpen={onOpen} onHover={onHover} />
        ))}
        {projects.length === 0 && (
          <div className="border border-dashed border-line px-2 py-6 text-center text-[10px] uppercase tracking-wider text-dim/60">
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}

function DraggableCard({
  project,
  onOpen,
  onHover,
}: {
  project: Project
  onOpen: (id: string) => void
  onHover: (h: { project: Project; x: number; y: number } | null) => void
}) {
  // useDraggable (not useSortable — within-column order isn't a requirement
  // here) drives the drag; a plain onClick still opens the popup because the
  // sensors' activation constraints only "steal" the gesture once the
  // pointer has genuinely moved past the threshold.
  const draggable = useDraggable({ id: project.id })

  return (
    <div
      ref={draggable.setNodeRef}
      {...draggable.listeners}
      {...draggable.attributes}
      onClick={() => onOpen(project.id)}
      onPointerEnter={(e) => {
        if (e.pointerType === 'touch') return
        onHover({ project, x: e.clientX, y: e.clientY })
      }}
      onPointerMove={(e) => {
        if (e.pointerType === 'touch') return
        onHover({ project, x: e.clientX, y: e.clientY })
      }}
      onPointerLeave={() => onHover(null)}
      className={cn('touch-manipulation cursor-pointer', draggable.isDragging && 'opacity-30')}
    >
      <ProjectCardVisual project={project} />
    </div>
  )
}

function ProjectCardVisual({ project, dragging }: { project: Project; dragging?: boolean }) {
  const section = sectionById(project.sectionId)
  return (
    <div
      className={cn(
        'group relative flex flex-col border border-line bg-panel/70 p-3 text-left transition-all hover:border-line-2',
        dragging && 'shadow-glow border-line-2',
      )}
      style={{ borderTopColor: section.accent, borderTopWidth: 2 }}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <h3 className="font-display text-sm text-text transition-colors group-hover:text-accent">
          {project.name}
        </h3>
        <ArrowUpRight size={13} className="shrink-0 text-dim transition-colors group-hover:text-accent" />
      </div>
      <p className="mb-2.5 line-clamp-2 text-[11px] text-dim">{project.tagline}</p>

      <div className="mb-2.5 flex flex-wrap gap-1">
        {project.tags.slice(0, 3).map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      </div>

      <div className="mt-auto">
        <div className="mb-1 flex items-center justify-between text-[10px] tracking-wider text-dim">
          <span style={{ color: section.accent }}>{section.label}</span>
          <span>{project.progress}%</span>
        </div>
        <div className="h-1 w-full bg-bg">
          <div
            className="h-full transition-all"
            style={{ width: `${project.progress}%`, backgroundColor: section.accent }}
          />
        </div>
      </div>
    </div>
  )
}

/** Lightweight hover preview — tagline, status, progress — shown near the
 *  cursor before a user commits to the full click-in popup. Non-touch only. */
function HoverPreview({ project, x, y }: { project: Project; x: number; y: number }) {
  const section = sectionById(project.sectionId)
  const meta = STATUS_META[project.status]
  // Keep the tooltip on-screen near the cursor without covering the card.
  const left = Math.min(x + 16, window.innerWidth - 260)
  const top = Math.min(y + 16, window.innerHeight - 120)

  return (
    <div
      className="pointer-events-none fixed z-40 w-[240px] animate-fade-in border border-line-2 bg-panel/95 p-3 shadow-glow backdrop-blur-md"
      style={{ left, top, borderColor: `${section.accent}55` }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: section.accent }}>
          {section.label}
        </span>
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider" style={{ color: meta.color }}>
          <StatusDot color={meta.color} size={5} />
          {meta.label}
        </span>
      </div>
      <div className="font-display text-xs text-text">{project.name}</div>
      <p className="mt-1 line-clamp-2 text-[10px] text-dim">{project.tagline}</p>
      <div className="mt-2 h-1 w-full bg-bg">
        <div className="h-full" style={{ width: `${project.progress}%`, backgroundColor: section.accent }} />
      </div>
    </div>
  )
}

/** Jira-style click popup: adapted from the shared Modal's visual language
 *  (border/backdrop/header treatment) but docked as a right-side sliding card
 *  rather than a centered blocking overlay, matching the Home HUD panel's
 *  interaction pattern for cross-page consistency. The detail body itself
 *  (tagline/what/progress/editable fields/timeline/links) is the same
 *  ProjectDetailBody the Home HUD renders for a planet, just with a slider
 *  progress control instead of a readout and a status dropdown added above it. */
function ProjectPopup({
  project,
  onClose,
  onUpdate,
}: {
  project: Project
  onClose: () => void
  onUpdate: (patch: { status?: ProjectStatus; lastMove?: string; nextMove?: string; progress?: number }) => void
}) {
  const navigate = useNavigate()
  const section = sectionById(project.sectionId)

  const viewInConstellation = () => {
    navigate('/', { state: { focusProjectId: project.id } })
  }

  return (
    <>
      {/* absolute (not fixed) so the popup is confined to this page's own
       *  container, same as Home's HUD panel — it doesn't cover the mobile
       *  top header/nav drawer, keeping the docked-panel behavior consistent
       *  across both pages rather than one being a page-level overlay and
       *  the other a true viewport-covering modal. */}
      <div className="absolute inset-0 z-40 animate-fade-in bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="absolute inset-y-0 right-0 z-50 flex w-full flex-col border-l border-line-2 bg-panel shadow-glow animate-fade-in sm:w-[420px]"
        style={{ borderLeftColor: `${section.accent}55` }}
      >
        {/* Breadcrumb header, links back into the 3D constellation */}
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <button
            onClick={viewInConstellation}
            className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-dim transition-colors hover:text-accent"
            title="View in constellation"
          >
            {section.code}
            <ChevronRight size={11} className="text-dim/60" />
            <span style={{ color: section.accent }}>{section.label}</span>
          </button>
          <button onClick={onClose} className="text-dim transition-colors hover:text-text">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex items-center gap-3 text-xs">
            <StatusSelect status={project.status} onChange={(status) => onUpdate({ status })} />
            <button
              onClick={viewInConstellation}
              className="ml-auto flex items-center gap-1 text-dim transition-colors hover:text-accent"
            >
              orbits {section.label} <ArrowUpRight size={11} />
            </button>
          </div>

          <ProjectDetailBody
            project={project}
            accent={section.accent}
            onUpdate={onUpdate}
            progressControl="slider"
            showStatusBadge={false}
          />
        </div>

        <div className="border-t border-line p-4">
          <button
            onClick={viewInConstellation}
            className="flex w-full items-center justify-center gap-2 border py-2 text-xs uppercase tracking-wider transition-colors"
            style={{ borderColor: `${section.accent}55`, color: section.accent }}
          >
            View in Constellation <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </>
  )
}

function StatusSelect({ status, onChange }: { status: ProjectStatus; onChange: (s: ProjectStatus) => void }) {
  const meta = STATUS_META[status]
  return (
    <div className="relative">
      <select
        value={status}
        onChange={(e) => onChange(e.target.value as ProjectStatus)}
        className="appearance-none border bg-transparent py-1 pl-6 pr-2 text-[11px] uppercase tracking-wider outline-none"
        style={{ borderColor: `${meta.color}55`, color: meta.color }}
      >
        {ORDER.map((s) => (
          <option key={s} value={s} className="bg-panel text-text">
            {STATUS_META[s].label}
          </option>
        ))}
      </select>
      <StatusDot color={meta.color} size={7} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2" />
    </div>
  )
}
