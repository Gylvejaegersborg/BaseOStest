import type { AirQuality, AqiPoint, DayForecast, HourPoint, KpPoint, LocationWeather, ModelSpread, UvPoint } from './types'
import type { LocationMeta } from './locations'
import { euroAqiBand, feelsLike } from './format'
import { deriveHems } from './hems'
import { moonInfo } from './astro'
import { auroraFrom } from './swpcClient'
import { buildEvents } from './events'

// Realistic offline fallback. When the live MET feeds are unreachable (sandbox
// network policy, CORS, rate limit), the section still renders a plausible
// Norwegian forecast so the UI is never blank. Values are deterministic per
// location + day so they don't jitter between renders.

function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0)
  return Math.floor((d.getTime() - start.getTime()) / 86400000)
}

/** Seasonal mean air temp for lowland Norway (≈ −4 °C Jan, 17 °C Jul). */
function seasonalMean(d: Date): number {
  return 6.5 + 10.5 * Math.sin((2 * Math.PI * (dayOfYear(d) - 105)) / 365)
}

interface Climate {
  offset: number // mean temp offset vs lowland
  diurnal: number // day-night swing
  wetness: number // base precip propensity 0–1
  windBase: number // m/s
}

const CLIMATE: Record<string, Climate> = {
  oslo: { offset: 1, diurnal: 4, wetness: 0.28, windBase: 3 },
  hamar: { offset: -0.5, diurnal: 7, wetness: 0.24, windBase: 2.2 },
  trysil: { offset: -5, diurnal: 6, wetness: 0.34, windBase: 2.6 },
}

/** Rough sunrise/sunset (local CEST) from latitude + solar declination. */
function sunTimes(lat: number, d: Date): { sunrise: number; sunset: number } {
  const decl = 23.44 * Math.sin((2 * Math.PI * (dayOfYear(d) - 81)) / 365)
  const rad = Math.PI / 180
  const x = -Math.tan(lat * rad) * Math.tan(decl * rad)
  if (x <= -1) return { sunrise: 0, sunset: 24 } // polar day
  if (x >= 1) return { sunrise: 12, sunset: 12 } // polar night
  const daylight = (2 * Math.acos(x) * 12) / Math.PI
  const noon = 13 // solar noon ≈ 13:00 in CEST at these longitudes
  return { sunrise: noon - daylight / 2, sunset: noon + daylight / 2 }
}

/** Clear-sky UV index at solar noon from latitude + season. */
function uvNoon(lat: number, d: Date): number {
  const decl = 23.44 * Math.sin((2 * Math.PI * (dayOfYear(d) - 81)) / 365)
  const zenith = Math.abs(lat - decl) // degrees from overhead at noon
  return Math.max(0, Math.round(8.5 * Math.cos((zenith * Math.PI) / 180) * 10) / 10)
}

/** Hourly UV from the noon peak, tapered by sun position and cloud. */
function uvAt(noonUv: number, hod: number, sunrise: number, sunset: number, cloud: number): number {
  if (hod < sunrise || hod > sunset || sunset <= sunrise) return 0
  const arc = Math.sin((Math.PI * (hod - sunrise)) / (sunset - sunrise))
  return Math.max(0, Math.round(noonUv * arc * (1 - (cloud / 100) * 0.7) * 10) / 10)
}

function buildSymbol(cloud: number, precip: number, temp: number, isDay: boolean): string {
  const suffix = isDay ? '_day' : '_night'
  if (precip > 0.05) {
    const heavy = precip > 1.5 ? 'heavy' : precip > 0.3 ? '' : 'light'
    let kind: string
    if (temp <= -0.5) kind = 'snow'
    else if (temp <= 1.5) kind = 'sleet'
    else kind = 'rain'
    const showers = cloud < 85 && isDay && kind === 'rain'
    const base = `${heavy}${kind}${showers ? 'showers' : ''}`
    // Showers/clear-ish carry a day suffix; steady precip codes don't.
    return showers ? base + suffix : base
  }
  if (cloud < 10) return 'clearsky' + suffix
  if (cloud < 40) return 'fair' + suffix
  if (cloud < 80) return 'partlycloudy' + suffix
  return 'cloudy'
}

/** A single climatology-based day estimate for any date — used to fill the
 *  month view beyond the live forecast horizon. Marked forecast:false. */
