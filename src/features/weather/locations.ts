import type { LocationId } from './types'

export interface LocationMeta {
  id: LocationId
  name: string
  region: string
  lat: number
  lon: number
  altitude: number // metres, used for MET msl correction
  blurb: string
}

// The three places this app is built around. Coordinates are the town centres
// (Trysil uses the resort valley floor); altitude drives MET's height model.
export const LOCATIONS: LocationMeta[] = [
  {
    id: 'oslo',
    name: 'Oslo',
    region: 'Oslo',
    lat: 59.9139,
    lon: 10.7522,
    altitude: 23,
    blurb: 'Capital, inner Oslofjord. Maritime-tempered but continental in winter.',
  },
  {
    id: 'hamar',
    name: 'Hamar',
    region: 'Innlandet',
    lat: 60.7945,
    lon: 11.068,
    altitude: 130,
    blurb: 'Shore of Mjøsa. Inland — wide temperature swings, fog off the lake.',
  },
  {
    id: 'trysil',
    name: 'Trysil',
    region: 'Innlandet',
    lat: 61.3149,
    lon: 12.2761,
    altitude: 360,
    blurb: "Norway's biggest ski resort. Cold, snowy, mountain microclimate.",
  },
]

export function locationById(id: LocationId): LocationMeta {
  return LOCATIONS.find((l) => l.id === id)!
}
