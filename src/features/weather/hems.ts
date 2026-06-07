import type { HemsConditions, HourPoint, LocationId } from './types'

// Helicopter / VFR flyability, modelled the way an air-ambulance crew
// (e.g. Norsk Luftambulanse) reads a forecast: cloud base, visibility and wind.
// This is a transparent heuristic derived from the MET forecast — not an
// official NLA operational feed — and is labelled as such in the UI.

const MS_TO_KT = 1.94384

/** Magnus-formula dew point, used to estimate convective cloud base. */
function dewPoint(temp: number, rh: number): number {
  const a = 17.27
  const b = 237.7
  const g = (a * temp) / (b + temp) + Math.log(Math.max(rh, 1) / 100)
  return (b * g) / (a - g)
}

export function deriveHems(h: HourPoint): HemsConditions {
  const dp = dewPoint(h.temp, h.humidity)
  // ~400 ft of cloud base per °C of temp/dew-point spread, capped by cloud cover.
  const spreadBase = Math.max(200, (h.temp - dp) * 400)
  const coverFactor = 1 - (h.cloud / 100) * 0.7 // overcast lowers the effective base
  const ceilingFt = Math.round((spreadBase * coverFactor) / 100) * 100

  // Visibility: knock it down for precip and near-saturated air / fog.
  let vis = 20
  if (h.symbol.includes('fog')) vis = 0.6
  else if (h.precip > 4) vis = 2
  else if (h.precip > 1) vis = 5
  else if (h.humidity > 95) vis = 4
  else if (h.humidity > 88) vis = 9
  const visibilityKm = Math.round(vis * 10) / 10

  const windKt = Math.round(h.windSpeed * MS_TO_KT)
  const gustKt = Math.round((h.windGust ?? h.windSpeed * 1.4) * MS_TO_KT)

  let band: HemsConditions['band'] = 'good'
  if (ceilingFt < 700 || visibilityKm < 3 || gustKt > 40) band = 'poor'
  else if (ceilingFt < 1500 || visibilityKm < 6 || gustKt > 28) band = 'marginal'

  const note =
    band === 'good'
      ? 'VFR comfortable — full operational envelope.'
      : band === 'marginal'
        ? 'Reduced margins — IFR/NVG likely required.'
        : 'Below VFR minima — flight likely on hold or IFR-only.'

  return { band, ceilingFt, visibilityKm, windKt, gustKt, note }
}

export const HEMS_BASE: Record<LocationId, string> = {
  oslo: 'Lørenskog base (Oslo)',
  hamar: 'Dombås / Innlandet cover',
  trysil: 'Innlandet mountain cover',
}
