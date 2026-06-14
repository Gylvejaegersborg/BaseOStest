import { useMemo, useState } from 'react'
import { ArrowUpRight, GitCommitHorizontal, Pencil, Check, X } from 'lucide-react'
import { PROJECTS, STATUS_META, type Project, type ProjectStatus } from '@/data/projects'
import { useOsOverlay, mergeById } from '@/features/team/osOverlay'
import { sectionById } from '@/data/sections'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { StatusDot } from '@/components/ui/StatusDot'

const ORDER: ProjectStatus[] = ['active', 'paused', 'idea', 'shipped']

type ProjectOverrides = Record<string, { lastMove?: string; nextMove?: string; progress?: number }>

function loadOverrides(): ProjectOverrides {
  try { return JSON.parse(localStorage.getItem('os:projects:overrides') ?? '{}') }
  catch { return {} }
}

function saveOverrides(o: ProjectOverrides) {
  localStorage.setItem('os:projects:overrides', JSON.stringify(o))
}

function applyOverrides(projects: Project[], overrides: ProjectOverrides): Project[] {
  return projects.map((p) => {
    const o = overrides[p.id]
    return o ? { ...p, ...o } : p
  })
}

export function Projects() {
  const [overrides, setOverrides] = useState<ProjectOverrides>(loadOverrides)
  const [open, setOpen] = useState<Project | null>(null)

  // Agents can add projects or patch existing ones (lastMove/nextMove/progress…)
  // via the OS overlay; the user's local overrides still win on top.
  const overlay = useOsOverlay()
  const base = useMemo(() => mergeById(PROJECTS, overlay.projects as Project[]), [overlay.projects])

  const projects = applyOverrides(base, overrides)
  const openProject = open ? applyOverrides([open], overrides)[0] : null

  const updateProject = (id: string, patch: { lastMove?: string; nextMove?: string; progress?: number }) => {
    setOverrides((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } }
      saveOverrides(next)
      return next
    })
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl tracking-wider text-text">PROJECT OVERVIEW</h1>
        <p className="text-xs text-dim">{projects.length} projects · status, last move, next move.</p>
      </div>

      {ORDER.map((status) => {
        const items = projects.filter((p) => p.status === status)
        if (!items.length) return null
        return (
          <section key={status} className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <StatusDot color={STATUS_META[status].color} size={7} />
              <span className="label" style={{ color: STATUS_META[status].color }}>
                {STATUS_META[status].label}
              </span>
              <span className="text-[10px] text-dim">[{items.length}]</span>
              <div className="ml-2 h-px flex-1 bg-line" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <ProjectCard key={p.id} project={p} onClick={() => setOpen(p)} />
              ))}
            </div>
          </section>
        )
      })}

      {openProject && (
        <ProjectModal
          project={openProject}
          onClose={() => setOpen(null)}
          onUpdate={(patch) => updateProject(openProject.id, patch)}
        />
      )}
    </div>
  )
}

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const section = sectionById(project.sectionId)
  const meta = STATUS_META[project.status]
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col border border-line bg-panel/70 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-line-2"
      style={{ borderTopColor: section.accent }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-display text-base text-text transition-colors group-hover:text-accent">
          {project.name}
        </h3>
        <ArrowUpRight size={15} className="text-dim transition-colors group-hover:text-accent" />
      </div>
      <p className="mb-3 line-clamp-2 text-xs text-dim">{project.tagline}</p>

      <div className="mb-3 flex flex-wrap gap-1">
        {project.tags.map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      </div>

      <div className="mt-auto">
        <div className="mb-1 flex items-center justify-between text-[10px] tracking-wider text-dim">
          <span style={{ color: meta.color }}>{meta.label}</span>
          <span>{project.progress}%</span>
        </div>
        <div className="h-1 w-full bg-bg">
          <div
            className="h-full transition-all"
            style={{ width: `${project.progress}%`, backgroundColor: section.accent }}
          />
        </div>
      </div>
    </button>
  )
}

function ProjectModal({
  project,
  onClose,
  onUpdate,
}: {
  project: Project
  onClose: () => void
  onUpdate: (patch: { lastMove?: string; nextMove?: string; progress?: number }) => void
}) {
  const section = sectionById(project.sectionId)
  const meta = STATUS_META[project.status]

  return (
    <Modal open={!!project} onClose={onClose} title={project.name} code={section.code} accent={section.accent} width={620}>
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1.5" style={{ color: meta.color }}>
          <StatusDot color={meta.color} size={7} /> {meta.label}
        </span>
        <span className="text-dim">orbits {section.label}</span>
        <span className="ml-auto text-dim">{project.progress}% complete</span>
      </div>

      <p className="mt-4 text-sm text-text/90">{project.what}</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <EditableField
          label="LAST MOVE"
          value={project.lastMove}
          color="#6b7785"
          onSave={(v) => onUpdate({ lastMove: v })}
        />
        <EditableField
          label="NEXT MOVE"
          value={project.nextMove}
          color={section.accent}
          onSave={(v) => onUpdate({ nextMove: v })}
        />
      </div>

      <div className="mt-4">
        <label className="label mb-1 block">PROGRESS</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={project.progress}
            onChange={(e) => onUpdate({ progress: Number(e.target.value) })}
            className="flex-1 accent-accent"
          />
          <span className="w-10 text-right text-xs tabular-nums text-text">{project.progress}%</span>
        </div>
        <div className="mt-1.5 h-1 w-full bg-bg">
          <div className="h-full transition-all" style={{ width: `${project.progress}%`, backgroundColor: section.accent }} />
        </div>
      </div>

      <div className="mt-5">
        <div className="label mb-2">MOVE TIMELINE</div>
        <ol className="space-y-2">
          {project.timeline.map((m, i) => (
            <li key={i} className="flex gap-3 text-xs">
              <GitCommitHorizontal size={14} className="mt-0.5 shrink-0 text-dim" />
              <div>
                <span className="text-dim tabular-nums">{m.date}</span>
                <div className="text-text/85">{m.text}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {project.links && (
        <div className="mt-5 flex flex-wrap gap-2">
          {project.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 border border-line px-2 py-1 text-xs text-accent hover:border-accent/60"
            >
              {l.label} <ArrowUpRight size={12} />
            </a>
          ))}
        </div>
      )}
    </Modal>
  )
}

function EditableField({
  label,
  value,
  color,
  onSave,
}: {
  label: string
  value: string
  color: string
  onSave: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const commit = () => { onSave(draft); setEditing(false) }
  const cancel = () => { setDraft(value); setEditing(false) }

  return (
    <div className="border border-line bg-bg/40 p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="label" style={{ color }}>{label}</span>
        {editing ? (
          <div className="flex gap-1">
            <button onClick={commit} className="text-neon-green/80 hover:text-neon-green"><Check size={12} /></button>
            <button onClick={cancel} className="text-dim hover:text-danger"><X size={12} /></button>
          </div>
        ) : (
          <button onClick={() => { setDraft(value); setEditing(true) }} className="text-dim hover:text-text">
            <Pencil size={12} />
          </button>
        )}
      </div>
      {editing ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit() } if (e.key === 'Escape') cancel() }}
          rows={2}
          className="w-full resize-none bg-transparent text-xs text-text/85 outline-none"
        />
      ) : (
        <div className="text-xs text-text/85">{value}</div>
      )}
    </div>
  )
}
