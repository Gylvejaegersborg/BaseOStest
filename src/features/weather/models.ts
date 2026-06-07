// Registry of every weather/space provider this section knows about, and how
// each is wired. Honesty matters here: only some expose free, key-less,
// browser-reachable APIs. The rest are either pulled in as models through the
// Open-Meteo ensemble, or registered but not connected (they need an API key or
// aren't CORS-reachable from the browser).

export type ProviderStatus =
  | 'live' // fetched directly, right now
  | 'ensemble' // contributes to the Open-Meteo multi-model spread
  | 'key' // registered — needs an API key / server proxy to connect
  | 'planned' // aspirational integration

export interface ProviderInfo {
  id: string
  name: string
  role: string
  status: ProviderStatus
  detail: string
  href?: string
}

export const STATUS_META: Record<ProviderStatus, { label: string; color: string }> = {
  live: { label: 'Live', color: '#46d369' },
  ensemble: { label: 'Ensemble', color: '#36e0c8' },
  key: { label: 'Needs key', color: '#6b7785' },
  planned: { label: 'Planned', color: '#9b7bff' },
}

export const PROVIDERS: ProviderInfo[] = [
  // ── Directly fetched ──
  { id: 'metno', name: 'MET Norway / Yr', role: 'Forecast, nowcast, sun', status: 'live', detail: 'Primary forecast backbone for Norway.', href: 'https://api.met.no/' },
  { id: 'openmeteo', name: 'Open-Meteo', role: 'Multi-model, UV, air quality', status: 'live', detail: 'Aggregates the national models below — UV + ensemble spread.', href: 'https://open-meteo.com/' },
  { id: 'swpc', name: 'NOAA SWPC', role: 'Aurora / geomagnetic', status: 'live', detail: 'Planetary K-index now + 3-day forecast.', href: 'https://www.swpc.noaa.gov/' },

  // ── Pulled in through the Open-Meteo ensemble ──
  { id: 'ecmwf', name: 'ECMWF', role: 'Global model (IFS)', status: 'ensemble', detail: 'European Centre for Medium-Range Weather Forecasts.', href: 'https://www.ecmwf.int/' },
  { id: 'dwd', name: 'Deutscher Wetterdienst', role: 'Global/regional (ICON)', status: 'ensemble', detail: 'German weather service ICON model.', href: 'https://www.dwd.de/' },
  { id: 'noaa', name: 'NOAA / NWS', role: 'Global model (GFS)', status: 'ensemble', detail: 'US National Weather Service GFS.', href: 'https://www.weather.gov/' },
  { id: 'meteofrance', name: 'Météo-France', role: 'Global/regional (ARPEGE)', status: 'ensemble', detail: 'French national models.', href: 'https://meteofrance.com/' },
  { id: 'jma', name: 'Japan Meteorological Agency', role: 'Global model (GSM)', status: 'ensemble', detail: 'JMA global model.', href: 'https://www.jma.go.jp/' },
  { id: 'eccc', name: 'Environment & Climate Change Canada', role: 'Global model (GEM)', status: 'ensemble', detail: 'Canadian GEM model.', href: 'https://weather.gc.ca/' },
  { id: 'bom', name: 'Bureau of Meteorology (AU)', role: 'Global model (ACCESS)', status: 'ensemble', detail: 'Australian ACCESS-G model.', href: 'http://www.bom.gov.au/' },

  // ── Registered, not connected (need keys / server proxy) ──
  { id: 'metoffice', name: 'The Met Office (UK)', role: 'Forecast + warnings', status: 'key', detail: 'DataHub API requires a key.', href: 'https://www.metoffice.gov.uk/' },
  { id: 'meteoalarm', name: 'EUMETNET MeteoAlarm', role: 'Severe-weather alerts', status: 'key', detail: 'Pan-European CAP alert feed (server-side).', href: 'https://meteoalarm.org/' },
  { id: 'weatherchannel', name: 'The Weather Channel', role: 'Consumer forecast', status: 'key', detail: 'IBM/TWC API requires a key.', href: 'https://weather.com/' },
  { id: 'breezometer', name: 'BreezoMeter (Google)', role: 'Air quality + pollen', status: 'key', detail: 'Now Google Maps Platform Air Quality — keyed.', href: 'https://www.breezometer.com/' },
  { id: 'qweather', name: 'QWeather', role: 'Forecast (Asia focus)', status: 'key', detail: 'Requires an API key.', href: 'https://www.qweather.com/' },
  { id: 'imd', name: 'India Meteorological Dept.', role: 'Regional forecast', status: 'key', detail: 'No open browser API.', href: 'https://mausam.imd.gov.in/' },
  { id: 'inmet', name: 'INMET (Brazil)', role: 'Regional forecast', status: 'key', detail: 'Instituto Nacional de Meteorologia.', href: 'https://portal.inmet.gov.br/' },
  { id: 'smn', name: 'Servicio Meteorológico Nacional', role: 'Regional forecast', status: 'key', detail: 'Mexico SMN.', href: 'https://smn.conagua.gob.mx/' },
  { id: 'tmd', name: 'Thai Meteorological Dept.', role: 'Regional forecast', status: 'key', detail: 'Requires registration.', href: 'https://www.tmd.go.th/' },
  { id: 'cma', name: 'CMA (China)', role: 'Regional forecast', status: 'key', detail: 'Public Meteorological Service Centre.', href: 'https://www.cma.gov.cn/en/' },

  // ── Aspirational ──
  { id: 'weathernext', name: 'Google WeatherNext 2', role: 'AI forecast model', status: 'planned', detail: 'DeepMind model via Earth Engine / Vertex AI — not browser-reachable.', href: 'https://deepmind.google/science/weathernext/' },
]
