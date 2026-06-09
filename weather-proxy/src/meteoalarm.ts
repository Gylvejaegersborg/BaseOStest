import { XMLParser } from 'fast-xml-parser'
import { CACHE_TTL_MS } from './config.js'
import type { AlertItem, AlertSeverity } from './types.js'

// Fetches a EUMETNET MeteoAlarm country feed (legacy ATOM, key-less but
// CORS-blocked for browsers), parses the embedded CAP fields and normalises
// them. Optionally filters to alerts whose polygon contains a lat/lon.
//
// Feed: https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-<country>

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', removeNSPrefix: true })

interface Cached {
  at: number
  items: AlertItem[]
}
const cache = new Map<string, Cached>()

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
}

const COLOR_LEVEL: Record<string, number> = { green: 1, yellow: 2, orange: 3, red: 4 }

function severityOf(s: string | undefined): AlertSeverity {
  const v = (s ?? '').toLowerCase()
  if (v === 'minor' || v === 'moderate' || v === 'severe' || v === 'extreme') return v
  return 'unknown'
}

// MeteoAlarm puts the awareness colour in the entry title, e.g.
// "Yellow Wind Warning issued for Norway - <area>".
function colorFromTitle(title: string): { color: string; level: number } {
  const m = title.match(/\b(green|yellow|orange|red)\b/i)
  const color = m ? m[1].toLowerCase() : 'yellow'
  return { color, level: COLOR_LEVEL[color] ?? 2 }
}

// Ray-casting point-in-polygon. Polygon string is "lat,lon lat,lon …".
function polygonContains(polygon: string, lat: number, lon: number): boolean {
  const pts = polygon
    .trim()
    .split(/\s+/)
    .map((p) => p.split(',').map(Number))
    .filter((p) => p.length === 2 && !p.some(Number.isNaN)) as [number, number][]
  if (pts.length < 3) return false
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [yi, xi] = pts[i] // [lat, lon]
    const [yj, xj] = pts[j]
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

interface Entry {
  identifier?: string
  id?: string
  areaDesc?: string
  event?: string
  severity?: string
  sent?: string
  onset?: string
  expires?: string
  title?: string
  polygon?: string | string[]
  link?: { '@_type'?: string; '@_href'?: string } | { '@_type'?: string; '@_href'?: string }[]
}

function capUrl(entry: Entry): string | undefined {
  for (const l of asArray(entry.link)) if (l['@_type'] === 'application/cap+xml') return l['@_href']
  return undefined
}

function toItem(entry: Entry, country: string): AlertItem {
  const title = String(entry.title ?? entry.event ?? 'Weather warning')
  const { color, level } = colorFromTitle(title)
  return {
    id: String(entry.identifier ?? entry.id ?? `${title}-${entry.onset ?? ''}`),
    country,
    area: String(entry.areaDesc ?? 'Unknown area'),
    event: String(entry.event ?? 'Weather warning'),
    severity: severityOf(entry.severity),
    awarenessLevel: level,
    color,
    headline: title,
    sent: entry.sent,
    onset: entry.onset,
    expires: entry.expires,
    url: capUrl(entry),
  }
}

async function fetchFeed(country: string): Promise<AlertItem[]> {
  const cached = cache.get(country)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.items

  const url = `https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-${country}`
  const res = await fetch(url, { headers: { 'user-agent': 'baseos-weather-proxy/0.1 (+self-hosted)' } })
  if (!res.ok) throw new Error(`meteoalarm ${res.status}`)
  const xml = await res.text()
  const doc = parser.parse(xml) as { feed?: { entry?: Entry | Entry[] } }
  const entries = asArray(doc.feed?.entry)
  const items = entries.map((e) => ({ entry: e, item: toItem(e, country) }))
  // Stash polygons alongside for optional filtering, but only return items.
  polygonsByCountry.set(country, items.map((x) => ({ id: x.item.id, polys: asArray(x.entry.polygon).map(String) })))
  const list = items.map((x) => x.item)
  cache.set(country, { at: Date.now(), items: list })
  return list
}

// Polygons are kept separately so AlertItem stays small for the client.
const polygonsByCountry = new Map<string, { id: string; polys: string[] }[]>()

export async function getAlerts(country: string, point?: { lat: number; lon: number }): Promise<AlertItem[]> {
  const items = await fetchFeed(country)
  if (!point) return items
  const polys = polygonsByCountry.get(country) ?? []
  const byId = new Map(polys.map((p) => [p.id, p.polys]))
  // Keep an alert if any of its polygons contains the point. Alerts with no
  // polygon are kept (can't prove they're irrelevant).
  return items.filter((a) => {
    const ps = byId.get(a.id) ?? []
    if (ps.length === 0) return true
    return ps.some((poly) => polygonContains(poly, point.lat, point.lon))
  })
}
