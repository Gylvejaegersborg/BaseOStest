// Pure parsers behind the direct answers: calculator, unit conversion,
// durations and colours. No eval — the calculator is a small recursive-
// descent parser, so a query can never run code.

/** Evaluate an arithmetic expression, or null if it isn't one. Accepts a
 *  comma as decimal separator ("2,5*4"), ^ for powers, % as /100, and
 *  sqrt/pi. A bare number is not an expression (nothing to answer). */
export function calculate(input: string): number | null {
  const src = input.trim().replace(/^=/, '').replace(/(\d),(\d)/g, '$1.$2').replace(/\s+/g, '').toLowerCase()
  if (!src || !/[+\-*/^%()]|sqrt|pi/.test(src) || /^-?\d+(\.\d+)?$/.test(src)) return null
  let i = 0
  const peek = () => src[i]
  const eat = (s: string) => (src.startsWith(s, i) ? ((i += s.length), true) : false)

  function expr(): number {
    let v = term()
    for (;;) {
      if (eat('+')) v += term()
      else if (eat('-')) v -= term()
      else return v
    }
  }
  function term(): number {
    let v = power()
    for (;;) {
      if (eat('*') || eat('x')) v *= power()
      else if (eat('/')) v /= power()
      else return v
    }
  }
  function power(): number {
    const base = unary()
    return eat('^') ? base ** power() : base
  }
  function unary(): number {
    if (eat('-')) return -unary()
    if (eat('+')) return unary()
    return postfix()
  }
  function postfix(): number {
    let v = atom()
    while (eat('%')) v /= 100
    return v
  }
  function atom(): number {
    if (eat('(')) {
      const v = expr()
      if (!eat(')')) throw new Error('paren')
      return v
    }
    if (eat('sqrt')) return Math.sqrt(atom())
    if (eat('pi')) return Math.PI
    const m = /^\d+(\.\d+)?|^\.\d+/.exec(src.slice(i))
    if (!m) throw new Error(`unexpected ${peek() ?? 'end'}`)
    i += m[0].length
    return parseFloat(m[0])
  }

  try {
    const v = expr()
    return i === src.length && Number.isFinite(v) ? v : null
  } catch {
    return null
  }
}

export function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString('en-US').replace(/,/g, ' ')
  return String(parseFloat(n.toPrecision(12)))
}

// Units: each maps to [dimension, factor to the base unit]. Temperature is
// affine, so it is handled on its own.
const UNITS: Record<string, [string, number]> = {
  mm: ['len', 0.001], cm: ['len', 0.01], m: ['len', 1], km: ['len', 1000],
  in: ['len', 0.0254], ft: ['len', 0.3048], yd: ['len', 0.9144], mi: ['len', 1609.344],
  g: ['mass', 0.001], kg: ['mass', 1], lb: ['mass', 0.45359237], oz: ['mass', 0.028349523125],
  ml: ['vol', 0.001], dl: ['vol', 0.1], l: ['vol', 1], gal: ['vol', 3.785411784], cup: ['vol', 0.2365882365],
  'km/h': ['speed', 1 / 3.6], 'm/s': ['speed', 1], mph: ['speed', 0.44704], kn: ['speed', 0.514444],
  b: ['data', 1], kb: ['data', 1e3], mb: ['data', 1e6], gb: ['data', 1e9], tb: ['data', 1e12],
  s: ['time', 1], min: ['time', 60], h: ['time', 3600], d: ['time', 86400],
}
const ALIASES: Record<string, string> = {
  meter: 'm', meters: 'm', km: 'km', miles: 'mi', mile: 'mi', inch: 'in', inches: 'in', feet: 'ft', foot: 'ft',
  kilo: 'kg', kilos: 'kg', pounds: 'lb', pound: 'lb', lbs: 'lb', liter: 'l', liters: 'l', litre: 'l',
  kmh: 'km/h', kph: 'km/h', knots: 'kn', sec: 's', hour: 'h', hours: 'h', day: 'd', days: 'd',
}
const TEMPS = new Set(['c', 'f', 'k'])

export interface Conversion {
  value: number
  from: string
  to: string
  result: number
}

