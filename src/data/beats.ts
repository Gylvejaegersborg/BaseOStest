export type LicenseTier = 'MP3' | 'WAV' | 'Stems' | 'Exclusive'

export interface License {
  tier: LicenseTier
  /** Fixed price in USD, or 'negotiable' for tiers that require a quote. */
  price: number | 'negotiable'
  /** Short blurb shown on the license button. */
  note: string
  /** Longer description shown in the license detail modal. */
  details: string
  /** Bullet-point inclusions shown in the license detail modal. */
  highlights: string[]
}

export interface Beat {
  id: string
  title: string
  artist: string
  /** Only what is known: the sample BPM, key, mood, play counts and license prices were invented and are gone. */
  bpm?: number
  musicalKey?: string
  mood: string[]
  /** Measured from the real audio file. */
  durationSec?: number
  /** Two-stop gradient used as fallback cover art when no image is provided. */
  gradient: [string, string]
  plays?: number
  /** Empty until real licensing is set up. */
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

const ARTIST = 'ISΛRK'

export const BEATS: Beat[] = [
  // ─── Real tracks ────────────────────────────────────────────────────────
  {
    id: 'homerun',
    title: 'Homerun',
    artist: ARTIST,
    mood: [],
    durationSec: 113,
    gradient: ['#FF7A55', '#3A0F18'],
    licenses: [],
    audioFile: '/beats/audio/homerun.mp3',
  },
  {
    id: 'virtual-love',
    title: 'Virtual Love',
    artist: ARTIST,
    mood: [],
    durationSec: 55,
    gradient: ['#F4A8E8', '#3A1B33'],
    licenses: [],
    audioFile: '/beats/audio/virtual-love.mp3',
  },
  {
    id: 'switch',
    title: 'Switch',
    artist: 'ISΛRK × 10k.emraan',
    mood: [],
    durationSec: 100,
    gradient: ['#A78BFA', '#150A33'],
    licenses: [],
    audioFile: '/beats/audio/switch.mp3',
  },
  // ─── Placeholders (synth preview until real audio lands) ────────────────
]

export const MOODS: string[] = [...new Set(BEATS.flatMap((b) => b.mood))].sort()

/** The main contact for beats, bookings and licensing enquiries. */
export const CONTACT_EMAIL = 'isarkbeats@gmail.com'
/** Loops, instrumentals and similar. */
export const LOOPS_EMAIL = 'Loopsforisark@gmail.com'

/** Only the details that are known, e.g. "140 BPM · A min" (none are known for the sample tracks). */
export function beatSpecs(b: { bpm?: number; musicalKey?: string; durationSec?: number }): string[] {
  const out: string[] = []
  if (b.bpm) out.push(`${b.bpm} BPM`)
  if (b.musicalKey) out.push(b.musicalKey)
  if (b.durationSec) out.push(formatDuration(b.durationSec))
  return out
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.max(0, Math.floor(sec % 60))
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatPrice(n: number | 'negotiable'): string {
  if (n === 'negotiable') return 'Contact'
  return `$${n.toFixed(2)}`
}

export function formatPlays(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}
