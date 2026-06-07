// Normalised weather model shared across the Weather section. Raw payloads from
// MET Norway, Statens Vegvesen etc. are mapped into these shapes so the UI never
// has to care which source a value came from.

export type SourceState = 'live' | 'cached' | 'mock' | 'error'

/** One upstream feed and how it is doing right now. */
export interface SourceStatus {
  id: string
  name: string // short label, e.g. "MET Norway"
  detail: string // what it provides, e.g. "Locationforecast 2.0"
  state: SourceState
  /** Human note: "live · updated 2m ago", "blocked by CORS — using cached", … */
  note: string
  href?: string
}

/** A single point in time (an hour of forecast). */
export interface HourPoint {
  time: string // ISO 8601
  temp: number // °C, air temperature
  feelsLike: number // °C, wind-chill / heat-index adjusted
  windSpeed: number // m/s
  windGust?: number // m/s
  windDir: number // degrees the wind comes FROM
  humidity: number // %
  pressure: number // hPa
  cloud: number // % cloud area fraction
  precip: number // mm in the hour
  precipProb?: number // %
  symbol: string // MET symbol code, e.g. "partlycloudy_day"
}

/** Aggregated outlook for a whole day. */
export interface DayForecast {
  date: string // ISO date (yyyy-MM-dd)
  min: number
  max: number
  precipSum: number
  windMax: number
  symbol: string // representative midday symbol
  sunrise?: string
  sunset?: string
  uvMax?: number // peak UV index
  aqiMax?: number // peak European AQI
  /** True when this day is real forecast vs. climatology/mock beyond horizon. */
  forecast: boolean
}

export type AqiBand = 'low' | 'moderate' | 'high' | 'severe'

export interface AirQuality {
  aqi: number // 1–4 MET AQI band index
  band: AqiBand
  dominant: string // dominant pollutant, e.g. "PM2.5"
  pm25?: number
  pm10?: number
  no2?: number
  o3?: number
}

/** Derived helicopter/VFR flyability — modelled on how HEMS crews
 *  (e.g. Norsk Luftambulanse) read cloud base, visibility and wind. */
export type FlyBand = 'good' | 'marginal' | 'poor'

export interface HemsConditions {
  band: FlyBand
  ceilingFt: number // estimated cloud base, feet AGL
  visibilityKm: number
  windKt: number
  gustKt: number
  note: string
}

export interface RoadCondition {
  id: string
  road: string // e.g. "Rv. 3 / Rv. 25"
  stretch: string // e.g. "Hamar – Elverum"
  surface: string // "Bare", "Slush", "Snow/ice", …
  temp?: number // road surface temp °C if known
  status: 'open' | 'warning' | 'closed'
  message: string
}

export interface CameraFeed {
  id: string
  name: string
  road: string
  near: LocationId
  imageUrl: string // live still (refreshed with cache-buster)
  mapUrl?: string
}

export type LocationId = 'oslo' | 'trysil' | 'hamar'

export interface LocationWeather {
  locationId: LocationId
  updated: string // ISO, when this snapshot was assembled
  current: HourPoint
  /** Short-term nowcast precipitation (next ~90 min), if available. */
  nowcast?: { minutes: number; precip: number }[]
  hours: HourPoint[] // hourly, next ~48h
  days: DayForecast[] // daily outlook, ~9 days + climatology padding
  airQuality: AirQuality
  airQualitySeries: AqiPoint[] // hourly AQI, multi-day
  hems: HemsConditions
  uvHours: UvPoint[] // hourly UV index, multi-day
  aurora: Aurora
  moon: MoonInfo
  modelSpread: ModelSpread
  events: WeatherEvent[]
}

// ── UV ───────────────────────────────────────────────────────────────────────
export interface UvPoint {
  time: string
  uv: number
}

export type UvBand = 'low' | 'moderate' | 'high' | 'very-high' | 'extreme'

// ── Air-quality time series ──────────────────────────────────────────────────
export interface AqiPoint {
  time: string
  aqi: number // European AQI (0–100+)
  pm25?: number
  pm10?: number
  no2?: number
  o3?: number
}

// ── Aurora / geomagnetic (NOAA SWPC) ─────────────────────────────────────────
export interface KpPoint {
  time: string
  kp: number
  observed: boolean
}

export type AuroraBand = 'none' | 'low' | 'moderate' | 'high'

export interface Aurora {
  kp: number // current planetary K-index
  kpMax: number // peak over the forecast window
  forecast: KpPoint[]
  probability: number // % chance overhead/visible at this latitude
  band: AuroraBand
  darkNight: boolean // is there real darkness to see it (false in Nordic summer)
  note: string
}

// ── Moon ─────────────────────────────────────────────────────────────────────
export interface MoonInfo {
  phase: number // 0–1 through the synodic cycle
  illum: number // 0–1 illuminated fraction
  name: string // "Waxing gibbous", …
}

// ── Multi-model agreement (Open-Meteo: ECMWF / DWD / GFS / …) ────────────────
export interface ModelDatum {
  id: string
  label: string
  temp: number | null // current temp from this model
  precip24: number | null // next-24h precip
}

export type Agreement = 'high' | 'medium' | 'low'

export interface ModelSpread {
  models: ModelDatum[]
  meanTemp: number
  spread: number // °C between coldest and warmest model
  agreement: Agreement
}

// ── Upcoming weather + cosmic events ─────────────────────────────────────────
export type EventKind = 'weather' | 'cosmic' | 'aurora' | 'alert'

export interface WeatherEvent {
  id: string
  kind: EventKind
  date: string // ISO date or datetime
  title: string
  detail: string
  tone: string
}
