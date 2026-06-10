import express from 'express'
import cors from 'cors'
import { ALLOWED_ORIGIN, METEOALARM_COUNTRY, PORT } from './config.js'
import { getAlerts } from './meteoalarm.js'
import { fetchMetOffice, metOfficeConfigured, NotConfigured } from './metoffice.js'

// Tiny proxy for weather providers the browser can't reach directly — either
// because they need an API key (kept server-side) or block CORS. The Weather
// section calls this when VITE_WEATHER_PROXY_URL is set; otherwise it runs on
// its live browser-reachable feeds + generated fallback.

const app = express()
app.use(cors({ origin: ALLOWED_ORIGIN }))

app.get('/health', (_req, res) => {
  res.json({ ok: true, providers: { meteoalarm: true, metoffice: metOfficeConfigured() } })
})

// EUMETNET MeteoAlarm severe-weather alerts. Key-less upstream, but CORS-blocked
// for browsers — this normalises the CAP feed to JSON. Optional lat/lon filters
// to alerts whose polygon contains the point.
app.get('/meteoalarm', async (req, res) => {
  const country = String(req.query.country ?? METEOALARM_COUNTRY).toLowerCase()
  const lat = req.query.lat != null ? Number(req.query.lat) : undefined
  const lon = req.query.lon != null ? Number(req.query.lon) : undefined
  const point = lat != null && lon != null && !Number.isNaN(lat) && !Number.isNaN(lon) ? { lat, lon } : undefined
  try {
    const alerts = await getAlerts(country, point)
    res.json({ country, count: alerts.length, alerts })
  } catch (e) {
    res.status(502).json({ error: String(e) })
  }
})

// Met Office Weather DataHub (keyed). 503 until METOFFICE_API_KEY is set.
app.get('/metoffice', async (req, res) => {
  const lat = Number(req.query.lat)
  const lon = Number(req.query.lon)
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    res.status(400).json({ error: 'lat and lon required' })
    return
  }
  const timesteps = req.query.timesteps === 'hourly' ? 'hourly' : 'daily'
  try {
    res.json(await fetchMetOffice(lat, lon, timesteps))
  } catch (e) {
    if (e instanceof NotConfigured) {
      res.status(503).json({ error: 'met office not configured — set METOFFICE_API_KEY' })
      return
    }
    res.status(502).json({ error: String(e) })
  }
})

app.listen(PORT, () => {
  console.log(`[weather-proxy] listening on :${PORT} (cors: ${ALLOWED_ORIGIN})`)
  console.log(`[weather-proxy] meteoalarm: on · metoffice: ${metOfficeConfigured() ? 'keyed' : 'not configured'}`)
})
