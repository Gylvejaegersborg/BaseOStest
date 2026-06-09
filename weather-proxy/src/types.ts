export type AlertSeverity = 'minor' | 'moderate' | 'severe' | 'extreme' | 'unknown'

/** Normalised severe-weather alert returned to the app. */
export interface AlertItem {
  id: string
  country: string
  area: string
  event: string // "Wind", "Snow/Ice", "Rain", …
  severity: AlertSeverity
  awarenessLevel: number // 1 green · 2 yellow · 3 orange · 4 red
  color: string // "green" | "yellow" | "orange" | "red"
  headline: string
  sent?: string
  onset?: string
  expires?: string
  url?: string
}
