import { useEffect, useRef, useState } from 'react'
import type { Beat } from '@/data/beats'

const SWAP_MS = 700

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
 * Drives the hand-swap animation. Watches `swapToken` from the beat player —
 * each increment triggers a ~700ms choreography that lerps `progress` 0→1
 * while the outgoing/incoming beats are exposed for the renderers.
 */
export function useCDSwap(current: Beat | null, swapToken: number): CDSwapState {
  const [state, setState] = useState<CDSwapState>({ swapping: false, progress: 0, outgoing: null, incoming: current })
  const prevBeatRef = useRef<Beat | null>(current)
  const rafRef = useRef<number | null>(null)
  const tokenRef = useRef(swapToken)

  useEffect(() => {
    // First mount or token unchanged → just sync incoming.
    if (swapToken === tokenRef.current) {
      setState((s) => ({ ...s, incoming: current }))
      prevBeatRef.current = current
      return
    }
    tokenRef.current = swapToken

    const outgoing = prevBeatRef.current
    prevBeatRef.current = current

    // No previous beat → nothing to swap from; just snap in.
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
 * Easing helpers + per-phase getters. `p` is 0..1 overall swap progress.
 */
export const swapEasings = {
  outgoingLift: (p: number): number => {
    // Rises from 0 → 0.9 between 0.20 and 0.50, fades implicit.
    if (p < 0.2) return 0
    if (p > 0.55) return 0.9
    return easeOutCubic((p - 0.2) / 0.35) * 0.9
  },
  outgoingOpacity: (p: number): number => {
    if (p < 0.30) return 1
    if (p > 0.55) return 0
    return 1 - (p - 0.30) / 0.25
  },
  incomingLift: (p: number): number => {
    // Drops in from 0.9 → 0 between 0.45 and 0.75.
    if (p < 0.45) return 0.9
    if (p > 0.75) return 0
    return 0.9 * (1 - easeInCubic((p - 0.45) / 0.3))
  },
  incomingOpacity: (p: number): number => {
    if (p < 0.40) return 0
    if (p > 0.60) return 1
    return (p - 0.40) / 0.2
  },
  handsApproach: (p: number): number => {
    // 0 = off-stage, 1 = grip pose.
    if (p < 0) return 0
    if (p > 1) return 0
    // ramp in 0..0.18, hold to 0.78, ramp out to 1.
    if (p < 0.18) return easeOutCubic(p / 0.18)
    if (p < 0.78) return 1
    return 1 - easeInCubic((p - 0.78) / 0.22)
  },
  handsLift: (p: number): number => {
    // Hands rise with the outgoing disc, dip down with the incoming.
    return swapEasings.outgoingLift(p) * 0.7 + swapEasings.incomingLift(p) * 0.3
  },
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3)
}
function easeInCubic(x: number): number {
  const c = Math.max(0, Math.min(1, x))
  return c * c * c
}
