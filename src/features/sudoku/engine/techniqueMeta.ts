import type { Difficulty, TechniqueId } from './types'

/** Solving-difficulty tier of each technique (1 easiest … 4 hardest). */
const TIER: Record<TechniqueId, number> = {
  nakedSingle: 1,
  hiddenSingle: 1,
  nakedPair: 2,
  hiddenPair: 2,
  pointingPair: 2,
  boxLineReduction: 2,
  nakedTriple: 3,
  hiddenTriple: 3,
  xWing: 4,
  xyWing: 4,
}

export function tierOfTechnique(t: TechniqueId): number {
  return TIER[t]
}

export const ALLOWED_TIER: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  expert: 4,
}

export function difficultyOfTier(tier: number): Difficulty {
  if (tier <= 1) return 'easy'
  if (tier === 2) return 'medium'
  if (tier === 3) return 'hard'
  return 'expert'
}
