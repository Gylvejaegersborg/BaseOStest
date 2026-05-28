import * as THREE from 'three'

/**
 * Generates a CD-label canvas texture from a 2-stop gradient when no
 * cover image is provided for a beat.
 */
export function generateLabelTexture(gradient: [string, string], title: string): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Radial gradient base — feels like a printed label.
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.08, size / 2, size / 2, size * 0.55)
  g.addColorStop(0, gradient[0])
  g.addColorStop(1, gradient[1])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)

  // Concentric grooves so it reads as a disc, not a flat circle.
  ctx.globalCompositeOperation = 'overlay'
  for (let r = 80; r < size / 2; r += 6) {
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255,255,255,${0.03 + (r % 18 === 0 ? 0.05 : 0)})`
    ctx.lineWidth = 1
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'

  // Title block — small caps in the upper inner ring.
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

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
