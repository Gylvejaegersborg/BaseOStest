export type Stage = 'record' | 'mix' | 'master' | 'tag' | 'upload' | 'distribute'

export const STAGES: { id: Stage; label: string }[] = [
  { id: 'record', label: 'Record' },
  { id: 'mix', label: 'Mix' },
  { id: 'master', label: 'Master' },
  { id: 'tag', label: 'Tag' },
  { id: 'upload', label: 'Upload' },
  { id: 'distribute', label: 'Distribute' },
]

export function stageIndex(stage: Stage): number {
  return STAGES.findIndex((s) => s.id === stage)
}

export interface Task {
  id: string
  label: string
  done: boolean
  /** surfaced in the "Today" panel */
  today: boolean
}

export interface SongProject {
  id: string
  title: string
  stage: Stage
  bpm: number
  musicalKey: string
  accent: string
  note?: string
  tasks: Task[]
}

/** ISΛRK's current ongoing song projects. */
export const SONG_PROJECTS: SongProject[] = [
  {
    id: 'nightdrive',
    title: 'Nightdrive',
    stage: 'mix',
    bpm: 140,
    musicalKey: 'F# min',
    accent: '#f0a020',
    note: 'Synthwave-leaning, needs more low-end weight in the drop.',
    tasks: [
      { id: 'nd1', label: 'Recut verse 2 vocal — pitch drift on the long notes', done: false, today: true },
      { id: 'nd2', label: 'Pick adlib takes (3 comps to choose from)', done: false, today: true },
      { id: 'nd3', label: 'Tighten drum bus — sidechain the kick', done: false, today: false },
      { id: 'nd4', label: 'Print rough mix for the car test', done: true, today: false },
    ],
  },
  {
    id: 'echoes',
    title: 'Echoes of None',
    stage: 'master',
    bpm: 92,
    musicalKey: 'C min',
    accent: '#36e0c8',
    note: 'Final single off the EP. Reference against the playlist average.',
    tasks: [
      { id: 'ec1', label: 'Final master pass — target -10 LUFS, -1 dBTP ceiling', done: false, today: true },
      { id: 'ec2', label: 'A/B against reference playlist on monitors', done: false, today: false },
      { id: 'ec3', label: 'Export 24-bit/48k master + MP3 ref', done: false, today: false },
      { id: 'ec4', label: 'Sign off mix revision 4', done: true, today: false },
    ],
  },
  {
    id: 'faded',
    title: 'Faded Lines',
    stage: 'record',
    bpm: 128,
    musicalKey: 'A min',
    accent: '#e0408a',
    note: 'Early days — hook is there, verses still loose.',
    tasks: [
      { id: 'fl1', label: 'Lay scratch vocal for verse 1', done: false, today: true },
      { id: 'fl2', label: 'Finish writing the second hook', done: false, today: false },
      { id: 'fl3', label: 'Comp the guitar takes', done: false, today: false },
    ],
  },
  {
    id: 'afterglow',
    title: 'Afterglow',
    stage: 'tag',
    bpm: 110,
    musicalKey: 'G maj',
    accent: '#46d369',
    note: 'Mixed + mastered, just needs metadata before upload.',
    tasks: [
      { id: 'ag1', label: 'Embed ISRC + final artwork', done: false, today: true },
      { id: 'ag2', label: 'Write release notes / credits', done: false, today: false },
      { id: 'ag3', label: 'Confirm split sheet with the feature', done: true, today: false },
    ],
  },
  {
    id: 'static',
    title: 'Slow Static',
    stage: 'distribute',
    bpm: 85,
    musicalKey: 'D min',
    accent: '#a78bfa',
    note: 'Out to DSPs — confirm delivery and line up the rollout.',
    tasks: [
      { id: 'ss1', label: 'Confirm DSP delivery (Spotify + Apple)', done: false, today: true },
      { id: 'ss2', label: 'Schedule release-day socials', done: false, today: false },
      { id: 'ss3', label: 'Submit to editorial playlists', done: true, today: false },
    ],
  },
]

export interface Release {
  id: string
  title: string
  date: string
}

/** Recently shipped — shown as a small archive strip. */
export const RECENT_RELEASES: Release[] = [
  { id: 'r1', title: 'Hollow', date: '12 May' },
  { id: 'r2', title: 'Paper Moons', date: '28 Apr' },
  { id: 'r3', title: 'Undertow', date: '05 Apr' },
]
