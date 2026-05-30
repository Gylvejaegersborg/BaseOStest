export type LicenseTier = 'MP3' | 'WAV' | 'Exclusive'

export interface License {
  tier: LicenseTier
  price: number
  note: string
}

export interface Beat {
  id: string
  title: string
  artist: string
  bpm: number
  musicalKey: string
  mood: string[]
  durationSec: number
  /** Two-stop gradient used as fallback cover art when no image is provided. */
  gradient: [string, string]
  plays: number
  licenses: License[]
  /** Same-origin audio file under /public/beats/audio/. Falls back to a synth preview if missing. */
  audioFile?: string
  /** Same-origin cover image under /public/beats/covers/. Falls back to generated art if missing. */
  coverImage?: string
  /** Optional public SoundCloud track URL. */
  soundcloudUrl?: string
}

export interface CartItem {
  beatId: string
  title: string
  tier: LicenseTier
  price: number
}

function licenses(exclusive: number): License[] {
  return [
    { tier: 'MP3', price: 24.99, note: 'Tagless MP3 · 5k streams' },
    { tier: 'WAV', price: 49.99, note: 'MP3 + WAV · 10k streams' },
    { tier: 'Exclusive', price: exclusive, note: 'Full rights · trackouts' },
  ]
}

const ARTIST = 'ISΛRK'

export const BEATS: Beat[] = [
  // ─── Real tracks ────────────────────────────────────────────────────────
  {
    id: 'homerun',
    title: 'Homerun',
    artist: ARTIST,
    bpm: 140,
    musicalKey: 'A min',
    mood: ['Hard', 'Trap'],
    durationSec: 113,
    gradient: ['#FF7A55', '#3A0F18'],
    plays: 412,
    licenses: licenses(329),
    audioFile: '/beats/audio/homerun.mp3',
  },
  {
    id: 'virtual-love',
    title: 'Virtual Love',
    artist: ARTIST,
    bpm: 110,
    musicalKey: 'C maj',
    mood: ['Lo-fi', 'Warm', 'Smooth'],
    durationSec: 55,
    gradient: ['#F4A8E8', '#3A1B33'],
    plays: 287,
    licenses: licenses(279),
    audioFile: '/beats/audio/virtual-love.mp3',
  },
  {
    id: 'switch',
    title: 'Switch',
    artist: 'ISΛRK × 10k.emraan',
    bpm: 186,
    musicalKey: 'C min',
    mood: ['Drill', 'Hard'],
    durationSec: 100,
    gradient: ['#A78BFA', '#150A33'],
    plays: 1024,
    licenses: licenses(449),
    audioFile: '/beats/audio/switch.mp3',
  },
  // ─── Placeholders (synth preview until real audio lands) ────────────────
  {
    id: 'nightshade',
    title: 'Nightshade',
    artist: ARTIST,
    bpm: 142,
    musicalKey: 'F# min',
    mood: ['Dark', 'Trap'],
    durationSec: 184,
    gradient: ['#FF3D9F', '#14082E'],
    plays: 18420,
    licenses: licenses(299),
  },
  {
    id: 'cold-storage',
    title: 'Cold Storage',
    artist: ARTIST,
    bpm: 138,
    musicalKey: 'C min',
    mood: ['Ambient', 'Drill'],
    durationSec: 167,
    gradient: ['#5EE6F0', '#14222B'],
    plays: 9310,
    licenses: licenses(349),
  },
  {
    id: 'lowlight',
    title: 'Lowlight',
    artist: ARTIST,
    bpm: 124,
    musicalKey: 'D min',
    mood: ['R&B', 'Smooth'],
    durationSec: 192,
    gradient: ['#FF8A65', '#2A0B33'],
    plays: 13755,
    licenses: licenses(279),
  },
  {
    id: 'signal-lost',
    title: 'Signal Lost',
    artist: ARTIST,
    bpm: 145,
    musicalKey: 'E min',
    mood: ['Experimental', 'Trap'],
    durationSec: 176,
    gradient: ['#E63956', '#0A2540'],
    plays: 7841,
    licenses: licenses(299),
  },
  {
    id: 'afterglow',
    title: 'Afterglow',
    artist: ARTIST,
    bpm: 130,
    musicalKey: 'Bb maj',
    mood: ['Warm', 'Pop'],
    durationSec: 199,
    gradient: ['#FFA559', '#5D3B7A'],
    plays: 16604,
    licenses: licenses(329),
  },
]

export const MOODS: string[] = [...new Set(BEATS.flatMap((b) => b.mood))].sort()

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.max(0, Math.floor(sec % 60))
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatPrice(n: number): string {
  return `$${n.toFixed(2)}`
}

export function formatPlays(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}
