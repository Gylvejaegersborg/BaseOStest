import type { MoonInfo, WeatherEvent } from './types'

// Lightweight astronomy: moon phase plus a calendar of cosmic events (moon
// phases, solstices/equinoxes, major meteor showers). All computed locally — no
// network needed — so the cosmic side of the events panel always works.

const SYNODIC = 29.530588853
const REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14) // known new moon

export function moonInfo(date: Date): MoonInfo {
  const days = (date.getTime() - REF_NEW_MOON) / 86400000
  let phase = (days % SYNODIC) / SYNODIC
  if (phase < 0) phase += 1
  const illum = (1 - Math.cos(2 * Math.PI * phase)) / 2
  return { phase, illum, name: moonName(phase) }
}

function moonName(p: number): string {
  if (p < 0.03 || p > 0.97) return 'New moon'
  if (p < 0.22) return 'Waxing crescent'
  if (p < 0.28) return 'First quarter'
  if (p < 0.47) return 'Waxing gibbous'
  if (p < 0.53) return 'Full moon'
  if (p < 0.72) return 'Waning gibbous'
  if (p < 0.78) return 'Last quarter'
  return 'Waning crescent'
}

/** Next full and new moons within `days` ahead. */
function moonEvents(from: Date, days: number): WeatherEvent[] {
  const out: WeatherEvent[] = []
  const end = from.getTime() + days * 86400000
  // Step day by day, detect crossings of full (0.5) and new (0/1).
  let prev = moonInfo(from).phase
  for (let t = from.getTime() + 86400000; t <= end; t += 86400000) {
    const cur = moonInfo(new Date(t)).phase
    const crossedFull = prev < 0.5 && cur >= 0.5
    const crossedNew = prev > cur // wrapped past 1→0
    if (crossedFull)
      out.push(ev('cosmic', new Date(t), 'Full moon', 'Brightest moon — washes out faint aurora & stars.', '#cfe6ff'))
    if (crossedNew)
      out.push(ev('cosmic', new Date(t), 'New moon', 'Darkest skies — best for stargazing.', '#9bb0c8'))
    prev = cur
  }
  return out
}

// Solstices / equinoxes — typical dates are stable enough for a calendar.
function seasonEvents(from: Date, days: number): WeatherEvent[] {
  const year = from.getFullYear()
  const marks: { m: number; d: number; title: string; detail: string }[] = [
    { m: 2, d: 20, title: 'Spring equinox', detail: 'Day and night roughly equal.' },
    { m: 5, d: 21, title: 'Summer solstice', detail: 'Longest day — midnight-bright nights up north.' },
    { m: 8, d: 22, title: 'Autumn equinox', detail: 'Nights overtake days again.' },
    { m: 11, d: 21, title: 'Winter solstice', detail: 'Shortest day — aurora season peaks.' },
  ]
  const out: WeatherEvent[] = []
  for (const yr of [year, year + 1]) {
    for (const s of marks) {
      const d = new Date(yr, s.m, s.d, 12, 0, 0)
      if (within(from, d, days)) out.push(ev('cosmic', d, s.title, s.detail, '#f0c020'))
    }
  }
  return out
}

// Major meteor showers (peak nights). Static — peaks vary by a day at most.
const SHOWERS = [
  { m: 0, d: 3, name: 'Quadrantids' },
  { m: 3, d: 22, name: 'Lyrids' },
  { m: 4, d: 6, name: 'Eta Aquariids' },
  { m: 7, d: 12, name: 'Perseids' },
  { m: 9, d: 21, name: 'Orionids' },
  { m: 10, d: 17, name: 'Leonids' },
  { m: 11, d: 14, name: 'Geminids' },
]

function showerEvents(from: Date, days: number): WeatherEvent[] {
  const out: WeatherEvent[] = []
  for (const yr of [from.getFullYear(), from.getFullYear() + 1]) {
    for (const s of SHOWERS) {
      const d = new Date(yr, s.m, s.d, 22, 0, 0)
      if (within(from, d, days))
        out.push(ev('cosmic', d, `${s.name} peak`, 'Meteor shower maximum — watch after midnight.', '#b58bff'))
    }
  }
  return out
}

export function cosmicEvents(from: Date, days = 60): WeatherEvent[] {
  return [...moonEvents(from, days), ...seasonEvents(from, days), ...showerEvents(from, days)].sort((a, b) =>
    a.date.localeCompare(b.date),
  )
}

function within(from: Date, d: Date, days: number): boolean {
  const diff = (d.getTime() - from.getTime()) / 86400000
  return diff >= -0.5 && diff <= days
}

function ev(kind: WeatherEvent['kind'], date: Date, title: string, detail: string, tone: string): WeatherEvent {
  return { id: `${kind}-${date.toISOString()}-${title}`, kind, date: date.toISOString(), title, detail, tone }
}
