import type { HourPoint, LocationId, RoadCondition } from './types'

// Road-surface outlook for the key stretches around each location. Modelled
// from the MET forecast (surface temperature, precipitation type) and meant to
// be read alongside the live Statens Vegvesen feeds the cameras link to. The
// surface assessment is derived, not a live Datex II pull — labelled as such.

interface Stretch {
  id: string
  road: string
  stretch: string
}

const STRETCHES: Record<LocationId, Stretch[]> = {
  oslo: [
    { id: 'osl-e6', road: 'E6', stretch: 'Oslo – Gardermoen' },
    { id: 'osl-e18', road: 'E18', stretch: 'Oslo – Drammen' },
  ],
  hamar: [
    { id: 'ham-e6', road: 'E6', stretch: 'Hamar – Lillehammer' },
    { id: 'ham-rv3', road: 'Rv. 3', stretch: 'Hamar – Elverum' },
  ],
  trysil: [
    { id: 'try-rv25', road: 'Rv. 25', stretch: 'Elverum – Trysil' },
    { id: 'try-rv26', road: 'Rv. 26', stretch: 'Trysil – Riksgrensen' },
  ],
}

/** Pick the worst-case surface state from the next ~12 hours. */
export function deriveRoads(loc: LocationId, hours: HourPoint[]): RoadCondition[] {
  const window = hours.slice(0, 12)
  const minTemp = Math.min(...window.map((h) => h.temp))
  const precip = window.reduce((s, h) => s + h.precip, 0)
  const snowy = window.some((h) => /snow|sleet/.test(h.symbol))
  const wet = precip > 0.5

  let surface = 'Bare and dry'
  let status: RoadCondition['status'] = 'open'
  let message = 'Good driving conditions reported.'

  if (snowy && minTemp <= 1) {
    surface = 'Snow / packed ice'
    status = 'warning'
    message = 'Winter tyres essential. Reduced friction — keep distance.'
  } else if (minTemp <= 0 && wet) {
    surface = 'Risk of black ice'
    status = 'warning'
    message = 'Sub-zero with moisture — patchy ice likely on bridges.'
  } else if (wet) {
    surface = 'Wet'
    status = 'open'
    message = 'Wet surface — spray and longer braking distances.'
  }

  // Road surface usually runs a touch colder than the air on clear nights.
  const surfaceTemp = Math.round((minTemp - 1.5) * 10) / 10

  return STRETCHES[loc].map((s) => ({
    id: s.id,
    road: s.road,
    stretch: s.stretch,
    surface,
    temp: surfaceTemp,
    status,
    message,
  }))
}
