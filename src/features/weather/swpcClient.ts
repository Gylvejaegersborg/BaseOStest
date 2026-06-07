import type { Aurora, AuroraBand, KpPoint } from './types'
import type { LocationMeta } from './locations'

// NOAA Space Weather Prediction Center — free, key-less, CORS-friendly. Drives
// the northern-lights tracker: the planetary K-index now and the 3-day Kp
// forecast. Visibility is then reasoned from Kp + the location's latitude and
// whether there's real darkness (there isn't, in a Nordic summer).
// Docs: https://services.swpc.noaa.gov/

const KP_NOW = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'
const KP_FC = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json'

interface KpRow {
  time: string
  kp: number
  observed: boolean
}

// SWPC serves these products in two shapes depending on endpoint/era: a classic
// array-of-arrays with a header row, or an array of objects. Normalise both.
async function getKpRows(url: string): Promise<KpRow[]> {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`swpc ${res.status}`)
  const data = (await res.json()) as unknown
  if (!Array.isArray(data) || data.length === 0) throw new Error('swpc empty')

  if (Array.isArray(data[0])) {
    // [["time_tag","Kp",...], ["2026-..","3.67",..], …]
    return (data as unknown[][]).slice(1).map((r) => ({
      time: String(r[0]),
      kp: parseFloat(String(r[1])) || 0,
      observed: String(r[2]) === 'observed',
    }))
  }
  // [{ time_tag, Kp|kp, observed }, …]
  return (data as Record<string, unknown>[]).map((o) => ({
    time: String(o.time_tag ?? ''),
    kp: Number(o.kp ?? o.Kp ?? 0) || 0,
    observed: o.observed === undefined ? true : o.observed === 'observed',
  }))
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0)
  return Math.floor((d.getTime() - start.getTime()) / 86400000)
}

/** Is the sun far enough below the horizon at solar midnight to see aurora? */
export function hasDarkNight(lat: number, date = new Date()): boolean {
  const decl = 23.44 * Math.sin((2 * Math.PI * (dayOfYear(date) - 81)) / 365)
  const midnightAlt = lat + decl - 90 // solar altitude at lower culmination
  return midnightAlt < -10
}

function band(kp: number): AuroraBand {
  if (kp < 3) return 'none'
  if (kp < 5) return 'low'
  if (kp < 7) return 'moderate'
  return 'high'
}

export function auroraFrom(kp: number, kpMax: number, forecast: KpPoint[], loc: LocationMeta): Aurora {
  const dark = hasDarkNight(loc.lat)
  // Geomagnetic likelihood at ~60°N: visible low on the horizon from Kp~3.
  const geoProb = Math.max(0, Math.min(95, Math.round(((kpMax - 2.5) / 5) * 100)))
  const probability = dark ? geoProb : Math.round(geoProb * 0.05)
  const b = band(kpMax)
  const note = !dark
    ? `Bright nights over ${loc.region} — not visible now, but Kp peaks at ${kpMax.toFixed(0)}.`
    : b === 'none'
      ? 'Geomagnetic field quiet — aurora unlikely.'
      : b === 'low'
        ? 'Possible low on the northern horizon.'
        : b === 'moderate'
          ? 'Good odds overhead on clear, dark skies.'
          : 'Geomagnetic storm — strong, widespread aurora likely.'
  return { kp, kpMax, forecast, probability, band: b, darkNight: dark, note }
}

function asTime(t: string): number {
  return new Date(t.replace(' ', 'T')).getTime()
}

export async function fetchAurora(loc: LocationMeta): Promise<Aurora> {
  const [nowRows, fcRows] = await Promise.all([getKpRows(KP_NOW), getKpRows(KP_FC)])
  if (!nowRows.length || !fcRows.length) throw new Error('swpc empty')

  const kp = Math.round(nowRows[nowRows.length - 1].kp * 10) / 10

  const now = Date.now()
  const forecast: KpPoint[] = fcRows.filter((p) => !Number.isNaN(asTime(p.time)))
  const future = forecast.filter((p) => asTime(p.time) >= now - 3 * 3600000)
  const kpMax = future.length ? Math.max(...future.map((p) => p.kp)) : kp

  return auroraFrom(kp, kpMax, forecast.slice(-24), loc)
}
