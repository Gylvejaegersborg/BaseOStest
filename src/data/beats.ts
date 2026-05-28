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

const ARTIST = 'isark'

export const BEATS: Beat[] = [
  {
    id: 'nightshade',
    title: 'Nightshade',
    artist: ARTIST,
    bpm: 142,
    musicalKey: 'F# min',
    mood: ['Dark', 'Trap'],
    durationSec: 184,
    gradient: ['#A78BFA', '#3B1E6E'],
    plays: 18420,
    licenses: licenses(299),
    audioFile: '/beats/audio/nightshade.mp3',
    coverImage: '/beats/covers/nightshade.jpg',
  },
  {
    id: 'cold-storage',
    title: 'Cold Storage',
    artist: ARTIST,
    bpm: 138,
    musicalKey: 'C min',
    mood: ['Ambient', 'Drill'],
    durationSec: 167,
    gradient: ['#6B8AA6', '#0E2233'],
    plays: 9310,
    licenses: licenses(349),
    audioFile: '/beats/audio/cold-storage.mp3',
    coverImage: '/beats/covers/cold-storage.jpg',
  },
  {
    id: 'velvet-static',
    title: 'Velvet Static',
    artist: ARTIST,
    bpm: 150,
    musicalKey: 'A min',
    mood: ['Lo-fi', 'Soul'],
    durationSec: 201,
    gradient: ['#CC785C', '#3A1B12'],
    plays: 24087,
    licenses: licenses(399),
    audioFile: '/beats/audio/velvet-static.mp3',
    coverImage: '/beats/covers/velvet-static.jpg',
  },
  {
    id: 'lowlight',
    title: 'Lowlight',
    artist: ARTIST,
    bpm: 124,
    musicalKey: 'D min',
    mood: ['R&B', 'Smooth'],
    durationSec: 192,
    gradient: ['#CCFF00', '#27330A'],
    plays: 13755,
    licenses: licenses(279),
    audioFile: '/beats/audio/lowlight.mp3',
    coverImage: '/beats/covers/lowlight.jpg',
  },
  {
    id: 'concrete-bloom',
    title: 'Concrete Bloom',
    artist: ARTIST,
    bpm: 160,
    musicalKey: 'G min',
    mood: ['Hard', 'Drill'],
    durationSec: 158,
    gradient: ['#E0408A', '#3A0E22'],
    plays: 30219,
    licenses: licenses(449),
    audioFile: '/beats/audio/concrete-bloom.mp3',
    coverImage: '/beats/covers/concrete-bloom.jpg',
  },
  {
    id: 'signal-lost',
    title: 'Signal Lost',
    artist: ARTIST,
    bpm: 145,
    musicalKey: 'E min',
    mood: ['Experimental', 'Trap'],
    durationSec: 176,
    gradient: ['#36E0C8', '#0C3330'],
    plays: 7841,
    licenses: licenses(299),
    audioFile: '/beats/audio/signal-lost.mp3',
    coverImage: '/beats/covers/signal-lost.jpg',
  },
  {
    id: 'afterglow',
    title: 'Afterglow',
    artist: ARTIST,
    bpm: 130,
    musicalKey: 'Bb maj',
    mood: ['Warm', 'Pop'],
    durationSec: 199,
    gradient: ['#F0A020', '#3A2606'],
    plays: 16604,
    licenses: licenses(329),
    audioFile: '/beats/audio/afterglow.mp3',
    coverImage: '/beats/covers/afterglow.jpg',
  },
  {
    id: 'patient-zero',
    title: 'Patient Zero',
    artist: ARTIST,
    bpm: 155,
    musicalKey: 'F min',
    mood: ['Aggressive', 'Trap'],
    durationSec: 171,
    gradient: ['#FF5566', '#3A0E14'],
    plays: 21188,
    licenses: licenses(379),
    audioFile: '/beats/audio/patient-zero.mp3',
    coverImage: '/beats/covers/patient-zero.jpg',
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
