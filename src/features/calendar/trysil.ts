// Real place names harvested from trysilnavn.no (a community database of ~11,500
// Trysil place names). Each links to its entry page. Pattern confirmed working:
//   https://trysilnavn.no/Ny/index.php?title=<name>

export interface TrysilPlace {
  name: string
  kind: string
}

export const TRYSIL_PLACES: TrysilPlace[] = [
  { name: 'Nordbyøya', kind: 'island in Trysilelva' },
  { name: 'Trysilelva', kind: 'the river' },
  { name: 'Jordet', kind: 'village' },
  { name: 'Innbygda', kind: 'village centre' },
  { name: 'Ormåshammeren', kind: 'crag' },
  { name: 'Engerneset', kind: 'headland' },
  { name: 'Nybergsund', kind: 'village' },
  { name: 'Plassen', kind: 'hamlet' },
  { name: 'Lutnes', kind: 'settlement' },
  { name: 'Drevjedalen', kind: 'valley' },
  { name: 'Elgsmyra', kind: 'the elk marsh' },
  { name: 'Fulufjellet', kind: 'mountain & national park' },
  { name: 'Ljørdalen', kind: 'valley' },
  { name: 'Femundselva', kind: 'river' },
]

export function trysilUrl(name: string): string {
  return `https://trysilnavn.no/Ny/index.php?title=${encodeURIComponent(name)}`
}

function dayIndex(d: Date): number {
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86_400_000)
}

/** Deterministic pick for the day; `offset` lets the user shuffle to another. */
export function dailyTrysilPlace(date: Date, offset = 0): TrysilPlace {
  const i = (((dayIndex(date) + offset) % TRYSIL_PLACES.length) + TRYSIL_PLACES.length) % TRYSIL_PLACES.length
  return TRYSIL_PLACES[i]
}
