import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import type { Beat } from '@/data/beats'
import { Disc } from './Disc'
import { VisualiserRing } from './VisualiserRing'
import { Hands } from './Hands'
import { useCDSwap, swapEasings } from './useCDSwap'

interface CDPlayerProps {
  current: Beat | null
  playing: boolean
  swapToken: number
  analyserRef: React.MutableRefObject<AnalyserNode | null>
}

/**
 * Top-down 3D CD player: a spinning disc with the beat's artwork, a colour
 * audio-reactive visualiser ring, and friendly robot/alien hands that swap
 * the CD on track change.
 */
export function CDPlayer({ current, playing, swapToken, analyserRef }: CDPlayerProps) {
  const swap = useCDSwap(current, swapToken)

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 5.6, 0.001], fov: 38, near: 0.1, far: 50 }}
      gl={{ alpha: true, antialias: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 6, 2]} intensity={1.1} castShadow color="#FFE6C2" />
      <directionalLight position={[-4, 4, -2]} intensity={0.5} color="#B6A8FF" />
      <pointLight position={[0, 2, 0]} intensity={0.4} color="#CCFF00" />

      <Suspense fallback={null}>
        {/* Incoming / steady disc */}
        {swap.incoming && (
          <Disc
            beat={swap.incoming}
            playing={playing && !swap.swapping}
            lift={swap.swapping ? swapEasings.incomingLift(swap.progress) : 0}
            opacity={swap.swapping ? swapEasings.incomingOpacity(swap.progress) : 1}
          />
        )}

        {/* Outgoing disc during a swap */}
        {swap.swapping && swap.outgoing && (
          <Disc
            beat={swap.outgoing}
            playing={false}
            lift={swapEasings.outgoingLift(swap.progress)}
            opacity={swapEasings.outgoingOpacity(swap.progress)}
          />
        )}
      </Suspense>

      <VisualiserRing analyserRef={analyserRef} playing={playing} />
      <Hands progress={swap.progress} swapping={swap.swapping} />
    </Canvas>
  )
}
