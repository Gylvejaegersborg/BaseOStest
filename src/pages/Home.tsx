import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, MousePointerClick } from 'lucide-react'
import { Starfield } from '@/features/constellation/Starfield'
import { Constellation } from '@/features/constellation/Constellation'
import type { Body } from '@/features/constellation/layout'
import { sectionById } from '@/data/sections'
import { projectById, STATUS_META } from '@/data/projects'
import { StatusDot } from '@/components/ui/StatusDot'
import { HomeAgenda } from '@/features/calendar/HomeAgenda'

export function Home() {
  const navigate = useNavigate()
  const [hover, setHover] = useState<Body | null>(null)
  const [pinned, setPinned] = useState<Body | null>(null)

  const shown = hover ?? pinned
  const activeKey = hover?.key ?? pinned?.key ?? null

  // On a mouse, clicking a sun jumps straight in. On touch there is no hover,
  // so a tap selects the body and shows its panel; the panel's button navigates.
  const onSelect = (b: Body, pointerType: string) => {
    if (b.kind === 'sun' && pointerType !== 'touch') {
      navigate(sectionById(b.sectionId).route)
    } else {
      setPinned((cur) => (cur?.key === b.key ? null : b))
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Starfield />
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />

      {/* Title overlay */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
        <div className="text-[10px] tracking-[0.4em] text-dim sm:text-[11px]">PERSONAL OPERATING SYSTEM</div>
        <h1 className="font-display text-2xl tracking-wider text-text sm:text-4xl lg:text-5xl">
          THE <span className="text-accent">CONSTELLATION</span>
        </h1>
        <div className="mt-1 hidden max-w-md text-xs text-dim sm:block">
          Eight sections, ten projects — one map. Hover a body to read it, click a sun to enter.
        </div>
      </div>

      <Constellation activeKey={activeKey} onHover={setHover} onSelect={onSelect} />

      {/* Up Next agenda — appointments + timed tasks, shared with the Calendar */}
      <HomeAgenda />

      {/* Hint (desktop only — touch users get the tap-to-select panel) */}
      <div className="pointer-events-none absolute bottom-6 left-6 z-10 hidden items-center gap-2 text-[11px] text-dim lg:flex">
        <MousePointerClick size={13} /> hover = preview · click sun = open · click planet = pin
      </div>

      {/* Info readout panel */}
      <InfoPanel body={shown} onOpen={() => shown && navigate(sectionById(shown.sectionId).route)} />
    </div>
  )
}

function InfoPanel({ body, onOpen }: { body: Body | null; onOpen: () => void }) {
  const section = body ? sectionById(body.sectionId) : null
  const project = body?.projectId ? projectById(body.projectId) : undefined

  return (
    <div className="absolute bottom-4 left-4 right-4 z-10 sm:bottom-6 sm:left-auto sm:right-6 sm:w-[320px]">
      <div
        className="hud-corners relative border bg-panel/85 p-4 backdrop-blur-md transition-all"
        style={{ borderColor: body ? `${body.accent}55` : '#1f2733', color: body?.accent ?? '#1f2733' }}
      >
        {!body ? (
          <div className="text-xs text-dim">
            <div className="label mb-2 text-dim">READOUT</div>
            Point at a star to inspect a section or project.
          </div>
        ) : project ? (
          <div className="animate-fade-in">
            <div className="mb-1 flex items-center justify-between">
              <span className="label" style={{ color: body.accent }}>
                PROJECT · {section?.label}
              </span>
              <span
                className="flex items-center gap-1 text-[10px] uppercase tracking-wider"
                style={{ color: STATUS_META[project.status].color }}
              >
                <StatusDot color={STATUS_META[project.status].color} size={6} />
                {STATUS_META[project.status].label}
              </span>
            </div>
            <h3 className="font-display text-lg text-text">{project.name}</h3>
            <p className="mt-1 text-xs text-dim">{project.tagline}</p>
            <div className="mt-3 space-y-1.5 text-xs">
              <Row label="NEXT" value={project.nextMove} />
              <Row label="LAST" value={project.lastMove} />
            </div>
            <button
              onClick={onOpen}
              className="mt-3 flex w-full items-center justify-center gap-2 border border-line py-2 text-xs uppercase tracking-wider text-text transition-colors hover:border-accent/60 hover:text-accent"
            >
              View in {section?.label} <ArrowRight size={13} />
            </button>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="label mb-1" style={{ color: body.accent }}>
              SECTION · {section?.code}
            </div>
            <h3 className="font-display text-xl" style={{ color: body.accent }}>
              {section?.label}
            </h3>
            <p className="mt-2 text-xs text-dim">{section?.blurb}</p>
            <button
              onClick={onOpen}
              className="mt-3 flex w-full items-center justify-center gap-2 border py-2 text-xs uppercase tracking-wider transition-colors"
              style={{ borderColor: `${body.accent}55`, color: body.accent }}
            >
              Enter <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-9 shrink-0 text-[10px] tracking-wider text-dim">{label}</span>
      <span className="text-text/80">{value}</span>
    </div>
  )
}
