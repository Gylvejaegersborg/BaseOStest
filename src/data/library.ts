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

const ARTIST = 'ISΛRK'
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
    bpm: a.bpm ?? 120,
    musicalKey: a.musicalKey ?? '—',
    mood: a.tags,
    durationSec: a.durationSec ?? 30,
    gradient: a.gradient,
    plays: a.plays ?? 0,
    licenses: FREE_LICENSE,
    audioFile: a.audioFile,
    coverImage: a.coverImage,
    soundcloudUrl: a.soundcloudUrl,
  }
}

// ── Beats, derived from the shared store catalog ────────────────────────────
const BEAT_ASSETS: Asset[] = BEATS.map((b) => ({
  id: b.id,
  title: b.title,
  category: 'beat',
  artist: b.artist,
  date: '2025-0' + ((b.bpm % 8) + 1) + '-14',
  tags: b.mood,
  fileType: b.audioFile ? (b.audioFile.endsWith('.wav') ? 'wav' : 'mp3') : 'wav',
  fileSize: b.audioFile ? `${(b.durationSec * 0.34).toFixed(1)} MB` : `${(b.durationSec * 1.7).toFixed(1)} MB`,
  source: SOURCE,
  gradient: b.gradient,
  bpm: b.bpm,
  musicalKey: b.musicalKey,
  durationSec: b.durationSec,
  plays: b.plays,
  audioFile: b.audioFile,
  soundcloudUrl: b.audioFile ? 'https://soundcloud.com/itsisark' : undefined,
  note: `${b.bpm} BPM · ${b.musicalKey} instrumental. ${b.audioFile ? 'Mastered preview.' : 'Rough bounce — synth preview until the real file lands.'}`,
}))