/** "10 km to mi", "72f in c", "5,5 kg til lb". */
export function convert(input: string): Conversion | null {
  const m = /^\s*(-?\d+(?:[.,]\d+)?)\s*([a-zA-Z/°]+)\s+(?:to|in|i|til|=)\s+([a-zA-Z/°]+)\s*$/.exec(input)
  if (!m) return null
  const value = parseFloat(m[1].replace(',', '.'))
  const norm = (u: string) => {
    const s = u.toLowerCase().replace('°', '')
    return ALIASES[s] ?? s
  }
  const from = norm(m[2])
  const to = norm(m[3])
  if (TEMPS.has(from) && TEMPS.has(to)) {
    const c = from === 'c' ? value : from === 'f' ? ((value - 32) * 5) / 9 : value - 273.15
    const result = to === 'c' ? c : to === 'f' ? (c * 9) / 5 + 32 : c + 273.15
    return { value, from: from.toUpperCase(), to: to.toUpperCase(), result }
  }
  const a = UNITS[from]
  const b = UNITS[to]
  if (!a || !b || a[0] !== b[0]) return null
  return { value, from, to, result: (value * a[1]) / b[1] }
}

/** "25m", "1h30m", "90s", "1:30" (m:s), "5" (minutes). Returns ms. */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, '')
  if (!s) return null
  if (/^\d+$/.test(s)) return parseInt(s, 10) * 60_000
  const colon = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/.exec(s)
  if (colon) {
    const [a, b, c] = colon.slice(1).map((x) => (x ? parseInt(x, 10) : 0))
    return colon[3] ? ((a * 60 + b) * 60 + c) * 1000 : (a * 60 + b) * 1000
  }
  const re = /(\d+(?:[.,]\d+)?)(h|t|m|min|s|sek|sec)/g
  let total = 0
  let used = 0
  for (let m = re.exec(s); m; m = re.exec(s)) {
    const n = parseFloat(m[1].replace(',', '.'))
    const unit = m[2]
    total += unit === 'h' || unit === 't' ? n * 3_600_000 : unit.startsWith('m') ? n * 60_000 : n * 1000
    used += m[0].length
  }
  return used === s.length && total > 0 ? Math.round(total) : null
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

export interface Colour {
  hex: string
  rgb: string
  hsl: string
}

/** "#c77591", "c77591", "#abc", "rgb(199, 117, 145)", "hsl(340 42% 62%)". */
export function parseColour(input: string): Colour | null {
  const s = input.trim().toLowerCase()
  let r: number, g: number, b: number
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(s)
  const rgb = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/.exec(s)
  const hsl = /^hsla?\(\s*(\d{1,3}(?:\.\d+)?)(?:deg)?[\s,]+(\d{1,3}(?:\.\d+)?)%[\s,]+(\d{1,3}(?:\.\d+)?)%/.exec(s)
  if (hex) {
    // Without "#", only a 6-character value with both digits and letters
    // counts: "123" is maths and "add" or "facade" are words.
    if (!s.startsWith('#') && !(hex[1].length === 6 && /\d/.test(hex[1]) && /[a-f]/.test(hex[1]))) return null
    const h = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1]
    ;[r, g, b] = [0, 2, 4].map((o) => parseInt(h.slice(o, o + 2), 16))
  } else if (rgb) {
    ;[r, g, b] = rgb.slice(1, 4).map(Number)
    if ([r, g, b].some((v) => v > 255)) return null
  } else if (hsl) {
    const [hh, ss, ll] = hsl.slice(1, 4).map(Number)
    ;[r, g, b] = hslToRgb(hh, ss / 100, ll / 100)
  } else return null
  return describeColour(r, g, b)
}

export function describeColour(r: number, g: number, b: number): Colour {
  const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
  const [h, s, l] = rgbToHsl(r, g, b)
  return { hex, rgb: `rgb(${r}, ${g}, ${b})`, hsl: `hsl(${h}, ${s}%, ${l}%)` }
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255)) as [number, number, number]
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255]
  const max = Math.max(rr, gg, bb)
  const min = Math.min(rr, gg, bb)
  const l = (max + min) / 2
  if (max === min) return [0, 0, Math.round(l * 100)]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === rr ? (gg - bb) / d + (gg < bb ? 6 : 0) : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4
  return [Math.round(h * 60), Math.round(s * 100), Math.round(l * 100)]
}
