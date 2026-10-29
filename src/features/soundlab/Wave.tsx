import { useEffect, useRef } from 'react'
import { soundUrl } from './soundlabClient'

/** Draws the sound's shape (decoded in the browser, from the same URL that plays). */
export function Wave({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let cancelled = false
    const canvas = ref.current
    if (!canvas) return
    const ctx2d = canvas.getContext('2d')
    ctx2d?.clearRect(0, 0, canvas.width, canvas.height)
    ;(async () => {
      try {
        const buf = await (await fetch(soundUrl(id))).arrayBuffer()
        const audio = await new AudioContext().decodeAudioData(buf)
        if (cancelled || !ctx2d) return
        const data = audio.getChannelData(0)
        const bars = 96
        const step = Math.max(1, Math.floor(data.length / bars))
        const { width, height } = canvas
        ctx2d.clearRect(0, 0, width, height)
        ctx2d.fillStyle = '#36e0c8'
        for (let b = 0; b < bars; b++) {
          let peak = 0
          for (let i = b * step; i < (b + 1) * step && i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]!))
          const h = Math.max(2, peak * (height - 6))
          ctx2d.fillRect(b * (width / bars) + 1, (height - h) / 2, width / bars - 2, h)
        }
      } catch {
        /* the player still works without the picture */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])
  return <canvas ref={ref} width={480} height={120} className="h-24 w-full opacity-90" aria-hidden />
}
