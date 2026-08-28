import { ArrowUpRight, GitCommitHorizontal } from 'lucide-react'
import { STATUS_META, type Project } from '@/data/projects'
import { StatusDot } from '@/components/ui/StatusDot'
import { EditableField } from '@/components/ui/EditableField'

/** Full project detail body — tagline, what, status, progress, editable
 *  last/next move, timeline, links. Shared by Home's HUD planet detail and
 *  the Projects Kanban click popup so both surfaces carry the exact same
 *  editable-field pattern instead of one being a read-only subset of the
 *  other. `progressControl` lets a host swap in a draggable range input
 *  (Kanban popup) vs. a plain readout (Home HUD, where a slider would fight
 *  the 3D scene's own drag-to-orbit gesture). */
export function ProjectDetailBody({
  project,
  accent,
  onUpdate,
  progressControl,
  showStatusBadge = true,
}: {
  project: Project
  accent: string
  onUpdate: (patch: { lastMove?: string; nextMove?: string; progress?: number }) => void
  progressControl?: 'slider' | 'readout'
  /** Set false when the host already renders its own status control (e.g.
   *  the Kanban popup's editable StatusSelect dropdown) so the status isn't
   *  shown twice. */
  showStatusBadge?: boolean
}) {
  const meta = STATUS_META[project.status]

  return (
    <>
      <div className="mb-1 flex items-center justify-between">
        <span className="label" style={{ color: accent }}>
          PROJECT
        </span>
        {showStatusBadge && (
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider" style={{ color: meta.color }}>
            <StatusDot color={meta.color} size={6} />
            {meta.label}
          </span>
        )}
      </div>
      <h3 className="font-display text-lg text-text">{project.name}</h3>
      <p className="mt-1 text-xs text-dim">{project.tagline}</p>
      <p className="mt-3 text-sm text-text/90">{project.what}</p>

      <div className="mt-4">
        <label className="label mb-1 block">PROGRESS</label>
        {progressControl === 'slider' ? (
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
        ) : (
          <div className="flex items-center justify-between text-[10px] tracking-wider text-dim">
            <span>{project.progress}% complete</span>
          </div>
        )}
        <div className="mt-1.5 h-1 w-full bg-bg">
          <div className="h-full transition-all" style={{ width: `${project.progress}%`, backgroundColor: accent }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        <EditableField
          label="LAST MOVE"
          value={project.lastMove}
          color="#6b7785"
          onSave={(v) => onUpdate({ lastMove: v })}
        />
        <EditableField
          label="NEXT MOVE"
          value={project.nextMove}
          color={accent}
          onSave={(v) => onUpdate({ nextMove: v })}
        />
      </div>

      {project.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {project.tags.map((t) => (
            <span key={t} className="border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-dim">
              {t}
            </span>
          ))}
        </div>
      )}

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
    </>
  )
}
