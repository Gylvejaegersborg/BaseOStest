import { N, cellCandidates } from './grid'
import { countSolutions, solveWithTechniques } from './solver'
import { ALLOWED_TIER } from './techniqueMeta'
import type { Difficulty } from './types'

export interface GeneratedPuzzle {
  puzzle: number[]
  solution: number[]
  difficulty: Difficulty
  tier: number
}

/** Target number of given clues per band — the primary, always-achievable difficulty lever. */
const TARGET_CLUES: Record<Difficulty, number> = {
  easy: 38,
  medium: 30,
  hard: 27,
  expert: 23,
}

/** How many candidate puzzles to weigh before picking — more for harder bands to find richer puzzles. */
const ATTEMPTS: Record<Difficulty, number> = {
  easy: 3,
  medium: 5,
  hard: 6,
  expert: 8,
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** A complete, valid, randomly-generated solution grid. */
export function generateFullGrid(): number[] {
  const board = new Array(N).fill(0)
  const fill = (): boolean => {
    let idx = -1
    for (let i = 0; i < N; i++) {
      if (board[i] === 0) {
        idx = i
        break
      }
    }
    if (idx === -1) return true
    for (const v of shuffle(cellCandidates(board, idx))) {
      board[idx] = v
      if (fill()) return true
      board[idx] = 0
    }
    return false
  }
  fill()
  return board
}

const INDICES = Array.from({ length: N }, (_, i) => i)

function buildCandidate(difficulty: Difficulty): GeneratedPuzzle {
  const allowedTier = ALLOWED_TIER[difficulty]
  const targetRemove = N - TARGET_CLUES[difficulty]
  const solution = generateFullGrid()
  const puzzle = solution.slice()

  // Carve toward the target clue count while keeping the solution unique.
  let removedCount = 0
  for (const i of shuffle(INDICES)) {
    if (removedCount >= targetRemove) break
    const saved = puzzle[i]
    puzzle[i] = 0
    if (countSolutions(puzzle, 2) !== 1) puzzle[i] = saved
    else removedCount++
  }

  // Ensure it's solvable within the band's technique ceiling; restore clues if too hard.
  let grade = solveWithTechniques(puzzle)
  const removed = shuffle(INDICES.filter((i) => puzzle[i] === 0))
  let ri = 0
  while ((!grade.solved || grade.tier > allowedTier) && ri < removed.length) {
    puzzle[removed[ri]] = solution[removed[ri]]
    ri++
    grade = solveWithTechniques(puzzle)
  }

  return { puzzle, solution, difficulty, tier: grade.tier }
}

/**
 * Generate a puzzle for the requested band. Difficulty is driven by clue count
 * (guaranteed monotonic) and bounded above by the band's technique tier. Among a
 * few candidates we keep the most technique-rich one so harder bands feel earned.
 */
export function generatePuzzle(difficulty: Difficulty): GeneratedPuzzle {
  let best: GeneratedPuzzle | null = null
  for (let attempt = 0; attempt < ATTEMPTS[difficulty]; attempt++) {
    const cand = buildCandidate(difficulty)
    if (!best || cand.tier > best.tier) best = cand
    // Tier already at the band ceiling — no point searching further.
    if (best.tier >= ALLOWED_TIER[difficulty]) break
  }
  return best!
}
