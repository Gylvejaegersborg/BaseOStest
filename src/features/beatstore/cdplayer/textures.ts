import * as THREE from 'three'

const STYLES = ['bands', 'waves', 'blobs', 'burst', 'grid'] as const
type Style = (typeof STYLES)[number]

/**
 * Generates a CD-label canvas texture from the beat's gradient + title. Picks
 * one of five procedural artwork styles based on a hash of the beat's id so
 * every mock track has a distinct, repeatable visual identity — no external
 * cover image required.
 */
export function generateLabelTexture(
  gradient: [string, string],
  title: string,
  id: string = title,
): THREE.CanvasTexture {
  const size = 512
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
  drawGrooves(ctx, size)
  drawTitle(ctx, size, title)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// ── Shared layers ─────────────────────────────────────────────────────────────

function drawRadialBase(ctx: CanvasRenderingContext2D, size: number, gradient: [string, string]) {
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.08, size / 2, size / 2, size * 0.55)
  g.addColorStop(0, gradient[0])
  g.addColorStop(1, gradient[1])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
}

function drawGrooves(ctx: CanvasRenderingContext2D, size: number) {
  ctx.globalCompositeOperation = 'overlay'
  for (let r = 80; r < size / 2; r += 6) {
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255,255,255,${0.03 + (r % 18 === 0 ? 0.05 : 0)})`
    ctx.lineWidth = 1
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
}

function drawTitle(ctx: CanvasRenderingContext2D, size: number, title: string) {
  ctx.save()
  ctx.translate(size / 2, size / 2)
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.font = 'bold 26px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(title.toUpperCase(), 0, -size * 0.18)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = '14px ui-monospace, monospace'
  ctx.fillText('ISΛRK', 0, -size * 0.18 + 28)
  ctx.restore()
}

// ── Procedural styles ─────────────────────────────────────────────────────────

/** Concentric ring bands of alternating opacity — geometric/minimalist. */
function drawBands(ctx: CanvasRenderingContext2D, size: number, gradient: [string, string], rand: () => number) {
  ctx.save()
  ctx.translate(size / 2, size / 2)
  const bandCount = 6 + Math.floor(rand() * 4)
  const maxR = size * 0.46
  for (let i = bandCount; i > 0; i--) {
    const r = (i / bandCount) * maxR
    const alpha = 0.06 + rand() * 0.12
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fillStyle = i % 2 === 0 ? gradient[0] : gradient[1]
    ctx.globalAlpha = alpha
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

/** Stacked sinusoidal wave bands — flowing horizontal motion. */
function drawWaves(ctx: CanvasRenderingContext2D, size: number, gradient: [string, string], rand: () => number) {
  ctx.save()
  ctx.translate(size / 2, size / 2)
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.46, 0, Math.PI * 2)
  ctx.clip()

  const waves = 5 + Math.floor(rand() * 3)
  for (let i = 0; i < waves; i++) {
    const amp = 18 + rand() * 38
    const freq = 0.012 + rand() * 0.02
    const phase = rand() * Math.PI * 2
    const y = -size * 0.4 + (i / waves) * size * 0.8
    ctx.beginPath()
    ctx.moveTo(-size / 2, y)
    for (let x = -size / 2; x <= size / 2; x += 6) {
      ctx.lineTo(x, y + Math.sin(x * freq + phase) * amp)
    }
    ctx.lineTo(size / 2, size / 2)
    ctx.lineTo(-size / 2, size / 2)
    ctx.closePath()
    ctx.fillStyle = i % 2 === 0 ? gradient[0] : gradient[1]
    ctx.globalAlpha = 0.18 + rand() * 0.12
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

/** Soft overlapping blobs — fluid/organic. */
function drawBlobs(ctx: CanvasRenderingContext2D, size: number, gradient: [string, string], rand: () => number) {
  ctx.save()
  ctx.translate(size / 2, size / 2)
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.46, 0, Math.PI * 2)
  ctx.clip()

  const blobs = 5 + Math.floor(rand() * 4)
  for (let i = 0; i < blobs; i++) {
    const cx = (rand() - 0.5) * size * 0.7
    const cy = (rand() - 0.5) * size * 0.7
    const radius = size * (0.12 + rand() * 0.18)
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

/** Radial starburst lines — energy/explosion. */
function drawBurst(ctx: CanvasRenderingContext2D, size: number, gradient: [string, string], rand: () => number) {
  ctx.save()
  ctx.translate(size / 2, size / 2)
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.46, 0, Math.PI * 2)
  ctx.clip()

  const rays = 26 + Math.floor(rand() * 22)
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2 + rand() * 0.08
    const len = size * (0.18 + rand() * 0.32)
    const width = 1 + rand() * 4
    const grad = ctx.createLinearGradient(0, 0, Math.cos(angle) * len, Math.sin(angle) * len)
    grad.addColorStop(0, hexWithAlpha(gradient[0], 0.45))
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

/** Geometric grid + offset accent dots — structured/tech. */
function drawGrid(ctx: CanvasRenderingContext2D, size: number, gradient: [string, string], rand: () => number) {
  ctx.save()
  ctx.translate(size / 2, size / 2)
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.46, 0, Math.PI * 2)
  ctx.clip()

  const step = 28 + Math.floor(rand() * 12)
  ctx.strokeStyle = hexWithAlpha(gradient[0], 0.18)
  ctx.lineWidth = 1
  for (let x = -size / 2; x <= size / 2; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, -size / 2)
    ctx.lineTo(x, size / 2)
    ctx.stroke()
  }
  for (let y = -size / 2; y <= size / 2; y += step) {
    ctx.beginPath()
    ctx.moveTo(-size / 2, y)
    ctx.lineTo(size / 2, y)
    ctx.stroke()
  }
  const dots = 8 + Math.floor(rand() * 8)
  ctx.fillStyle = hexWithAlpha(gradient[0], 0.65)
  for (let i = 0; i < dots; i++) {
    const x = Math.round((rand() - 0.5) * size * 0.7 / step) * step
    const y = Math.round((rand() - 0.5) * size * 0.7 / step) * step
    ctx.beginPath()
    ctx.arc(x, y, 3 + rand() * 3, 0, Math.PI * 2)
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