// ── Everything else, authored here ──────────────────────────────────────────
const EXTRA_ASSETS: Asset[] = [
  // ── Songs (vocal takes over instrumentals) ──────────────────────────────
  {
    id: 'homerun-vox',
    title: 'Homerun (Vocal)',
    category: 'song',
    artist: ARTIST,
    date: '2025-03-02',
    tags: ['Hard', 'Trap', 'Vocal'],
    fileType: 'wav',
    fileSize: '41.8 MB',
    source: SOURCE,
    gradient: ['#FF7A55', '#3A0F18'],
    bpm: 140,
    musicalKey: 'A min',
    durationSec: 118,
    plays: 388,
    relatedId: 'homerun',
    audioFile: '/beats/audio/homerun.mp3',
    note: 'Full vocal take over the Homerun instrumental. Comp v3.',
  },
  {
    id: 'virtual-love-demo',
    title: 'Virtual Love (Demo)',
    category: 'song',
    artist: ARTIST,
    date: '2025-02-19',
    tags: ['Lo-fi', 'Vocal', 'Demo'],
    fileType: 'mp3',
    fileSize: '5.2 MB',
    source: SOURCE,
    gradient: ['#F4A8E8', '#3A1B33'],
    bpm: 110,
    musicalKey: 'C maj',
    durationSec: 58,
    plays: 144,
    relatedId: 'virtual-love',
    audioFile: '/beats/audio/virtual-love.mp3',
    note: 'Scratch vocal demo. Needs a real chorus.',
  },

  // ── Lyrics ──────────────────────────────────────────────────────────────
  {
    id: 'homerun-lyrics',
    title: 'Homerun — Lyrics',
    category: 'lyrics',
    artist: ARTIST,
    date: '2025-03-01',
    tags: ['Hard', 'Trap'],
    fileType: 'md',
    fileSize: '2 KB',
    source: SOURCE,
    gradient: ['#FF7A55', '#3A0F18'],
    relatedId: 'homerun',
    body: `# Homerun — Lyrics

**Hook**

> Swing it, swing it, out the park\\
> Lights down low, I'm the spark\\
> Two strikes, never miss the mark\\
> Homerun, leave 'em in the dark

**Verse 1**

Bases loaded, I been patient at the plate,\\
Every pitch they throw I'm reading, never take the bait.\\
Diamond on my neck, diamond where I operate,\\
Crowd up on their feet 'cause they know I'm 'bout to demonstrate.

**Bridge**

Round the bases, no brakes,\\
Slid in home for the team's sake.

_Status: hook final · verse 2 TBD_`,
  },
  {
    id: 'virtual-love-lyrics',
    title: 'Virtual Love — Lyrics',
    category: 'lyrics',
    artist: ARTIST,
    date: '2025-02-18',
    tags: ['Lo-fi', 'R&B'],
    fileType: 'txt',
    fileSize: '1 KB',
    source: SOURCE,
    gradient: ['#F4A8E8', '#3A1B33'],
    relatedId: 'virtual-love',
    body: `# Virtual Love — Lyrics

**Verse**

Blue light on your face at 4am,\\
Typing then deleting it again.\\
Pixels where your heartbeat should have been,\\
Falling for a window, not a friend.

**Hook**

Virtual love, virtual love,\\
Close enough to feel, never close enough.

_Draft 1 — rework second line, too on-the-nose._`,
  },
  {
    id: 'switch-hook',
    title: 'Switch — Hook ideas',
    category: 'lyrics',
    artist: 'ISΛRK × 10k.emraan',
    date: '2025-01-22',
    tags: ['Drill', 'Hard'],
    fileType: 'md',
    fileSize: '1 KB',
    source: SOURCE,
    gradient: ['#A78BFA', '#150A33'],
    relatedId: 'switch',
    body: `# Switch — Hook ideas

Trying a few directions for the 186bpm drill cut.

1. _"Switch lanes, switch up, never switch sides"_ — favourite
2. _"Flip it, flip it, watch the whole thing switch"_
3. _"Same me, new frame, you the one that switched"_

10k wants option 1 for his verse, doubled.`,
  },

  // ── Artwork ─────────────────────────────────────────────────────────────
  {
    id: 'isark-logo',
    title: 'ISΛRK — Logo Mark',
    category: 'artwork',
    artist: ARTIST,
    date: '2024-11-30',
    tags: ['Brand', 'Logo'],
    fileType: 'svg',
    fileSize: '14 KB',
    source: SOURCE,
    gradient: ['#36e0c8', '#0A2540'],
    note: 'Primary wordmark — the lambda-A logo. Vector master.',
  },
  {
    id: 'homerun-art',
    title: 'Homerun — Single Art',
    category: 'artwork',
    artist: ARTIST,
    date: '2025-03-01',
    tags: ['Cover', 'Single'],
    fileType: 'png',
    fileSize: '4.1 MB',
    source: SOURCE,
    gradient: ['#FF7A55', '#3A0F18'],
    relatedId: 'homerun',
    note: '3000×3000 single artwork for streaming + SoundCloud.',
  },
  {
    id: 'nightshade-art',
    title: 'Nightshade — Cover',
    category: 'artwork',
    artist: ARTIST,
    date: '2025-01-10',
    tags: ['Cover', 'Dark'],
    fileType: 'jpg',
    fileSize: '3.3 MB',
    source: SOURCE,
    gradient: ['#FF3D9F', '#14082E'],
    relatedId: 'nightshade',
    note: 'Moody single art. Considering a darker recolor.',
  },
  {
    id: 'virtual-love-art',
    title: 'Virtual Love — Cover',
    category: 'artwork',
    artist: ARTIST,
    date: '2025-02-15',
    tags: ['Cover', 'Lo-fi'],
    fileType: 'png',
    fileSize: '2.8 MB',
    source: SOURCE,
    gradient: ['#F4A8E8', '#3A1B33'],
    relatedId: 'virtual-love',
    note: 'CRT-glow cover for the lo-fi cut.',
  },

  // ── Music video ─────────────────────────────────────────────────────────
  {
    id: 'switch-video',
    title: 'Switch (Official Video)',
    category: 'music-video',
    artist: 'ISΛRK × 10k.emraan',
    date: '2025-02-04',
    tags: ['Drill', 'Official'],
    fileType: 'mp4',
    fileSize: '212 MB',
    source: SOURCE,
    gradient: ['#A78BFA', '#150A33'],
    relatedId: 'switch',
    videoUrl: 'https://soundcloud.com/itsisark',
    note: '1080p official video. Master export, color graded.',
  },

  // ── Social video ────────────────────────────────────────────────────────
  {
    id: 'homerun-reel',
    title: 'Homerun — IG Reel',
    category: 'social-video',
    artist: ARTIST,
    date: '2025-03-03',
    tags: ['Reel', 'Promo'],
    fileType: 'mp4',
    fileSize: '28 MB',
    source: SOURCE,
    gradient: ['#FF7A55', '#3A0F18'],
    relatedId: 'homerun',
    videoUrl: 'https://soundcloud.com/itsisark',
    note: '9:16 vertical snippet for Reels / TikTok. 22s hook loop.',
  },
  {
    id: 'studio-reel',
    title: 'Studio Reel — TikTok',
    category: 'social-video',
    artist: ARTIST,
    date: '2025-02-27',
    tags: ['BTS', 'Promo'],
    fileType: 'mov',
    fileSize: '46 MB',
    source: SOURCE,
    gradient: ['#36e0c8', '#0A2540'],
    videoUrl: 'https://soundcloud.com/itsisark',
    note: 'Behind-the-scenes cooking up Switch. Vertical.',
  },

  // ── Stems / trackouts ───────────────────────────────────────────────────
  {
    id: 'switch-stems',
    title: 'Switch — Trackouts',
    category: 'stem',
    artist: 'ISΛRK × 10k.emraan',
    date: '2025-01-20',
    tags: ['Stems', 'Drill'],
    fileType: 'zip',
    fileSize: '486 MB',
    source: SOURCE,
    gradient: ['#A78BFA', '#150A33'],
    relatedId: 'switch',
    note: '24 labeled WAV stems @ 24-bit/44.1k for the Exclusive license.',
  },
  {
    id: 'homerun-stems',
    title: 'Homerun — Stems',
    category: 'stem',
    artist: ARTIST,
    date: '2025-03-01',
    tags: ['Stems', 'Trap'],
    fileType: 'zip',
    fileSize: '512 MB',
    source: SOURCE,
    gradient: ['#FF7A55', '#3A0F18'],
    relatedId: 'homerun',
    note: 'Trackout pack — drums, 808, melody, FX busses.',
  },

  // ── Notes ───────────────────────────────────────────────────────────────
  {
    id: 'nightshade-mixnotes',
    title: 'Mix notes — Nightshade',
    category: 'note',
    artist: ARTIST,
    date: '2025-01-12',
    tags: ['Mix', 'Todo'],
    fileType: 'md',
    fileSize: '1 KB',
    source: 'Local',
    gradient: ['#FF3D9F', '#14082E'],
    relatedId: 'nightshade',
    body: `# Mix notes — Nightshade

- [ ] 808 too boomy below 40Hz — high-pass at 32
- [ ] Hat pattern fighting the snare on the turnaround
- [x] Side-chain pad to the kick (−3dB)
- [ ] Try a tape stop into the second drop

Reference: *Cold Storage* low end sits better — match it.`,
  },
  {
    id: 'release-plan',
    title: 'Release plan — Q3',
    category: 'note',
    artist: ARTIST,
    date: '2025-04-01',
    tags: ['Plan', 'Release'],
    fileType: 'md',
    fileSize: '2 KB',
    source: 'Local',
    gradient: ['#36e0c8', '#0A2540'],
    body: `# Release plan — Q3

| Week | Drop | Asset status |
| --- | --- | --- |
| W1 | Homerun (single) | art ✓ · master ✓ · video pending |
| W3 | Switch video | export ✓ · upload scheduled |
| W6 | Virtual Love | demo only — needs chorus |

**Priorities**

1. Lock the Homerun video before W1.
2. Push the Switch trackouts to the store as Exclusive.
3. Start the Nightshade re-mix.`,
  },
]

export const LIBRARY: Asset[] = [...BEAT_ASSETS, ...EXTRA_ASSETS]

/** Stable queue of every playable audio asset, as Beats, for the player. */
export const PLAYABLE_BEATS: Beat[] = LIBRARY.filter(isAudio).map(toBeat)

export const ALL_TAGS: string[] = [...new Set(LIBRARY.flatMap((a) => a.tags))].sort()

export function assetById(id: string): Asset | undefined {
  return LIBRARY.find((a) => a.id === id)
}
