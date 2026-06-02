import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  r: number
  tw: number // twinkle phase
  sp: number // twinkle speed
  vx: number // drift velocity (px/sec)
  vy: number
}

interface Shooter {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
}

export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let stars: Star[] = []
    let shooters: Shooter[] = []
    let w = 0
    let h = 0
    let t0 = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.floor((w * h) / 4500)
      stars = Array.from({ length: count }, () => {
        const r = Math.random() * 1.3 + 0.2
        const angle = Math.random() * Math.PI * 2
        // Bigger stars (closer) drift a touch faster for a subtle parallax feel.
        const speed = 0.6 + (r / 1.5) * 4
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r,
          tw: Math.random() * Math.PI * 2,
          sp: Math.random() * 0.6 + 0.2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
        }
      })
    }

    let last = 0
    const draw = (now: number) => {
      if (!last) last = now
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      t0 += dt
      ctx.clearRect(0, 0, w, h)

      // Two faint, slowly-drifting nebula blobs as a backdrop layer.
      drawNebula(ctx, w, h, t0, '#36e0c8', 0.6, 0.42, 0.05)
      drawNebula(ctx, w, h, t0 + 7.3, '#e0408a', 0.35, 0.7, 0.045)

      // Stars: drift + wrap + twinkle.
      for (const s of stars) {
        s.x += s.vx * dt
        s.y += s.vy * dt
        if (s.x < -2) s.x = w + 2
        else if (s.x > w + 2) s.x = -2
        if (s.y < -2) s.y = h + 2
        else if (s.y > h + 2) s.y = -2

        s.tw += dt * s.sp * 2
        const a = 0.35 + 0.45 * Math.sin(s.tw)
        ctx.globalAlpha = Math.max(0.05, a)
        ctx.fillStyle = s.r > 1 ? '#9fe9dd' : '#c8d2dc'
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Occasionally spawn a shooting star.
      if (Math.random() < 0.005) {
        const angle = Math.PI * (0.15 + Math.random() * 0.2)
        const speed = 480 + Math.random() * 260
        shooters.push({
          x: Math.random() * w * 0.5 - 80,
          y: Math.random() * h * 0.5 - 40,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          max: 1.1,
        })
      }
      for (const sh of shooters) {
        sh.x += sh.vx * dt
        sh.y += sh.vy * dt
        sh.life += dt
        const t = sh.life / sh.max
        const headA = Math.max(0, 1 - t)
        const mag = Math.hypot(sh.vx, sh.vy) || 1
        const tailLen = 90
        const tx = sh.x - (sh.vx / mag) * tailLen
        const ty = sh.y - (sh.vy / mag) * tailLen
        const grad = ctx.createLinearGradient(tx, ty, sh.x, sh.y)
        grad.addColorStop(0, 'rgba(54,224,200,0)')
        grad.addColorStop(1, `rgba(180,240,230,${headA})`)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(sh.x, sh.y)
        ctx.stroke()
        ctx.fillStyle = `rgba(255,255,255,${headA})`
        ctx.beginPath()
        ctx.arc(sh.x, sh.y, 1.4, 0, Math.PI * 2)
        ctx.fill()
      }
      shooters = shooters.filter((sh) => sh.life < sh.max && sh.x < w + 140 && sh.y < h + 140)

      raf = requestAnimationFrame(draw)
    }

    resize()
    raf = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />
}

function drawNebula(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  color: string,
  baseX: number,
  baseY: number,
  alpha: number,
) {
  const cx = w * (baseX + 0.06 * Math.sin(t * 0.05))
  const cy = h * (baseY + 0.05 * Math.cos(t * 0.04))
  const radius = Math.max(w, h) * 0.55
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
  const c = hexToRgb(color)
  grad.addColorStop(0, `rgba(${c},${alpha})`)
  grad.addColorStop(1, `rgba(${c},0)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

function hexToRgb(hex: string): string {
  const v = parseInt(hex.slice(1), 16)
  return `${(v >> 16) & 255},${(v >> 8) & 255},${v & 255}`
}
