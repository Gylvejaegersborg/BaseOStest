/** Lightens (positive `amount`) or darkens (negative) a hex color by mixing
 *  it toward white or black. Used to derive tonal depth (a lighter
 *  highlight, a deeper shadow) from a single passed accent color instead
 *  of flat single-tone fills/glows — real variation within one hue rather
 *  than a second, unrelated color. `amount` is roughly -1..1. */
export function shade(hex: string, amount: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const mix = (c: number) => (amount > 0 ? c + (255 - c) * amount : c * (1 + amount))
  const toHex = (c: number) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`
}
