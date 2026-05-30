const STYLES = ['bands', 'waves', 'blobs', 'burst', 'grid'] as const
type Style = (typeof STYLES)[number]

/**
 * Generates a procedural cover-art canvas from the beat's gradient + title.
 * Picks one of five styles based on a hash of the beat's id so every mock
 * track gets a distinct, deterministic visual identity — no external image
 * required. Returns the raw HTMLCanvasElement so callers can render it
 * however they like (background-image data URL, OffscreenCanvas, etc).
 */
export function generateLabelCanvas(
  gradient: [string, string],
  title: string,
  id: string = title,
): HTMLCanvasElement {
  const size = 768
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const seed = fnv1a(id)
  const rand = mulberry32(seed)
  const style: Style = STYLES[seed % STYLES.length]

  drawRadialBase(ctx, size, gradient)
  switch (style) {
    case 'bands':
      drawBands(ctx, size, gradient, rand)
      break
    case 'waves':
      drawWaves(ctx, size, gradient, rand)
      break
    case 'blobs':
      drawBlobs(ctx, size, gradient, rand)
      break
    case 'burst':
      drawBurst(ctx, size, gradient, rand)
      break
    case 'grid':
      drawGrid(ctx, size, gradient, rand)
      break
  }
  // Note: the title is *not* painted into the artwork — the floating glassy
  // TitleOverlay handles it. Painting it here gets covered by the bottom
  // transport panel and reads as half-hidden text behind the player.
  return canvas
}

/** Convenience: convert the procedural artwork to a data URL ready for CSS. */
export function generateLabelDataURL(
  gradient: [string, string],
  title: string,
  id: string = title,
): string {
  return generateLabelCanvas(gradient, title, id).toDataURL('image/jpeg', 0.9)
}

// ── Shared layers ─────────────────────────────────────────────────────────────

function drawRadialBase(ctx: CanvasRenderingContext2D, size: number, gradient: [string, string]) {
  // Diagonal base — feels less "label", more "cover".
  const g = ctx.createLinearGradient(0, 0, size, size)
  g.addColorStop(0, gradient[0])
  g.addColorStop(1, gradient[1])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
}

// ── Procedural styles ─────────────────────────────────────────────────────────

function drawBands(ctx: CanvasRenderingContext2D, size: number, gradient: [string, string], rand: () => number) {
  ctx.save()
  ctx.translate(size / 2, size / 2)
  const bandCount = 7 + Math.floor(rand() * 5)
  const maxR = size * 0.7
  for (let i = bandCount; i > 0; i--) {
    const r = (i / bandCount) * maxR
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fillStyle = i % 2 === 0 ? gradient[0] : gradient[1]
    ctx.globalAlpha = 0.08 + rand() * 0.14
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawWaves(ctx: CanvasRenderingContext2D, size: number, gradient: [string, string], rand: () => number) {
  ctx.save()
  const waves = 6 + Math.floor(rand() * 4)
  for (let i = 0; i < waves; i++) {
    const amp = 24 + rand() * 60
    const freq = 0.008 + rand() * 0.018
    const phase = rand() * Math.PI * 2
    const y = (i / waves) * size + size * 0.05
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= size; x += 6) {
      ctx.lineTo(x, y + Math.sin(x * freq + phase) * amp)
    }
    ctx.lineTo(size, size)
    ctx.lineTo(0, size)
    ctx.closePath()
    ctx.fillStyle = i % 2 === 0 ? gradient[0] : gradient[1]
    ctx.globalAlpha = 0.16 + rand() * 0.14
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawBlobs(ctx: CanvasRenderingContext2D, size: number, gradient: [string, string], rand: () => number) {
  ctx.save()
  const blobs = 6 + Math.floor(rand() * 5)
  for (let i = 0; i < blobs; i++) {
    const cx = rand() * size
    const cy = rand() * size
    const radius = size * (0.18 + rand() * 0.28)
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    g.addColorStop(0, hexWithAlpha(i % 2 === 0 ? gradient[0] : gradient[1], 0.55))
    g.addColorStop(1, hexWithAlpha(i % 2 === 0 ? gradient[0] : gradient[1], 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawBurst(ctx: CanvasRenderingContext2D, size: number, gradient: [string, string], rand: () => number) {
  ctx.save()
  ctx.translate(size / 2, size / 2)
  const rays = 36 + Math.floor(rand() * 30)
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2 + rand() * 0.08
    const len = size * (0.25 + rand() * 0.5)
    const width = 1 + rand() * 5
    const grad = ctx.createLinearGradient(0, 0, Math.cos(angle) * len, Math.sin(angle) * len)
    grad.addColorStop(0, hexWithAlpha(gradient[0], 0.5))
    grad.addColorStop(1, hexWithAlpha(gradient[1], 0))
    ctx.strokeStyle = grad
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len)
    ctx.stroke()
  }
  ctx.restore()
}

function drawGrid(ctx: CanvasRenderingContext2D, size: number, gradient: [string, string], rand: () => number) {
  ctx.save()
  const step = 38 + Math.floor(rand() * 16)
  ctx.strokeStyle = hexWithAlpha(gradient[0], 0.22)
  ctx.lineWidth = 1
  for (let x = 0; x <= size; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, size)
    ctx.stroke()
  }
  for (let y = 0; y <= size; y += step) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(size, y)
    ctx.stroke()
  }
  const dots = 14 + Math.floor(rand() * 12)
  ctx.fillStyle = hexWithAlpha(gradient[0], 0.65)
  for (let i = 0; i < dots; i++) {
    const x = Math.round((rand() * size) / step) * step
    const y = Math.round((rand() * size) / step) * step
    ctx.beginPath()
    ctx.arc(x, y, 3 + rand() * 4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function fnv1a(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hexWithAlpha(hex: string, a: number): string {
  const m = hex.replace('#', '')
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}
