import type { Agreement, ModelDatum, ModelSpread, UvPoint } from './types'
import type { LocationMeta } from './locations'

// Open-Meteo is a free, key-less, CORS-friendly aggregator that serves several
// of the national models the user listed — ECMWF IFS, DWD ICON, NOAA GFS,
// Météo-France ARPEGE/AROME, JMA, ECCC GEM and BoM ACCESS. We use it for:
//   • UV index (MET Norway doesn't expose it),
//   • multi-day sunrise/sunset,
//   • a multi-model agreement spread (how much the big models disagree).
// Each call throws on failure; useWeather falls back to generated data.
//
// Docs: https://open-meteo.com/

const API = 'https://api.open-meteo.com/v1/forecast'

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`open-meteo ${res.status}`)
  return res.json() as Promise<T>
}

interface UvResponse {
  hourly?: { time: string[]; uv_index: (number | null)[] }
  daily?: { time: string[]; uv_index_max: (number | null)[]; sunrise: string[]; sunset: string[] }
}

export interface UvAndSun {
  uvHours: UvPoint[]
  days: { date: string; uvMax?: number; sunrise?: string; sunset?: string }[]
}

export async function fetchUvAndSun(loc: LocationMeta): Promise<UvAndSun> {
  const url =
    `${API}?latitude=${loc.lat}&longitude=${loc.lon}` +
    `&hourly=uv_index&daily=uv_index_max,sunrise,sunset&timezone=auto&forecast_days=14`
  const data = await getJSON<UvResponse>(url)
  const h = data.hourly
  const d = data.daily
  if (!h || !d) throw new Error('open-meteo empty')
  const uvHours: UvPoint[] = h.time.map((t, i) => ({ time: t, uv: Math.max(0, h.uv_index[i] ?? 0) }))
  const days = d.time.map((date, i) => ({
    date,
    uvMax: d.uv_index_max[i] ?? undefined,
    sunrise: d.sunrise[i],
    sunset: d.sunset[i],
  }))
  return { uvHours, days }
}

// ── Multi-model spread ───────────────────────────────────────────────────────
const MODELS: { id: string; label: string }[] = [
  { id: 'ecmwf_ifs025', label: 'ECMWF IFS' },
  { id: 'icon_seamless', label: 'DWD ICON' },
  { id: 'gfs_seamless', label: 'NOAA GFS' },
  { id: 'meteofrance_seamless', label: 'Météo-France' },
  { id: 'jma_seamless', label: 'JMA' },
  { id: 'gem_seamless', label: 'ECCC GEM' },
  { id: 'bom_access_global', label: 'BoM ACCESS' },
]

type MultiResponse = { hourly?: Record<string, (number | null)[] | string[]> }

function firstNumber(arr: (number | null)[] | undefined): number | null {
  if (!arr) return null
  for (const v of arr) if (typeof v === 'number') return v
  return null
}

function sumFirst(arr: (number | null)[] | undefined, n: number): number | null {
  if (!arr) return null
  let s = 0
  let seen = false
  for (let i = 0; i < Math.min(n, arr.length); i++) {
    const v = arr[i]
    if (typeof v === 'number') {
      s += v
      seen = true
    }
  }
  return seen ? Math.round(s * 10) / 10 : null
}

export async function fetchModelSpread(loc: LocationMeta): Promise<ModelSpread> {
  const ids = MODELS.map((m) => m.id).join(',')
  const url =
    `${API}?latitude=${loc.lat}&longitude=${loc.lon}` +
    `&hourly=temperature_2m,precipitation&models=${ids}&timezone=auto&forecast_days=2`
  const data = await getJSON<MultiResponse>(url)
  const hourly = data.hourly
  if (!hourly) throw new Error('open-meteo models empty')

  const models: ModelDatum[] = MODELS.map((m) => {
    const temp = firstNumber(hourly[`temperature_2m_${m.id}`] as (number | null)[])
    const precip24 = sumFirst(hourly[`precipitation_${m.id}`] as (number | null)[], 24)
    return { id: m.id, label: m.label, temp, precip24 }
  })

  const temps = models.map((m) => m.temp).filter((t): t is number => t != null)
  const meanTemp = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : 0
  const spread = temps.length ? Math.max(...temps) - Math.min(...temps) : 0
  const agreement: Agreement = spread < 2 ? 'high' : spread < 4 ? 'medium' : 'low'

  return {
    models,
    meanTemp: Math.round(meanTemp * 10) / 10,
    spread: Math.round(spread * 10) / 10,
    agreement,
  }
}
