import { BEATS, type Beat, type License } from './beats'

/**
 * The Artist / Beat DB catalog.
 *
 * This is the *private* counterpart to the public Beat Store: a searchable
 * library of every artist asset — beats, songs, lyrics, artwork, videos,
 * stems and notes. It is intentionally self-contained (its own data model and
 * helpers) so the whole library can later be lifted out of the OS and run as a
 * standalone app, with the OS acting only as a window into it.
 *
 * Audio assets are derived from the shared `BEATS` catalog so the store and the
 * DB never drift; everything else (lyrics, artwork, video, stems, notes) lives
 * here.
 */

export type AssetCategory =
  | 'beat'
  | 'song'
  | 'lyrics'
  | 'artwork'
  | 'music-video'
  | 'social-video'
  | 'stem'
  | 'note'

/** Broad bucket used to decide how an asset is previewed. */
export type FileKind = 'audio' | 'image' | 'video' | 'text' | 'archive'

export interface Asset {
  id: string
  title: string
  category: AssetCategory
  artist: string
  /** ISO date the asset was added / created. */
  date: string
  tags: string[]
  /** Underlying file extension label, e.g. 'wav', 'mp3', 'png', 'mp4', 'txt', 'zip'. */
  fileType: string
  /** Human-readable size, e.g. '38.2 MB'. */
  fileSize?: string
  /** Where it came from, e.g. 'SoundCloud · @itsisark'. */
  source?: string
  /** Two-stop gradient used as fallback art / accent when no image is present. */
  gradient: [string, string]
  note?: string

  // ── audio ────────────────────────────────────────────────
  bpm?: number
  musicalKey?: string
  durationSec?: number
  plays?: number
  /** Same-origin audio under /public/beats/audio/. Falls back to a synth preview. */
  audioFile?: string
  /** Uploaded through the Add-song flow (stored by the gateway). The overlay
   *  provider turns the file ids into audioFile / coverImage URLs. */
  uploaded?: boolean
  /** Lyrics of an uploaded song, as written down by the operator or an agent. */
  lyrics?: string
  /** Who else made it and what they did. Credits only; no splits are stored. */
  collaborators?: { name: string; role?: string }[]
  audioFileId?: string
  coverFileId?: string

  // ── image ────────────────────────────────────────────────
  /** Same-origin image under /public/library/. */
  coverImage?: string

  // ── video ────────────────────────────────────────────────
  /** Same-origin video under /public/library/. */
  videoFile?: string
  /** External embed / link (SoundCloud, YouTube…). */
  videoUrl?: string

  // ── text (lyrics / notes) ────────────────────────────────
  /** Markdown body for lyrics and notes. */
  body?: string

  // ── links / relations ────────────────────────────────────
  soundcloudUrl?: string
  /** id of a related asset (e.g. a song's instrumental). */
  relatedId?: string
}

const SOURCE = 'SoundCloud · @itsisark'

/** Map an asset to its preview bucket. */
export function fileKindOf(a: Asset): FileKind {
  switch (a.category) {
    case 'beat':
    case 'song':
      return 'audio'
    case 'artwork':
      return 'image'
    case 'music-video':
    case 'social-video':
      return 'video'
    case 'stem':
      return 'archive'
    case 'lyrics':
    case 'note':
      return 'text'
  }
}

export function isAudio(a: Asset): boolean {
  return fileKindOf(a) === 'audio'
}

const FREE_LICENSE: License[] = []

/** Build a `Beat` for the shared audio player from any audio asset. */
export function toBeat(a: Asset): Beat {
  return {
    id: a.id,
    title: a.title,
    artist: a.artist,
    bpm: a.bpm,
    musicalKey: a.musicalKey,
    mood: a.tags,
    durationSec: a.durationSec,
    gradient: a.gradient,
    plays: a.plays,
    licenses: FREE_LICENSE,
    audioFile: a.audioFile,
    coverImage: a.coverImage,
    soundcloudUrl: a.soundcloudUrl,
  }
}

// ── Beats, derived from the shared store catalog ────────────────────────────
// Sizes of the real audio files (measured).
const REAL_SIZES: Record<string, string> = { homerun: '4.3 MB', 'virtual-love': '2.1 MB', switch: '3.8 MB' }
const BEAT_ASSETS: Asset[] = BEATS.map((b) => ({
  id: b.id,
  title: b.title,
  category: 'beat',
  artist: b.artist,
  // When the audio was added to the repo (git: 62ca251), not an invented date.
  date: '2026-05-28',
  tags: b.mood,
  fileType: b.audioFile ? (b.audioFile.endsWith('.wav') ? 'wav' : 'mp3') : 'wav',
  fileSize: REAL_SIZES[b.id],
  source: SOURCE,
  gradient: b.gradient,
  bpm: b.bpm,
  musicalKey: b.musicalKey,
  durationSec: b.durationSec,
  audioFile: b.audioFile,
  soundcloudUrl: b.audioFile ? 'https://soundcloud.com/itsisark' : undefined,
}))

// Nothing else is authored here: the sample songs, artwork, videos and stems that used to sit in this list were invented and are gone.
// Everything else in the library comes from real uploads (the gateway) and agent entries (the overlay).
const EXTRA_ASSETS: Asset[] = []

export const LIBRARY: Asset[] = [...BEAT_ASSETS, ...EXTRA_ASSETS]

/** Stable queue of every playable audio asset, as Beats, for the player. */
export const PLAYABLE_BEATS: Beat[] = LIBRARY.filter(isAudio).map(toBeat)

export const ALL_TAGS: string[] = [...new Set(LIBRARY.flatMap((a) => a.tags))].sort()

export function assetById(id: string): Asset | undefined {
  return LIBRARY.find((a) => a.id === id)
}
