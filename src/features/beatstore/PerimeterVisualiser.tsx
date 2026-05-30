import { useEffect, useRef } from 'react'

interface PerimeterVisualiserProps {
  analyserRef: React.MutableRefObject<AnalyserNode | null>
  playing: boolean
  /** Padding (px) between the canvas edge and the inner card edge. */
  pad: number
  /** Card border radius (px) — used so bars trace the rounded corners cleanly. */
  cornerRadius: number
  /** Maximum bar length (px). Defaults to `pad - 4` so bars never overflow. */
  maxBarLen?: number
}

const BAR_COUNT = 360
const BAR_WIDTH = 3

/**
 * Rainbow audio-reactive bars around the perimeter of the Now Playing card.
 * Implemented as a single 2D canvas overlay sized to the card+padding box;
 * each bar is positioned along the rounded-rectangle border of the inner card
 * and extends outward perpendicular to the local tangent.
 *
 * Driven directly from the player's AnalyserNode via getByteFrequencyData on
 * every frame. Bins are mirrored across the perimeter so the visualiser looks
 * symmetric around the card.
 */
export function PerimeterVisualiser({ analyserRef, playing, pad, cornerRadius, maxBarLen }: PerimeterVisualiserProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)

  const effectiveMax = Math.max(8, maxBarLen ?? pad - 4)
  const effectiveMin = Math.max(2, Math.round(effectiveMax * 0.12))

  useEffect(() => {
    let raf = 0
    let t = 0

    const tick = () => {
      const canvas = canvasRef.current
      if (!canvas) {
        raf = requestAnimationFrame(tick)
        return
      }

      // Resize the backing store to physical pixels.
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const targetW = Math.round(rect.width * dpr)
      const targetH = Math.round(rect.height * dpr)
      if (canvas.width !== targetW) canvas.width = targetW
      if (canvas.height !== targetH) canvas.height = targetH

      const ctx = canvas.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, rect.width, rect.height)

      // Read analyser
      const an = analyserRef.current
      let data: Uint8Array<ArrayBuffer> | null = null
      if (an) {
        if (!dataRef.current || dataRef.current.length !== an.frequencyBinCount) {
          dataRef.current = new Uint8Array(new ArrayBuffer(an.frequencyBinCount))
        }
        an.getByteFrequencyData(dataRef.current)
        data = dataRef.current
      }

      t += 1 / 60
      const hueRot = (t * 0.08) % 1

      // Card box inside the canvas (centred, inset by `pad`).
      const cardX = pad
      const cardY = pad
      const cardW = rect.width - pad * 2
      const cardH = rect.height - pad * 2

      drawBars(ctx, cardX, cardY, cardW, cardH, cornerRadius, data, playing, t, hueRot, effectiveMin, effectiveMax)

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [analyserRef, playing, pad, cornerRadius, effectiveMin, effectiveMax])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  )
}

function drawBars(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cw: number,
  ch: number,
  radius: number,
  data: Uint8Array<ArrayBuffer> | null,
  playing: boolean,
  t: number,
  hueRot: number,
  barMin: number,
  barMax: number,
) {
  // Effective straight-edge lengths after corner radii are removed.
  const sH = Math.max(0, cw - 2 * radius)
  const sV = Math.max(0, ch - 2 * radius)
  const arc = (Math.PI * radius) / 2 // length of one quarter-circle corner
  const perim = 2 * sH + 2 * sV + 4 * arc

  for (let i = 0; i < BAR_COUNT; i++) {
    const half = BAR_COUNT / 2
    const binIdx = i < half ? i : BAR_COUNT - 1 - i
    let amp = 0
    if (data && data.length > 0) {
      amp = data[Math.floor((binIdx / half) * (data.length - 1))] / 255
    }
    const idle = (Math.sin(t * 1.8 + i * 0.21) * 0.5 + 0.5) * 0.16
    const target = playing ? Math.max(amp * 0.95, idle * 0.25) : idle
    const len = barMin + target * (barMax - barMin)

    const { x, y, nx, ny } = positionOnRoundedRect(
      (i / BAR_COUNT) * perim,
      cx, cy, cw, ch, radius, sH, sV, arc,
    )

    const hue = (i / BAR_COUNT + hueRot) % 1
    const sat = 0.85
    const light = 0.55 + target * 0.18
    ctx.fillStyle = `hsl(${hue * 360}, ${sat * 100}%, ${light * 100}%)`

    // Draw bar from edge outward along the outward normal.
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(Math.atan2(ny, nx) - Math.PI / 2)
    ctx.fillRect(-BAR_WIDTH / 2, 0, BAR_WIDTH, len)
    ctx.restore()
  }
}

/**
 * Walks `pos` units around the perimeter of a rounded rectangle starting at
 * the top-left corner's top-edge entry point, returning the (x, y) point on
 * the border and the outward-pointing unit normal (nx, ny) at that point.
 */
function positionOnRoundedRect(
  pos: number,
  cx: number,
  cy: number,
  cw: number,
  ch: number,
  r: number,
  sH: number,
  sV: number,
  arc: number,
): { x: number; y: number; nx: number; ny: number } {
  // Segments, in order, starting after the top-left corner's "exit":
  // 1) top edge (sH)
  // 2) top-right corner (arc)
  // 3) right edge (sV)
  // 4) bottom-right corner (arc)
  // 5) bottom edge (sH)
  // 6) bottom-left corner (arc)
  // 7) left edge (sV)
  // 8) top-left corner (arc)
  let p = pos
  if (p < sH) {
    const x = cx + r + p
    const y = cy
    return { x, y, nx: 0, ny: -1 }
  }
  p -= sH
  if (p < arc) {
    const a = -Math.PI / 2 + (p / arc) * (Math.PI / 2)
    const x = cx + cw - r + Math.cos(a) * r
    const y = cy + r + Math.sin(a) * r
    return { x, y, nx: Math.cos(a), ny: Math.sin(a) }
  }
  p -= arc
  if (p < sV) {
    const x = cx + cw
    const y = cy + r + p
    return { x, y, nx: 1, ny: 0 }
  }
  p -= sV
  if (p < arc) {
    const a = (p / arc) * (Math.PI / 2)
    const x = cx + cw - r + Math.cos(a) * r
    const y = cy + ch - r + Math.sin(a) * r
    return { x, y, nx: Math.cos(a), ny: Math.sin(a) }
  }
  p -= arc
  if (p < sH) {
    const x = cx + cw - r - p
    const y = cy + ch
    return { x, y, nx: 0, ny: 1 }
  }
  p -= sH
  if (p < arc) {
    const a = Math.PI / 2 + (p / arc) * (Math.PI / 2)
    const x = cx + r + Math.cos(a) * r
    const y = cy + ch - r + Math.sin(a) * r
    return { x, y, nx: Math.cos(a), ny: Math.sin(a) }
  }
  p -= arc
  if (p < sV) {
    const x = cx
    const y = cy + ch - r - p
    return { x, y, nx: -1, ny: 0 }
  }
  p -= sV
  // top-left corner
  const a = Math.PI + (p / arc) * (Math.PI / 2)
  const x = cx + r + Math.cos(a) * r
  const y = cy + r + Math.sin(a) * r
  return { x, y, nx: Math.cos(a), ny: Math.sin(a) }
}
