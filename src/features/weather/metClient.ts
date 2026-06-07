import { format } from 'date-fns'
import type { AirQuality, AqiBand, DayForecast, HourPoint } from './types'
import type { LocationMeta } from './locations'
import { feelsLike } from './format'

// Thin client for MET Norway's open APIs — the same data that powers Yr.no.
// Every call performs a plain browser fetch and throws on any failure; the
// aggregator (useWeather) decides when to fall back to generated data.
//
// Docs: https://api.met.no/  — free, no key. MET asks for an identifying
// User-Agent; browsers send their own (the header is forbidden to override in
// fetch), and requests are made from the client, so we keep within fair use.

const MET = 'https://api.met.no/weatherapi'

// ── Minimal response shapes (only the fields we read) ────────────────────────
interface MetDetails {
  air_temperature?: number
  wind_speed?: number
  wind_speed_of_gust?: number
  wind_from_direction?: number
  relative_humidity?: number
  air_pressure_at_sea_level?: number
  cloud_area_fraction?: number
  precipitation_amount?: number
  probability_of_precipitation?: number
}
interface MetEntry {
  time: string
  data: {
    instant: { details: MetDetails }
    next_1_hours?: { summary: { symbol_code: string }; details?: MetDetails }
    next_6_hours?: { summary?: { symbol_code: string }; details?: MetDetails }
  }
}
interface MetForecast {
  properties: { timeseries: MetEntry[] }
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`MET ${res.status} on ${url}`)
  return res.json() as Promise<T>
}

function toHour(e: MetEntry): HourPoint {
  const d = e.data.instant.details
  const temp = d.air_temperature ?? 0
  const wind = d.wind_speed ?? 0
  return {
    time: e.time,
    temp,
    feelsLike: feelsLike(temp, wind),
    windSpeed: wind,
    windGust: d.wind_speed_of_gust,
    windDir: d.wind_from_direction ?? 0,
    humidity: d.relative_humidity ?? 0,
    pressure: d.air_pressure_at_sea_level ?? 1013,
    cloud: d.cloud_area_fraction ?? 0,
    precip: e.data.next_1_hours?.details?.precipitation_amount ?? 0,
    precipProb: e.data.next_1_hours?.details?.probability_of_precipitation,
    symbol: e.data.next_1_hours?.summary.symbol_code ?? e.data.next_6_hours?.summary?.symbol_code ?? 'cloudy',
  }
}

/** Roll hourly points up into per-day outlooks. */
function buildDays(hours: HourPoint[]): DayForecast[] {
  const byDay = new Map<string, HourPoint[]>()
  for (const h of hours) {
    const key = h.time.slice(0, 10)
    const arr = byDay.get(key) ?? []
    arr.push(h)
    byDay.set(key, arr)
  }
  const days: DayForecast[] = []
  for (const [date, pts] of byDay) {
    const temps = pts.map((p) => p.temp)
    // Representative symbol: prefer the point nearest local noon.
    const noon = pts.reduce((best, p) =>
      Math.abs(new Date(p.time).getHours() - 12) < Math.abs(new Date(best.time).getHours() - 12) ? p : best,
    )
    days.push({
      date,
      min: Math.round(Math.min(...temps)),
      max: Math.round(Math.max(...temps)),
      precipSum: Math.round(pts.reduce((s, p) => s + p.precip, 0) * 10) / 10,
      windMax: Math.round(Math.max(...pts.map((p) => p.windSpeed)) * 10) / 10,
      symbol: noon.symbol,
      forecast: true,
    })
  }
  return days.sort((a, b) => a.date.localeCompare(b.date))
}

export async function fetchForecast(loc: LocationMeta): Promise<{ hours: HourPoint[]; days: DayForecast[] }> {
  const url = `${MET}/locationforecast/2.0/compact?lat=${loc.lat}&lon=${loc.lon}&altitude=${loc.altitude}`
  const data = await getJSON<MetForecast>(url)
  const series = data.properties.timeseries
  if (!series?.length) throw new Error('MET empty timeseries')
  // Keep the first ~48 hourly entries (MET switches to 6-hourly later).
  const hours = series.slice(0, 56).map(toHour)
  const days = buildDays(series.map(toHour))
  return { hours, days }
}

interface SunResponse {
  properties?: { sunrise?: { time?: string }; sunset?: { time?: string } }
}

export async function fetchSun(loc: LocationMeta, date = new Date()): Promise<{ sunrise?: string; sunset?: string }> {
  const d = format(date, 'yyyy-MM-dd')
  const url = `${MET}/sunrise/3.0/sun?lat=${loc.lat}&lon=${loc.lon}&date=${d}&offset=+02:00`
  const data = await getJSON<SunResponse>(url)
  return { sunrise: data.properties?.sunrise?.time, sunset: data.properties?.sunset?.time }
}

interface AqVar {
  value?: number
}
interface AqResponse {
  data?: { time?: { variables?: Record<string, AqVar> }[] }
}

function aqiBand(aqi: number): AqiBand {
  if (aqi < 2) return 'low'
  if (aqi < 3) return 'moderate'
  if (aqi < 4) return 'high'
  return 'severe'
}

export async function fetchAirQuality(loc: LocationMeta): Promise<AirQuality> {
  const url = `${MET}/airqualityforecast/0.1/?lat=${loc.lat}&lon=${loc.lon}`
  const data = await getJSON<AqResponse>(url)
  const first = data.data?.time?.[0]?.variables
  if (!first) throw new Error('MET AQ empty')
  const aqi = first.AQI?.value ?? 1
  const pm25 = first.pm25_concentration?.value
  const pm10 = first.pm10_concentration?.value
  const no2 = first.no2_concentration?.value
  const o3 = first.o3_concentration?.value
  // Dominant pollutant = the per-pollutant sub-index that is highest.
  const subs: [string, number][] = [
    ['PM2.5', first.AQI_pm25?.value ?? 0],
    ['PM10', first.AQI_pm10?.value ?? 0],
    ['NO₂', first.AQI_no2?.value ?? 0],
    ['O₃', first.AQI_o3?.value ?? 0],
  ]
  const dominant = subs.sort((a, b) => b[1] - a[1])[0][0]
  return {
    aqi: Math.round(aqi * 10) / 10,
    band: aqiBand(aqi),
    dominant,
    pm25: pm25 != null ? Math.round(pm25 * 10) / 10 : undefined,
    pm10: pm10 != null ? Math.round(pm10 * 10) / 10 : undefined,
    no2: no2 != null ? Math.round(no2 * 10) / 10 : undefined,
    o3: o3 != null ? Math.round(o3 * 10) / 10 : undefined,
  }
}

interface NowEntry {
  time: string
  data: { instant: { details: { precipitation_rate?: number } } }
}
interface NowResponse {
  properties?: { timeseries?: NowEntry[] }
}

/** MET Nowcast — 5-minute radar precipitation for the next ~90 min (Nordics). */
export async function fetchNowcast(loc: LocationMeta): Promise<{ minutes: number; precip: number }[]> {
  const url = `${MET}/nowcast/2.0/complete?lat=${loc.lat}&lon=${loc.lon}`
  const data = await getJSON<NowResponse>(url)
  const series = data.properties?.timeseries
  if (!series?.length) throw new Error('MET nowcast empty')
  const t0 = new Date(series[0].time).getTime()
  return series.slice(0, 19).map((e) => ({
    minutes: Math.round((new Date(e.time).getTime() - t0) / 60000),
    precip: e.data.instant.details.precipitation_rate ?? 0,
  }))
}
