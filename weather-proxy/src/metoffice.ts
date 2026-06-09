import { METOFFICE_API_KEY } from './config.js'

// Met Office Weather DataHub (Site Specific) proxy — keyed. This is a scaffold:
// it wires the auth + request shape so the app can consume UK forecasts once a
// key is set, without ever exposing the key to the browser. When no key is
// configured it throws NotConfigured and the route answers 503.
//
// Docs: https://datahub.metoffice.gov.uk/  (API path/dataSource may need to
// match your subscription tier — adjust BASE/params accordingly.)

export class NotConfigured extends Error {
  constructor() {
    super('met office not configured')
  }
}

const BASE = 'https://data.hub.api.metoffice.gov.uk/sitespecific/v0/point'

export function metOfficeConfigured(): boolean {
  return Boolean(METOFFICE_API_KEY)
}

export interface MetOfficeResult {
  source: 'metoffice'
  latitude: number
  longitude: number
  /** Raw DataHub GeoJSON feature collection, passed through to the client. */
  data: unknown
}

export async function fetchMetOffice(
  lat: number,
  lon: number,
  timesteps: 'hourly' | 'daily' = 'daily',
): Promise<MetOfficeResult> {
  if (!METOFFICE_API_KEY) throw new NotConfigured()
  const url = `${BASE}/${timesteps}?latitude=${lat}&longitude=${lon}&dataSource=BD1`
  const res = await fetch(url, {
    headers: { accept: 'application/json', apikey: METOFFICE_API_KEY },
  })
  if (!res.ok) throw new Error(`metoffice ${res.status}`)
  const data = await res.json()
  return { source: 'metoffice', latitude: lat, longitude: lon, data }
}