export function climatologyDay(loc: LocationMeta, date: Date): DayForecast {
  const c = CLIMATE[loc.id]
  const drnd = mulberry32(Math.round(loc.lat * 1000) + dayOfYear(date) * 7)
  const mean = seasonalMean(date) + c.offset
  const max = Math.round(mean + c.diurnal / 2 + (drnd() - 0.3) * 3)
  const min = Math.round(mean - c.diurnal / 2 - drnd() * 3)
  const wet = drnd() < c.wetness + 0.1
  const precipSum = wet ? Math.round(drnd() * 9 * 10) / 10 : 0
  return {
    date: date.toISOString().slice(0, 10),
    min,
    max,
    precipSum,
    windMax: Math.round((c.windBase + drnd() * 6) * 10) / 10,
    symbol: buildSymbol(wet ? 80 : 30, precipSum / 6, (max + mean) / 2, true),
    forecast: false,
  }
}

export function mockLocationWeather(loc: LocationMeta, now = new Date()): LocationWeather {
  const c = CLIMATE[loc.id]
  const rnd = mulberry32(Math.round(loc.lat * 1000) + dayOfYear(now))
  const hours: HourPoint[] = []

  // Start at the current hour and walk forward 48h.
  const start = new Date(now)
  start.setMinutes(0, 0, 0)
  let pressure = 1009 + rnd() * 14
  const uvHours: UvPoint[] = []
  const airQualitySeries: AqiPoint[] = []
  const aqBaseEuro = loc.id === 'oslo' ? 28 : 16 // Oslo runs higher (traffic/wood smoke)

  for (let i = 0; i < 48; i++) {
    const t = new Date(start.getTime() + i * 3600000)
    const hod = t.getHours() + t.getMinutes() / 60
    const mean = seasonalMean(t) + c.offset
    // Diurnal cycle: minimum ~04:00, maximum ~15:00.
    const diurnal = -Math.cos((2 * Math.PI * (hod - 4)) / 24) * (c.diurnal / 2)
    const temp = Math.round((mean + diurnal + (rnd() - 0.5) * 2) * 10) / 10

    const { sunrise, sunset } = sunTimes(loc.lat, t)
    const isDay = hod >= sunrise && hod <= sunset

    // Precipitation comes in clustered "fronts".
    const frontActive = rnd() < c.wetness
    const precip = frontActive ? Math.round(rnd() * (rnd() < 0.25 ? 4 : 1.2) * 10) / 10 : 0
    const cloud = Math.round(Math.min(100, (frontActive ? 70 : 20) + (rnd() - 0.5) * 50))
    const windSpeed = Math.round((c.windBase + rnd() * 4 + (frontActive ? 2 : 0)) * 10) / 10
    const windGust = Math.round((windSpeed * (1.4 + rnd() * 0.6)) * 10) / 10
    const humidity = Math.round(Math.min(99, 55 + cloud * 0.3 + (frontActive ? 15 : 0) + (rnd() - 0.5) * 10))
    pressure += (rnd() - 0.5) * 1.5

    hours.push({
      time: t.toISOString(),
      temp,
      feelsLike: feelsLike(temp, windSpeed),
      windSpeed,
      windGust,
      windDir: Math.round(rnd() * 360),
      humidity,
      pressure: Math.round(pressure),
      cloud: Math.max(0, cloud),
      precip,
      precipProb: frontActive ? Math.round(40 + rnd() * 55) : Math.round(rnd() * 15),
      symbol: buildSymbol(Math.max(0, cloud), precip, temp, isDay),
    })

    uvHours.push({ time: t.toISOString(), uv: uvAt(uvNoon(loc.lat, t), hod, sunrise, sunset, Math.max(0, cloud)) })
    // AQI drifts with a daily traffic rhythm; rain scrubs the air.
    const rush = 1 + 0.5 * Math.max(0, Math.cos((2 * Math.PI * (hod - 8)) / 24))
    const euroAqi = Math.max(2, Math.round((aqBaseEuro * rush - precip * 6 + (rnd() - 0.5) * 8)))
    airQualitySeries.push({
      time: t.toISOString(),
      aqi: euroAqi,
      pm25: Math.round((euroAqi * 0.5 + rnd() * 4) * 10) / 10,
      pm10: Math.round((euroAqi * 0.8 + rnd() * 6) * 10) / 10,
      no2: Math.round((euroAqi * 0.7 + rnd() * 8) * 10) / 10,
      o3: Math.round((45 + rnd() * 35) * 10) / 10,
    })
  }

  // 9-day outlook.
  const days: DayForecast[] = []
  for (let d = 0; d < 9; d++) {
    const date = new Date(now)
    date.setDate(date.getDate() + d)
    const drnd = mulberry32(Math.round(loc.lat * 1000) + dayOfYear(date) * 7)
    const mean = seasonalMean(date) + c.offset
    const max = Math.round(mean + c.diurnal / 2 + (drnd() - 0.3) * 3)
    const min = Math.round(mean - c.diurnal / 2 - drnd() * 3)
    const wet = drnd() < c.wetness + 0.1
    const precipSum = wet ? Math.round(drnd() * 9 * 10) / 10 : 0
    const noonTemp = (max + mean) / 2
    const { sunrise, sunset } = sunTimes(loc.lat, date)
    const fmt = (h: number) => {
      const hh = Math.floor(h)
      const mm = Math.round((h - hh) * 60)
      const dt = new Date(date)
      dt.setHours(hh, mm, 0, 0)
      return dt.toISOString()
    }
    days.push({
      date: date.toISOString().slice(0, 10),
      min,
      max,
      precipSum,
      windMax: Math.round((c.windBase + drnd() * 6) * 10) / 10,
      symbol: buildSymbol(wet ? 80 : 30, precipSum / 6, noonTemp, true),
      sunrise: sunrise > 0 ? fmt(sunrise) : undefined,
      sunset: sunset < 24 ? fmt(sunset) : undefined,
      uvMax: Math.round(uvNoon(loc.lat, date) * (wet ? 0.55 : 0.92) * 10) / 10,
      aqiMax: Math.round(aqBaseEuro * 1.4 + drnd() * 12),
      forecast: d < 9,
    })
  }

  const current = hours[0]
  const c0 = airQualitySeries[0]
  const airQuality: AirQuality = {
    aqi: c0.aqi,
    band: euroAqiBand(c0.aqi),
    dominant: loc.id === 'oslo' ? 'PM2.5' : 'O₃',
    pm25: c0.pm25,
    pm10: c0.pm10,
    no2: c0.no2,
    o3: c0.o3,
  }

  // Mock geomagnetic activity — usually quiet, occasionally elevated.
  const kp = Math.round((1.3 + rnd() * 3) * 10) / 10
  const kpForecast: KpPoint[] = Array.from({ length: 24 }, (_, i) => ({
    time: new Date(start.getTime() + i * 3 * 3600000).toISOString(),
    kp: Math.round(Math.max(0, kp + Math.sin(i / 3) * 1.2 + (rnd() - 0.5)) * 10) / 10,
    observed: i < 2,
  }))
  const kpMax = Math.max(kp, ...kpForecast.map((p) => p.kp))
  const aurora = auroraFrom(kp, kpMax, kpForecast, loc)

  // Mock multi-model spread clustered around the current temperature.
  const baseT = current.temp
  const modelDefs = [
    ['ecmwf_ifs025', 'ECMWF IFS'],
    ['icon_seamless', 'DWD ICON'],
    ['gfs_seamless', 'NOAA GFS'],
    ['meteofrance_seamless', 'Météo-France'],
    ['jma_seamless', 'JMA'],
    ['gem_seamless', 'ECCC GEM'],
    ['bom_access_global', 'BoM ACCESS'],
  ]
  const modelData = modelDefs.map(([id, label]) => ({
    id,
    label,
    temp: Math.round((baseT + (rnd() - 0.5) * 3) * 10) / 10,
    precip24: Math.round(rnd() * 6 * 10) / 10,
  }))
  const mTemps = modelData.map((m) => m.temp)
  const spread = Math.round((Math.max(...mTemps) - Math.min(...mTemps)) * 10) / 10
  const modelSpread: ModelSpread = {
    models: modelData,
    meanTemp: Math.round((mTemps.reduce((a, b) => a + b, 0) / mTemps.length) * 10) / 10,
    spread,
    agreement: spread < 2 ? 'high' : spread < 4 ? 'medium' : 'low',
  }

  // Short nowcast: taper today's first-hour precip across 90 minutes.
  const p0 = current.precip
  const nowcast = Array.from({ length: 10 }, (_, i) => ({
    minutes: i * 10,
    precip: Math.max(0, Math.round((p0 * (1 - i * 0.07) + (rnd() - 0.5) * 0.2) * 100) / 100),
  }))

  const moon = moonInfo(now)
  const events = buildEvents(days, aurora, now)

  return {
    locationId: loc.id,
    updated: now.toISOString(),
    current,
    nowcast,
    hours,
    days,
    airQuality,
    airQualitySeries,
    hems: deriveHems(current),
    uvHours,
    aurora,
    moon,
    modelSpread,
    events,
  }
}
