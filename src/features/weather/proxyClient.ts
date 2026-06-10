import type { WeatherAlert } from './types'
import type { LocationMeta } from './locations'

// Talks to the optional weather-proxy (see /weather-proxy) for feeds the browser
// can't reach directly — currently EUMETNET MeteoAlarm severe-weather alerts.
// When VITE_WEATHER_PROXY_URL is unset the app simply runs without them.

const BASE = import.meta.env.VITE_WEATHER_PROXY_URL?.replace(/\/$/, '')

/** Whether a proxy URL is configured at build time. */
export function proxyConfigured(): boolean {
  return Boolean(BASE)
}

interface AlertsResponse {
  country: string
  count: number
  alerts: WeatherAlert[]
}

/** MeteoAlarm alerts whose polygon contains the location. Throws when the proxy
 *  is not configured or unreachable — useWeather decides how to degrade. */
export async function fetchAlerts(loc: LocationMeta, country = 'norway'): Promise<WeatherAlert[]> {
  if (!BASE) throw new Error('weather proxy not configured')
  const res = await fetch(`${BASE}/meteoalarm?country=${country}&lat=${loc.lat}&lon=${loc.lon}`, {
    headers: { accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`proxy ${res.status}`)
  const data = (await res.json()) as AlertsResponse
  return data.alerts ?? []
}
