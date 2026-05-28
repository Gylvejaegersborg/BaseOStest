import { useEffect, useRef, useState } from 'react'
import type { Beat } from '@/data/beats'

const SWAP_MS = 850

export interface CDSwapState {
  /** True while a swap animation is running. */
  swapping: boolean
  /** Normalised swap progress 0..1. */
  progress: number
  /** Disc on its way out — null on first mount or after the swap completes. */
  outgoing: Beat | null
  /** Disc on its way in (or steady-state disc). */
  incoming: Beat | null
}

/**
 * Drives the dust-dissolve swap. Watches `swapToken` from the beat player —
 * each increment triggers an ~850ms choreography that lerps `progress` 0→1
 * while the outgoing/incoming beats are exposed for the renderers.
 */
export function useCDSwap(current: Beat | null, swapToken: number): CDSwapState {
  const [state, setState] = useState<CDSwapState>({ swapping: false, progress: 0, outgoing: null, incoming: current })
  const prevBeatRef = useRef<Beat | null>(current)
  const rafRef = useRef<number | null>(null)
  const tokenRef = useRef(swapToken)

  useEffect(() => {
    if (swapToken === tokenRef.current) {
      setState((s) => ({ ...s, incoming: current }))
      prevBeatRef.current = current
      return
    }
    tokenRef.current = swapToken

    const outgoing = prevBeatRef.current
    prevBeatRef.current = current

    if (!outgoing) {
      setState({ swapping: false, progress: 0, outgoing: null, incoming: current })
      return
    }

    setState({ swapping: true, progress: 0, outgoing, incoming: current })
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / SWAP_MS)
      setState((s) => ({ ...s, progress: p }))
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setState({ swapping: false, progress: 1, outgoing: null, incoming: current })
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [swapToken, current])

  return state
}

/**
 * Per-phase easings for the dust dissolve. `p` is 0..1 swap progress.
 *
 *   0.0 – 0.5  outgoing disc dissolves into dust (fading + slight rise)
 *   0.4 – 1.0  incoming disc materialises from dust (descending + fading in)
 */
export const swapEasings = {
  outgoingLift: (p: number): number => {
    if (p < 0.05) return 0
    if (p > 0.55) return 0.4
    return easeOutCubic((p - 0.05) / 0.5) * 0.4
  },
  outgoingOpacity: (p: number): number => {
    if (p < 0.05) return 1
    if (p > 0.5) return 0
    return 1 - (p - 0.05) / 0.45
  },
  incomingLift: (p: number): number => {
    if (p < 0.4) return 0.4
    if (p > 0.95) return 0
    return 0.4 * (1 - easeInCubic((p - 0.4) / 0.55))
  },
  incomingOpacity: (p: number): number => {
    if (p < 0.45) return 0
    if (p > 0.85) return 1
    return (p - 0.45) / 0.4
  },
  outgoingDust: (p: number): number => {
    if (p < 0 || p > 0.65) return 0
    return Math.sin((p / 0.65) * Math.PI)
  },
  incomingDust: (p: number): number => {
    if (p < 0.35 || p > 1) return 0
    return Math.sin(((p - 0.35) / 0.65) * Math.PI)
  },
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3)
}
function easeInCubic(x: number): number {
  const c = Math.max(0, Math.min(1, x))
  return c * c * c
}
