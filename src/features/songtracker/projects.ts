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

/** ISΛRK's ongoing song projects. Empty on purpose: the earlier ones were test
 *  data, and a real song's stage/tasks aren't known here. Songs arrive from the
 *  OS overlay (an agent adds one) — nothing is invented in code. */
export const SONG_PROJECTS: SongProject[] = []

export interface Release {
  id: string
  title: string
  date: string
}

/** Recently shipped — shown as a small archive strip. Empty until something
 *  real ships (the earlier entries were test data claiming releases that never
 *  happened). */
export const RECENT_RELEASES: Release[] = []
