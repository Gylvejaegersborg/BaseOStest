import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Starfield } from '@/features/constellation/Starfield'
import { ConstellationScene } from '@/features/constellation/ConstellationScene'
import type { Body } from '@/features/constellation/layout'
import { detectWebGL } from '@/features/constellation/webgl'
import { sectionById } from '@/data/sections'
import { HomeTimeline } from '@/features/calendar/HomeTimeline'

export function Home() {
  const navigate = useNavigate()
  const [hover, setHover] = useState<Body | null>(null)
  // The 3D scene renders its own opaque canvas background once loaded, which
  // fully covers the DOM starfield behind it — so only pay for that canvas's
  // running rAF loop (nebula drift + shooting stars) when it will actually
  // be visible, i.e. the WebGL fallback path.
  const webglOk = useMemo(() => detectWebGL(), [])

  // No side panel: hovering just highlights a body (its label shows in the
  // scene). Clicking/tapping a sun enters its section; a planet opens that
  // project's popup on the Projects page.
  const onSelect = (b: Body) => {
    if (b.kind === 'planet' && b.projectId) navigate(`/projects?project=${encodeURIComponent(b.projectId)}`)
    else navigate(sectionById(b.sectionId).route)
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {!webglOk && <Starfield />}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />

      {/* Title overlay */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
        <div className="text-[10px] tracking-[0.4em] text-dim sm:text-[11px]">BASESPACE</div>
        <h1 className="font-display text-2xl tracking-wider text-text sm:text-4xl lg:text-5xl">
          THE{' '}
          <span className="bg-gradient-to-r from-accent-3 via-accent-4 to-violet-4 bg-clip-text text-transparent">
            CONSTELLATION
          </span>
        </h1>
      </div>

      <ConstellationScene activeKey={hover?.key ?? null} focusTarget={null} onHover={setHover} onSelect={onSelect} />

      {/* Up Next — a slim timeline strip along the bottom, clear of the suns */}
      <HomeTimeline />
    </div>
  )
}
