import { parseISO } from 'date-fns'
import type { Aurora, DayForecast, WeatherAlert, WeatherEvent } from './types'
import { cosmicEvents } from './astro'

const ALERT_TONE: Record<string, string> = {
  green: '#46d369',
  yellow: '#f0c020',
  orange: '#ff8a3d',
  red: '#ff5566',
}

function alertEvents(alerts: WeatherAlert[]): WeatherEvent[] {
  return alerts.map((a) => ({
    id: `alert-${a.id}`,
    kind: 'alert' as const,
    date: a.onset ?? new Date().toISOString(),
    title: `${a.event} · ${a.area}`,
    detail: a.headline,
    tone: ALERT_TONE[a.color] ?? '#f0a020',
  }))
}

// Builds the "what's coming" feed: notable weather pulled out of the daily
// forecast, an aurora alert when the geomagnetic forecast warrants it, and the
// locally-computed cosmic calendar (moon phases, solstices, meteor showers).

function weatherEvents(days: DayForecast[]): WeatherEvent[] {
  const out: WeatherEvent[] = []
  let frostFlagged = false
  for (const d of days.filter((x) => x.forecast)) {
    const date = parseISO(d.date)
    const add = (title: string, detail: string, tone: string) =>
      out.push({ id: `wx-${d.date}-${title}`, kind: 'weather', date: date.toISOString(), title, detail, tone })

    if (/snow/.test(d.symbol)) add('Snow likely', `${d.precipSum} mm, ${d.min}°–${d.max}°.`, '#cfe6ff')
    else if (d.precipSum >= 10) add('Heavy precipitation', `${d.precipSum} mm expected.`, '#58b6f0')
    if (d.windMax >= 12) add('Strong winds', `Gusting around ${Math.round(d.windMax)} m/s.`, '#f0a020')
    if (!frostFlagged && d.min <= 0) {
      add('First frost', `Down to ${d.min}° overnight — watch for ice.`, '#36e0c8')
      frostFlagged = true
    }
    if (d.max >= 25) add('Warm spell', `Up to ${d.max}° — summer heat.`, '#ff8a3d')
    if ((d.uvMax ?? 0) >= 6) add('High UV', `UV index peaks at ${Math.round(d.uvMax ?? 0)}.`, '#f0a020')
  }
  return out
}

function auroraEvent(aurora: Aurora): WeatherEvent[] {
  if (aurora.kpMax < 5) return []
  return [
    {
      id: `aurora-${aurora.kpMax}`,
      kind: 'aurora',
      date: new Date().toISOString(),
      title: `Aurora watch · Kp ${aurora.kpMax.toFixed(0)}`,
      detail: aurora.note,
      tone: '#b58bff',
    },
  ]
}

export function buildEvents(
  days: DayForecast[],
  aurora: Aurora,
  from = new Date(),
  alerts: WeatherAlert[] = [],
): WeatherEvent[] {
  // Official alerts first so they're never crowded out by the long-range calendar.
  const all = [...alertEvents(alerts), ...weatherEvents(days), ...auroraEvent(aurora), ...cosmicEvents(from, 45)]
  return all.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 20)
}
