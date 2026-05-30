export type PackCategory = 'drum-kits' | 'melodies' | 'beat-packs'

export interface Pack {
  id: string
  name: string
  category: PackCategory
  format: string
  price: number
  description: string
  itemCount: number
  /** Two-stop gradient used as the cover. */
  gradient: [string, string]
}

export const PACK_CATEGORIES: Array<{ id: PackCategory; label: string; blurb: string }> = [
  {
    id: 'drum-kits',
    label: 'Drum Kits',
    blurb: 'Drums, percussion and one-shots — ready to drag into your DAW.',
  },
  {
    id: 'melodies',
    label: 'Melody Loops',
    blurb: 'Stems and loops keyed and tempo-tagged. Great as song starters.',
  },
  {
    id: 'beat-packs',
    label: 'Beat Packs',
    blurb: 'Curated bundles of finished beats around a vibe or a sound.',
  },
]

export const PACKS: Pack[] = [
  // ─── Drum Kits ──────────────────────────────────────────────────────────
  {
    id: 'low-end-trap-1',
    name: 'Low-End Trap Vol. 1',
    category: 'drum-kits',
    format: '142 samples · WAV + MIDI',
    price: 39.99,
    description: 'Subby 808s, tight snares and rolling hats tuned for modern trap.',
    itemCount: 142,
    gradient: ['#FF3D9F', '#14082E'],
  },
  {
    id: 'paper-room-drums',
    name: 'Paper Room Drums',
    category: 'drum-kits',
    format: '96 samples · WAV',
    price: 29.99,
    description: 'Lo-fi acoustic drums recorded in a small room. Crackly, warm.',
    itemCount: 96,
    gradient: ['#FFA559', '#5D3B7A'],
  },
  {
    id: 'drill-heads',
    name: 'Drill Heads',
    category: 'drum-kits',
    format: '108 samples · WAV + MIDI',
    price: 34.99,
    description: 'UK drill hats, slides and bell-y 808s with stock MIDI patterns.',
    itemCount: 108,
    gradient: ['#5EE6F0', '#14222B'],
  },

  // ─── Melody Loops ───────────────────────────────────────────────────────
  {
    id: 'nightlight-melodies',
    name: 'Nightlight Melodies',
    category: 'melodies',
    format: '24 loops · WAV stems · 80–140 BPM',
    price: 24.99,
    description: 'Late-night keys, plucked guitars and pads — all keyed.',
    itemCount: 24,
    gradient: ['#A78BFA', '#150A33'],
  },
  {
    id: 'velvet-keys',
    name: 'Velvet Keys',
    category: 'melodies',
    format: '18 loops · WAV stems',
    price: 19.99,
    description: 'Soulful Rhodes and grand-piano motifs with light tape saturation.',
    itemCount: 18,
    gradient: ['#FF8A65', '#2A0B33'],
  },
  {
    id: 'static-strings',
    name: 'Static Strings',
    category: 'melodies',
    format: '20 loops · WAV stems · 80–160 BPM',
    price: 22.99,
    description: 'Cinematic string passes — pizzicato, slow bows, dissonant pads.',
    itemCount: 20,
    gradient: ['#E63956', '#0A2540'],
  },

  // ─── Beat Packs ─────────────────────────────────────────────────────────
  {
    id: 'starter-bundle',
    name: 'Starter Bundle',
    category: 'beat-packs',
    format: '5 beats · MP3 leases',
    price: 99,
    description: 'A taste of the catalog — five MP3 leases at a discount.',
    itemCount: 5,
    gradient: ['#FFB48A', '#5D3B7A'],
  },
  {
    id: 'midnight-collection',
    name: 'Midnight Collection',
    category: 'beat-packs',
    format: '8 beats · WAV leases',
    price: 249,
    description: 'Eight dark/trap WAV leases curated around a night-drive mood.',
    itemCount: 8,
    gradient: ['#A78BFA', '#3B1E6E'],
  },
  {
    id: 'exclusive-vault',
    name: 'Exclusive Vault',
    category: 'beat-packs',
    format: '3 beats · Full exclusive rights',
    price: 899,
    description: 'Three rotating exclusives. Buy the bundle, the beats retire.',
    itemCount: 3,
    gradient: ['#F4A8E8', '#3A1B33'],
  },
]

export function formatPackPrice(n: number): string {
  return n >= 100 ? `$${n.toFixed(0)}` : `$${n.toFixed(2)}`
}
