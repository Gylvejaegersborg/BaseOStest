import { TECHNIQUE_INFO } from '../techniqueInfo'
import { computeCandidates, isComplete, isSolved, unitName } from './grid'
import { findNextStep } from './techniques'
import type { Step, TechniqueId } from './types'

export type HintLevel = 1 | 2 | 3 | 4
export const MAX_HINT_LEVEL: HintLevel = 4

export interface Hint {
  level: HintLevel
  technique: TechniqueId | null
  step: Step | null
  title: string
  message: string
  highlights: number[]
  units: number[]
  /** True only at the final level, when the move can be auto-applied. */
  canApply: boolean
  /** Stable id for the underlying move, so the same hint isn't counted twice. */
  signature: string
  kind: 'step' | 'mistake' | 'stuck' | 'solved'
}

function regionLabel(step: Step): string {
  if (step.units.length >= 1 && step.units.length <= 2) {
    return step.units.map(unitName).join(' and ')
  }
  return ''
}

function stepSignature(step: Step): string {
  const place = step.placements.map((p) => `${p.index}=${p.value}`).join(',')
  const elim = step.eliminations.map((e) => `${e.index}-${e.value}`).join(',')
  return `${step.technique}|${place}|${elim}`
}

/**
 * Build a hint for the current board at the requested disclosure level.
 * Hints are derived from the logical solver, not the player's pencil marks,
 * so they always reflect the next genuinely-available move.
 */
export function getHint(board: number[], solution: number[], level: HintLevel): Hint {
  // A wrong entry would make the logical solver misleading — flag it first.
  for (let i = 0; i < 81; i++) {
    if (board[i] !== 0 && solution[i] !== 0 && board[i] !== solution[i]) {
      return {
        level,
        technique: null,
        step: null,
        title: 'Check your entries',
        message:
          'One of the numbers you placed doesn’t match a solvable path from here. Use “Check” to find which cell to revisit before asking for more hints.',
        highlights: [],
        units: [],
        canApply: false,
        signature: 'mistake',
        kind: 'mistake',
      }
    }
  }

  if (isComplete(board)) {
    return {
      level,
      technique: null,
      step: null,
      title: isSolved(board) ? 'Solved' : 'Almost',
      message: isSolved(board)
        ? 'The grid is complete and correct. Nicely done.'
        : 'The grid is full but has a conflict — run “Check”.',
      highlights: [],
      units: [],
      canApply: false,
      signature: 'solved',
      kind: 'solved',
    }
  }

  const cands = computeCandidates(board)
  const step = findNextStep(cands)
  if (!step) {
    return {
      level,
      technique: null,
      step: null,
      title: 'No simple step',
      message:
        'No single logical move is available with the supported techniques. Double-check your pencil marks, or try “Check”.',
      highlights: [],
      units: [],
      canApply: false,
      signature: 'stuck',
      kind: 'stuck',
    }
  }

  const info = TECHNIQUE_INFO[step.technique]
  const region = regionLabel(step)
  const signature = stepSignature(step)

  if (level === 1) {
    return {
      level,
      technique: step.technique,
      step,
      title: 'Gentle nudge',
      message: `${info.nudge}${region ? ` Try starting with ${region}.` : ''}`,
      highlights: [],
      units: region ? step.units : [],
      canApply: false,
      signature,
      kind: 'step',
    }
  }

  if (level === 2) {
    return {
      level,
      technique: step.technique,
      step,
      title: `Technique: ${info.name}`,
      message: info.spot,
      highlights: [],
      units: [],
      canApply: false,
      signature,
      kind: 'step',
    }
  }

  if (level === 3) {
    return {
      level,
      technique: step.technique,
      step,
      title: `${info.name} — where to look`,
      message: `Look at the highlighted cells${region ? ` in ${region}` : ''}. ${info.spot}`,
      highlights: step.highlights,
      units: step.units,
      canApply: false,
      signature,
      kind: 'step',
    }
  }

  return {
    level,
    technique: step.technique,
    step,
    title: `${info.name} — the move`,
    message: step.explanation,
    highlights: step.highlights,
    units: step.units,
    canApply: step.placements.length > 0 || step.eliminations.length > 0,
    signature,
    kind: 'step',
  }
}
