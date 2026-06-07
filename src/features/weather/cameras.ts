import type { CameraFeed, LocationId } from './types'

// Public road network cameras near each location. These reference Statens
// Vegvesen's open web-camera service (the same feeds aggregated by
// kamerakartet.no). Camera ids rotate over time, so the UI treats a failed
// image load gracefully and always offers a deep-link to the live map.
//
// Source: https://www.vegvesen.no/trafikk/  ·  https://kamerakartet.no/

const VV = (id: string) => `https://webkamera.atlas.vegvesen.no/public/kamera?id=${id}`

export const CAMERAS: CameraFeed[] = [
  {
    id: 'oslo-e6-furuset',
    name: 'E6 Furuset',
    road: 'E6',
    near: 'oslo',
    imageUrl: VV('1003001_1'),
    mapUrl: 'https://kamerakartet.no/',
  },
  {
    id: 'oslo-e18-filipstad',
    name: 'E18 Filipstad',
    road: 'E18',
    near: 'oslo',
    imageUrl: VV('1001003_1'),
    mapUrl: 'https://kamerakartet.no/',
  },
  {
    id: 'hamar-e6-mjosa',
    name: 'E6 Mjøsbrua',
    road: 'E6',
    near: 'hamar',
    imageUrl: VV('1604001_1'),
    mapUrl: 'https://kamerakartet.no/',
  },
  {
    id: 'hamar-rv3-elverum',
    name: 'Rv. 3 Hamar–Elverum',
    road: 'Rv. 3',
    near: 'hamar',
    imageUrl: VV('1605002_1'),
    mapUrl: 'https://kamerakartet.no/',
  },
  {
    id: 'trysil-rv25-trysilfjellet',
    name: 'Rv. 25 Trysilfjellet',
    road: 'Rv. 25',
    near: 'trysil',
    imageUrl: VV('1702001_1'),
    mapUrl: 'https://kamerakartet.no/',
  },
  {
    id: 'trysil-rv26-fv',
    name: 'Fv. Trysil sentrum',
    road: 'Fv. 2102',
    near: 'trysil',
    imageUrl: VV('1702003_1'),
    mapUrl: 'https://kamerakartet.no/',
  },
]

export function camerasNear(id: LocationId): CameraFeed[] {
  return CAMERAS.filter((c) => c.near === id)
}
