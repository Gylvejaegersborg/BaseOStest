import type { AirQuality, AqiPoint } from './types'
import type { LocationMeta } from './locations'
import { euroAqiBand } from './format'

// Open-Meteo Air Quality — free, key-less, CORS-friendly. Gives an hourly
// European-AQI series (multi-day) plus the underlying pollutants, so the air
// panel can drill down across days like the forecast does.
// Docs: https://open-meteo.com/en/docs/air-quality-api

const API = 'https://air-quality-api.open-meteo.com/v1/air-quality'

interface AqResponse {
  hourly?: {
    time: string[]
    european_aqi: (number | null)[]
    pm2_5: (number | null)[]
    pm10: (number | null)[]
    nitrogen_dioxide: (number | null)[]
    ozone: (number | null)[]
  }
}

// Pick the dominant pollutant by ratio to a rough health reference limit.
function dominantOf(pm25?: number, pm10?: number, no2?: number, o3?: number): string {
  const ratios: [string, number][] = [
    ['PM2.5', (pm25 ?? 0) / 25],
    ['PM10', (pm10 ?? 0) / 50],
    ['NO₂', (no2 ?? 0) / 200],
    ['O₃', (o3 ?? 0) / 120],
  ]
  return ratios.sort((a, b) => b[1] - a[1])[0][0]
}

export interface AirResult {
  current: AirQuality
  series: AqiPoint[]
}

export async function fetchAirSeries(loc: LocationMeta): Promise<AirResult> {
  const url =
    `${API}?latitude=${loc.lat}&longitude=${loc.lon}` +
    `&hourly=european_aqi,pm2_5,pm10,nitrogen_dioxide,ozone&timezone=auto&forecast_days=5`
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`open-meteo air ${res.status}`)
  const data = (await res.json()) as AqResponse
  const h = data.hourly
  if (!h?.time?.length) throw new Error('open-meteo air empty')

  const series: AqiPoint[] = h.time.map((t, i) => ({
    time: t,
    aqi: Math.max(0, h.european_aqi[i] ?? 0),
    pm25: h.pm2_5[i] ?? undefined,
    pm10: h.pm10[i] ?? undefined,
    no2: h.nitrogen_dioxide[i] ?? undefined,
    o3: h.ozone[i] ?? undefined,
  }))

  const c = series[0]
  const current: AirQuality = {
    aqi: Math.round(c.aqi),
    band: euroAqiBand(c.aqi),
    dominant: dominantOf(c.pm25, c.pm10, c.no2, c.o3),
    pm25: c.pm25 != null ? Math.round(c.pm25 * 10) / 10 : undefined,
    pm10: c.pm10 != null ? Math.round(c.pm10 * 10) / 10 : undefined,
    no2: c.no2 != null ? Math.round(c.no2 * 10) / 10 : undefined,
    o3: c.o3 != null ? Math.round(c.o3 * 10) / 10 : undefined,
  }
  return { current, series }
}
