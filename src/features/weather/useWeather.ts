import { useCallback, useEffect, useState } from 'react'
import type { LocationId, LocationWeather, SourceStatus } from './types'
import { locationById } from './locations'
import { mockLocationWeather } from './mockData'
import { deriveHems } from './hems'
import { fetchForecast, fetchNowcast } from './metClient'
import { fetchModelSpread, fetchUvAndSun } from './openMeteoClient'
import { fetchAirSeries } from './openMeteoAir'
import { fetchAurora } from './swpcClient'
import { buildEvents } from './events'

// Pulls every location's snapshot together from multiple feeds:
//   • MET Norway (Yr) — forecast + nowcast radar (live backbone)
//   • Open-Meteo — UV, multi-day sun, and a multi-model agreement spread that
//     aggregates ECMWF, DWD, NOAA, Météo-France, JMA, ECCC and BoM
//   • Open-Meteo Air Quality — multi-day European-AQI series
//   • NOAA SWPC — aurora / planetary K-index
// Each call settles independently so one failing never blanks the page, and the
// source list records exactly what was live vs. generated.

function relAge(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  return `${Math.round(s / 3600)}h ago`
}

function src(
  id: string,
  name: string,
  detail: string,
  state: SourceStatus['state'],
  note: string,
  href?: string,
): SourceStatus {
  return { id, name, detail, state, note, href }
}

interface Result {
  data: LocationWeather
  sources: SourceStatus[]
}

async function load(id: LocationId): Promise<Result> {
  const meta = locationById(id)
  const base = mockLocationWeather(meta)
  const now = new Date().toISOString()

  const [forecast, nowcast, uvSun, models, air, aurora] = await Promise.allSettled([
    fetchForecast(meta),
    fetchNowcast(meta),
    fetchUvAndSun(meta),
    fetchModelSpread(meta),
    fetchAirSeries(meta),
    fetchAurora(meta),
  ])

  const sources: SourceStatus[] = []
  const data: LocationWeather = { ...base, updated: now }
  const MET = 'https://api.met.no/'
  const OM = 'https://open-meteo.com/'

  // 1 — MET Locationforecast (hours + days)
  if (forecast.status === 'fulfilled' && forecast.value.hours.length) {
    data.hours = forecast.value.hours
    const live = forecast.value.days
    const liveDates = new Set(live.map((d) => d.date))
    data.days = [...live, ...base.days.filter((d) => !liveDates.has(d.date))].sort((a, b) => a.date.localeCompare(b.date))
    data.current = forecast.value.hours[0]
    data.hems = deriveHems(data.current)
    sources.push(src('met-forecast', 'MET Norway', 'Locationforecast 2.0', 'live', 'live · updated just now', MET))
  } else {
    sources.push(src('met-forecast', 'MET Norway', 'Locationforecast 2.0', 'mock', 'unreachable — generated forecast', MET))
  }

  // 2 — MET Nowcast radar
  if (nowcast.status === 'fulfilled' && nowcast.value.length) {
    data.nowcast = nowcast.value
    sources.push(src('met-nowcast', 'MET Nowcast', 'Radar precipitation', 'live', 'live · 5-min radar', MET))
  } else {
    sources.push(src('met-nowcast', 'MET Nowcast', 'Radar precipitation', 'mock', 'unreachable — estimated', MET))
  }

  // 3 — Open-Meteo UV + multi-day sunrise/sunset
  if (uvSun.status === 'fulfilled' && uvSun.value.uvHours.length) {
    data.uvHours = uvSun.value.uvHours
    const byDate = new Map(uvSun.value.days.map((d) => [d.date, d]))
    data.days = data.days.map((d) => {
      const m = byDate.get(d.date)
      return m ? { ...d, uvMax: m.uvMax ?? d.uvMax, sunrise: m.sunrise ?? d.sunrise, sunset: m.sunset ?? d.sunset } : d
    })
    sources.push(src('om-uv', 'Open-Meteo', 'UV index + sun times', 'live', 'live · 14-day', OM))
  } else {
    sources.push(src('om-uv', 'Open-Meteo', 'UV index + sun times', 'mock', 'unreachable — computed', OM))
  }

  // 4 — Open-Meteo multi-model spread
  if (models.status === 'fulfilled' && models.value.models.some((m) => m.temp != null)) {
    data.modelSpread = models.value
    sources.push(src('om-models', 'Open-Meteo ensemble', 'ECMWF · DWD · GFS · …', 'live', `${models.value.agreement} agreement`, OM))
  } else {
    sources.push(src('om-models', 'Open-Meteo ensemble', 'ECMWF · DWD · GFS · …', 'mock', 'unreachable — simulated', OM))
  }

  // 5 — Open-Meteo air quality series
  if (air.status === 'fulfilled' && air.value.series.length) {
    data.airQuality = air.value.current
    data.airQualitySeries = air.value.series
    const maxByDate = new Map<string, number>()
    for (const p of air.value.series) {
      const k = p.time.slice(0, 10)
      maxByDate.set(k, Math.max(maxByDate.get(k) ?? 0, p.aqi))
    }
    data.days = data.days.map((d) => (maxByDate.has(d.date) ? { ...d, aqiMax: Math.round(maxByDate.get(d.date)!) } : d))
    sources.push(src('om-air', 'Open-Meteo Air', 'European AQI · pollutants', 'live', 'live · multi-day', OM))
  } else {
    sources.push(src('om-air', 'Open-Meteo Air', 'European AQI · pollutants', 'mock', 'unreachable — modelled', OM))
  }

  // 6 — NOAA SWPC aurora
  if (aurora.status === 'fulfilled') {
    data.aurora = aurora.value
    sources.push(src('swpc', 'NOAA SWPC', 'Planetary K-index', 'live', `Kp ${aurora.value.kp} · peak ${aurora.value.kpMax.toFixed(0)}`, 'https://www.swpc.noaa.gov/'))
  } else {
    sources.push(src('swpc', 'NOAA SWPC', 'Planetary K-index', 'mock', 'unreachable — simulated', 'https://www.swpc.noaa.gov/'))
  }

  // Rebuild the events feed from whatever data we ended up with.
  data.events = buildEvents(data.days, data.aurora)

  // 7–9 — Derived / reference feeds (always available, transparently labelled)
  sources.push(src('vegvesen', 'Statens Vegvesen', 'Road surface & status', 'cached', 'modelled from forecast', 'https://www.vegvesen.no/trafikk/'))
  sources.push(src('cameras', 'Road cameras', 'Vegvesen · kamerakartet', 'cached', 'public webcam feeds', 'https://kamerakartet.no/'))
  sources.push(src('hems', 'Norsk Luftambulanse', 'HEMS flyability (derived)', 'cached', 'derived from MET wind/cloud', 'https://norskluftambulanse.no/'))

  return { data, sources }
}

export function useWeather(id: LocationId) {
  const [data, setData] = useState<LocationWeather>(() => mockLocationWeather(locationById(id)))
  const [sources, setSources] = useState<SourceStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setData(mockLocationWeather(locationById(id)))
    load(id)
      .then((res) => {
        if (cancelled) return
        setData(res.data)
        setSources(res.sources)
      })
      .catch(() => {
        /* load() never rejects; keep the generated baseline if it ever does */
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [id, nonce])

  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000)
    return () => clearInterval(t)
  }, [])

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  return { data, sources, loading, refresh, updatedAgo: relAge(data.updated) }
}
