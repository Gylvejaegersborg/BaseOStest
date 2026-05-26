import { useEffect, useMemo, useRef, useState } from 'react'

function seededBars(seed: string, count: number): number[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let x = h >>> 0
  const bars: number[] = []
  for (let i = 0; i < count; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0
    const n = x / 0xffffffff
    const env = 0.45 + 0.55 * Math.sin((i / count) * Math.PI)
    bars.push(0.18 + n * env * 0.82)
  }
  return bars
}

const LOOP_MS = 4000

export function Waveform({ seed, playing, count = 48 }: { seed: string; playing: boolean; count?: number }) {
  const heights = useMemo(() => seededBars(seed, count), [seed, count])
  const [progress, setProgress] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!playing) {
      setProgress(0)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      setProgress(((now - start) % LOOP_MS) / LOOP_MS)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [playing])

  return (
    <div className="flex h-8 items-center gap-[2px]">
      {heights.map((h, i) => {
        const active = playing && i / heights.length <= progress
        return (
          <span
            key={i}
            className="flex-1 rounded-full"
            style={{
              height: `${Math.round(h * 100)}%`,
              background: active ? '#CCFF00' : '#2A2A33',
              transition: 'background 90ms linear',
            }}
          />
        )
      })}
    </div>
  )
}
