import type { AqiBand, AuroraBand, FlyBand, UvBand } from './types'

/** Compass label for a "from" wind direction in degrees. */
export function windArrowDir(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

/** m/s → Beaufort-ish descriptor used in the quick panels. */
export function windLabel(ms: number): string {
  if (ms < 0.5) return 'Calm'
  if (ms < 3.4) return 'Light'
  if (ms < 8) return 'Moderate'
  if (ms < 13.9) return 'Fresh'
  if (ms < 24.5) return 'Gale'
  return 'Storm'
}

export const AQI_META: Record<AqiBand, { label: string; color: string }> = {
  low: { label: 'Low', color: '#46d369' },
  moderate: { label: 'Moderate', color: '#f0a020' },
  high: { label: 'High', color: '#ff8a3d' },
  severe: { label: 'Severe', color: '#ff5566' },
}

export const FLY_META: Record<FlyBand, { label: string; color: string }> = {
  good: { label: 'Good', color: '#46d369' },
  marginal: { label: 'Marginal', color: '#f0a020' },
  poor: { label: 'Poor', color: '#ff5566' },
}

/** Wind-chill (Environment Canada formula) for cold + wind, else air temp. */
export function feelsLike(temp: number, windMs: number): number {
  if (temp > 10 || windMs < 1.3) return temp
  const v = (windMs * 3.6) ** 0.16 // wind in km/h, powered
  const wc = 13.12 + 0.6215 * temp - 11.37 * v + 0.3965 * temp * v
  return Math.round(wc * 10) / 10
}

export const WEATHER_ACCENT = '#58b6f0'

// ── UV index ─────────────────────────────────────────────────────────────────
export function uvBand(uv: number): UvBand {
  if (uv < 3) return 'low'
  if (uv < 6) return 'moderate'
  if (uv < 8) return 'high'
  if (uv < 11) return 'very-high'
  return 'extreme'
}

export const UV_META: Record<UvBand, { label: string; color: string }> = {
  low: { label: 'Low', color: '#46d369' },
  moderate: { label: 'Moderate', color: '#f0c020' },
  high: { label: 'High', color: '#f0a020' },
  'very-high': { label: 'Very high', color: '#ff5566' },
  extreme: { label: 'Extreme', color: '#b58bff' },
}

// ── European AQI (0–100+) ────────────────────────────────────────────────────
export function euroAqiBand(v: number): AqiBand {
  if (v < 25) return 'low'
  if (v < 50) return 'moderate'
  if (v < 75) return 'high'
  return 'severe'
}

// ── Aurora ───────────────────────────────────────────────────────────────────
export const AURORA_META: Record<AuroraBand, { label: string; color: string }> = {
  none: { label: 'Quiet', color: '#6b7785' },
  low: { label: 'Low', color: '#46d369' },
  moderate: { label: 'Active', color: '#36e0c8' },
  high: { label: 'Storm', color: '#b58bff' },
}
