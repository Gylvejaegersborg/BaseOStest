import { Suspense, lazy, useMemo } from 'react'
import { Constellation } from './Constellation'
import { detectWebGL } from './webgl'
import type { Body } from './layout'

const Scene3D = lazy(() => import('./Scene3D').then((m) => ({ default: m.Scene3D })))

interface Props {
  activeKey: string | null
  focusTarget: [number, number, number] | null
  onHover: (b: Body | null) => void
  onSelect: (b: Body, pointerType: string) => void
}

/** Entry point for the constellation visual. Tries the 3D scene (code-split so
 *  the rest of the app's first paint isn't dragged down by three.js); falls
 *  back to the original flat SVG constellation when WebGL isn't available. */
export function ConstellationScene({ activeKey, focusTarget, onHover, onSelect }: Props) {
  const webglOk = useMemo(() => detectWebGL(), [])

  if (!webglOk) {
    return <Constellation activeKey={activeKey} onHover={onHover} onSelect={onSelect} />
  }

  return (
    <Suspense fallback={<Constellation activeKey={activeKey} onHover={onHover} onSelect={onSelect} />}>
      <Scene3D activeKey={activeKey} focusTarget={focusTarget} onHover={onHover} onSelect={onSelect} />
    </Suspense>
  )
}
