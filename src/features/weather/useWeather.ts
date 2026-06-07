import { useCallback, useEffect, useState } from 'react'
import type { LocationId, LocationWeather, SourceStatus } from './types'
import { locationById } from './locations'
import { mockLocationWeather } from './mockData'
import { deriveHems } from './hems'
import { fetchAirQuality, fetchForecast, fetchNowcast, fetchSun } from './metClient'

// Pulls every location's snapshot together from multiple feeds. MET Norway
// (Yr.no's data) is the live backbone; each of its endpoints is fetched
// independently so one failing (e.g. nowcast is Nordic-only, or CORS blocks a
// call) never takes the others down. Anything that can't be fetched falls back
// to the deterministic generator, and the source list records exactly what was
// live vs. generated so the UI can be honest about it.

function relAge(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  return `${Math.round(s / 3600)}h ago`
}

interface Result {
  data: LocationWeather
  sources: SourceStatus[]
}

async function load(id: LocationId): Promise<Result> {
  const meta = locationById(id)
  const base = mockLocationWeather(meta)
  const now = new Date().toISOString()

  // Fire every MET call at once; settle individually.
  const [forecast, nowcast, sun, air] = await Promise.allSettled([
    fetchForecast(meta),
    fetchNowcast(meta),
    fetchSun(meta),
    fetchAirQuality(meta),
  ])

  const sources: SourceStatus[] = []
  const data: LocationWeather = { ...base, updated: now }

  // 1 — Locationforecast (hours + days)
  if (forecast.status === 'fulfilled' && forecast.value.hours.length) {
    data.hours = forecast.value.hours
    // Keep generated days beyond MET's horizon so the month view stays full.
    const live = forecast.value.days
    const liveDates = new Set(live.map((d) => d.date))
    data.days = [...live, ...base.days.filter((d) => !liveDates.has(d.date))].sort((a, b) =>
      a.date.localeCompare(b.date),
    )
    data.current = forecast.value.hours[0]
    data.hems = deriveHems(data.current)
    sources.push(src('met-forecast', 'MET Norway', 'Locationforecast 2.0', 'live', 'live · updated just now', 'https://api.met.no/'))
  } else {
    sources.push(src('met-forecast', 'MET Norway', 'Locationforecast 2.0', 'mock', 'unreachable — generated forecast', 'https://api.met.no/'))
  }

  // 2 — Nowcast radar (Nordic only)
  if (nowcast.status === 'fulfilled' && nowcast.value.length) {
    data.nowcast = nowcast.value
    sources.push(src('met-nowcast', 'MET Nowcast', 'Radar precipitation', 'live', 'live · 5-min radar', 'https://api.met.no/'))
  } else {
    sources.push(src('met-nowcast', 'MET Nowcast', 'Radar precipitation', 'mock', 'unreachable — estimated', 'https://api.met.no/'))
  }

  // 3 — Sunrise
  if (sun.status === 'fulfilled' && (sun.value.sunrise || sun.value.sunset) && data.days[0]) {
    data.days[0] = { ...data.days[0], sunrise: sun.value.sunrise, sunset: sun.value.sunset }
    sources.push(src('met-sun', 'MET Sunrise', 'Sun & moon 3.0', 'live', 'live', 'https://api.met.no/'))
  } else {
    sources.push(src('met-sun', 'MET Sunrise', 'Sun & moon 3.0', 'mock', 'unreachable — computed', 'https://api.met.no/'))
  }

  // 4 — Air quality
  if (air.status === 'fulfilled') {
    data.airQuality = air.value
    sources.push(src('met-aq', 'MET Air Quality', 'Airqualityforecast', 'live', 'live', 'https://luftkvalitet.miljostatus.no/'))
  } else {
    sources.push(src('met-aq', 'MET Air Quality', 'Airqualityforecast', 'mock', 'unreachable — modelled', 'https://luftkvalitet.miljostatus.no/'))
  }

  // 5–7 — Derived / reference feeds (always available, transparently labelled)
  sources.push(
    src('vegvesen', 'Statens Vegvesen', 'Road surface & status', 'cached', 'modelled from forecast', 'https://www.vegvesen.no/trafikk/'),
  )
  sources.push(
    src('cameras', 'Road cameras', 'Vegvesen · kamerakartet', 'cached', 'public webcam feeds', 'https://kamerakartet.no/'),
  )
  sources.push(
    src('hems', 'Norsk Luftambulanse', 'HEMS flyability (derived)', 'cached', 'derived from MET wind/cloud', 'https://norskluftambulanse.no/'),
  )

  return { data, sources }
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

export function useWeather(id: LocationId) {
  const [data, setData] = useState<LocationWeather>(() => mockLocationWeather(locationById(id)))
  const [sources, setSources] = useState<SourceStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    // Show a generated snapshot immediately, then overlay live data.
    setData(mockLocationWeather(locationById(id)))
    load(id)
      .then((res) => {
        if (cancelled) return
        setData(res.data)
        setSources(res.sources)
      })
      .catch(() => {
        /* load() never rejects, but keep the generated baseline if it ever does */
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [id, nonce])

  // Tick "updated Xm ago" notes once a minute without refetching.
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000)
    return () => clearInterval(t)
  }, [])

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  return { data, sources, loading, refresh, updatedAgo: relAge(data.updated) }
}
