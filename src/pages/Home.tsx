import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, MousePointerClick, X, ChevronRight } from 'lucide-react'
import { Starfield } from '@/features/constellation/Starfield'
import { ConstellationScene } from '@/features/constellation/ConstellationScene'
import { buildBodies, toSceneVec3, type Body } from '@/features/constellation/layout'
import { detectWebGL } from '@/features/constellation/webgl'
import { sectionById } from '@/data/sections'
import { PROJECTS, projectById } from '@/data/projects'
import { useOsOverlay, mergeById } from '@/features/team/osOverlay'
import { useProjectOverrides, applyOverrides } from '@/features/projects/overrides'
import { ProjectDetailBody } from '@/features/projects/ProjectDetailBody'
import { HomeAgenda } from '@/features/calendar/HomeAgenda'

/** Navigation state the Kanban board (or anything else) can pass in when
 *  linking back to the constellation: focus a specific project's planet, or
 *  fall back to just entering that section's sun. */
interface HomeFocusState {
  focusProjectId?: string
  focusSectionId?: string
}

export function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const [hover, setHover] = useState<Body | null>(null)
  const [pinned, setPinned] = useState<Body | null>(null)
  const consumedNavFocus = useRef(false)
  // The 3D scene renders its own opaque canvas background once loaded, which
  // fully covers the DOM starfield behind it — so only pay for that canvas's
  // running rAF loop (nebula drift + shooting stars) when it will actually
  // be visible, i.e. the WebGL fallback path.
  const webglOk = useMemo(() => detectWebGL(), [])

  // Same overrides store the Projects Kanban popup writes to, so editing a
  // project's last/next move or progress from either surface stays in sync.
  const { overrides, updateProject } = useProjectOverrides()
  const overlay = useOsOverlay()
  const overlayProjects = useMemo(
    () => mergeById(PROJECTS, overlay.projects as typeof PROJECTS),
    [overlay.projects],
  )

  // One-time: if we were navigated here with a focus request (e.g. the Kanban
  // board's "view in constellation" breadcrumb), pin that body so the HUD
  // panel opens and the camera flies to it, same as a manual click would.
  useEffect(() => {
    if (consumedNavFocus.current) return
    const state = location.state as HomeFocusState | null
    if (!state?.focusProjectId && !state?.focusSectionId) return
    consumedNavFocus.current = true
    const { suns, planets } = buildBodies()
    const target =
      (state.focusProjectId && planets.find((p) => p.projectId === state.focusProjectId)) ||
      (state.focusSectionId && suns.find((s) => s.sectionId === state.focusSectionId))
    if (target) setPinned(target)
    // Clear the nav state so revisiting "/" later (e.g. via back button)
    // doesn't re-trigger the same focus.
    navigate(location.pathname, { replace: true, state: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const shown = hover ?? pinned
  const activeKey = hover?.key ?? pinned?.key ?? null
  // Fly the 3D camera toward whatever body is pinned (a real selection, not
  // a passing hover) so opening the HUD panel also feels like it's docking
  // the camera onto that body rather than leaving the view static.
  const focusTarget = pinned ? toSceneVec3(pinned) : null

  // On a mouse, clicking a sun jumps straight in. On touch there is no hover,
  // so a tap selects the body and shows its panel; the panel's button navigates.
  const onSelect = (b: Body, pointerType: string) => {
    if (b.kind === 'sun' && pointerType !== 'touch') {
      navigate(sectionById(b.sectionId).route)
    } else {
      setPinned((cur) => (cur?.key === b.key ? null : b))
    }
  }

  // Resolve the shown body's project through the overlay + overrides so the
  // HUD reflects any agent-written overlay data and any user edit made here
  // or on the Kanban board, same as the Projects page.
  const shownProject = shown?.projectId
    ? applyOverrides(
        [overlayProjects.find((p) => p.id === shown.projectId) ?? projectById(shown.projectId)!],
        overrides,
      )[0]
    : undefined

  return (
    <div className="relative h-full w-full overflow-hidden">
      {!webglOk && <Starfield />}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />

      {/* Title overlay */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
        <div className="text-[10px] tracking-[0.4em] text-dim sm:text-[11px]">PERSONAL OPERATING SYSTEM</div>
        <h1 className="font-display text-2xl tracking-wider text-text sm:text-4xl lg:text-5xl">
          THE <span className="text-accent">CONSTELLATION</span>
        </h1>
        <div className="mt-1 hidden max-w-md text-xs text-dim sm:block">
          Nine sections, ten projects — one map. Hover a body to read it, click a sun to enter.
        </div>
      </div>

      <ConstellationScene activeKey={activeKey} focusTarget={focusTarget} onHover={setHover} onSelect={onSelect} />

      {/* Up Next agenda — appointments + timed tasks, shared with the Calendar */}
      <HomeAgenda />

      {/* Hint (desktop only — touch users get the tap-to-select panel) */}
      <div className="pointer-events-none absolute bottom-6 left-6 z-10 hidden items-center gap-2 text-[11px] text-dim lg:flex">
        <MousePointerClick size={13} /> hover = preview · click sun = open · click planet = pin
      </div>

      {/* Right-docked HUD panel — scene stays full width behind it */}
      <HudPanel
        body={shown}
        project={shownProject}
        pinned={!!pinned}
        onOpen={() => shown && navigate(sectionById(shown.sectionId).route)}
        onClose={() => setPinned(null)}
        onUpdateProject={(patch) => shownProject && updateProject(shownProject.id, patch)}
      />
    </div>
  )
}

function HudPanel({
  body,
  project,
  pinned,
  onOpen,
  onClose,
  onUpdateProject,
}: {
  body: Body | null
  project: ReturnType<typeof applyOverrides>[number] | undefined
  pinned: boolean
  onOpen: () => void
  onClose: () => void
  onUpdateProject: (patch: { lastMove?: string; nextMove?: string; progress?: number }) => void
}) {
  const section = body ? sectionById(body.sectionId) : null
  const open = !!body

  return (
    <div
      className={`absolute inset-y-0 right-0 z-10 flex w-full flex-col border-l border-line bg-panel/90 shadow-glow backdrop-blur-md transition-transform duration-200 ease-out sm:w-[360px] ${
        open ? 'translate-x-0' : 'pointer-events-none translate-x-full'
      }`}
      style={{ borderLeftColor: body ? `${body.accent}55` : undefined }}
    >
      {!body ? (
        <div className="p-4 text-xs text-dim">
          <div className="label mb-2 text-dim">READOUT</div>
          Point at a star to inspect a section or project.
        </div>
      ) : (
        <div key={body.key} className="flex h-full flex-col animate-fade-in">
          {/* Breadcrumb + close, Jira-card style header — same treatment as
           *  the Projects Kanban popup's header for cross-page consistency. */}
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <button
              onClick={onOpen}
              className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-dim transition-colors hover:text-accent"
            >
              {section?.code}
              {project && (
                <>
                  <ChevronRight size={11} className="text-dim/60" />
                  <span style={{ color: body.accent }}>{section?.label}</span>
                </>
              )}
            </button>
            {pinned && (
              <button onClick={onClose} className="text-dim transition-colors hover:text-text">
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {project ? (
              <ProjectDetailBody
                project={project}
                accent={body.accent}
                onUpdate={onUpdateProject}
                progressControl="readout"
              />
            ) : (
              <>
                <div className="label mb-1" style={{ color: body.accent }}>
                  SECTION · {section?.code}
                </div>
                <h3 className="font-display text-xl" style={{ color: body.accent }}>
                  {section?.label}
                </h3>
                <p className="mt-2 text-xs text-dim">{section?.blurb}</p>
              </>
            )}
          </div>

          <div className="border-t border-line p-4">
            <button
              onClick={onOpen}
              className="flex w-full items-center justify-center gap-2 border py-2 text-xs uppercase tracking-wider transition-colors"
              style={{ borderColor: `${body.accent}55`, color: body.accent }}
            >
              {project ? `View in ${section?.label}` : 'Enter'} <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
