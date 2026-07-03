import { ACTIVE_CELLS, TOTAL } from './geometry'
import { cellCandidates, countSolutions } from './solver'

export type SamuraiDifficulty = 'easy' | 'medium' | 'hard'

export interface GeneratedSamuraiPuzzle {
  puzzle: number[]
  solution: number[]
  difficulty: SamuraiDifficulty
}

/** Target given-clue counts out of 369 active cells — lower is harder. */
const TARGET_CLUES: Record<SamuraiDifficulty, number> = {
  easy: 210,
  medium: 180,
  hard: 155,
}

/** Wall-clock budget for the hole-digging pass — a big board makes exhaustive digging too slow. */
const DIG_BUDGET_MS = 4500

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** A complete, valid, randomly-generated solution grid across all five sub-grids. */
export function generateFullGrid(): number[] {
  const board = new Array(TOTAL).fill(0)
  const fill = (): boolean => {
    let idx = -1
    let bestCands: number[] | null = null
    for (const i of ACTIVE_CELLS) {
      if (board[i] !== 0) continue
      const c = cellCandidates(board, i)
      if (c.length === 0) return false
      if (!bestCands || c.length < bestCands.length) {
        idx = i
        bestCands = c
        if (c.length === 1) break
      }
    }
    if (idx === -1) return true
    for (const v of shuffle(bestCands!)) {
      board[idx] = v
      if (fill()) return true
      board[idx] = 0
    }
    return false
  }
  fill()
  return board
}

/** Generate a Samurai Sudoku puzzle for the requested band, carved from a full solution. */
export function generateSamuraiPuzzle(difficulty: SamuraiDifficulty): GeneratedSamuraiPuzzle {
  const solution = generateFullGrid()
  const puzzle = solution.slice()

  const targetRemove = ACTIVE_CELLS.length - TARGET_CLUES[difficulty]
  const deadline = Date.now() + DIG_BUDGET_MS
  let removedCount = 0
  for (const i of shuffle(ACTIVE_CELLS)) {
    if (removedCount >= targetRemove || Date.now() > deadline) break
    const saved = puzzle[i]
    puzzle[i] = 0
    if (countSolutions(puzzle, 2, deadline) !== 1) puzzle[i] = saved
    else removedCount++
  }

  return { puzzle, solution, difficulty }
}
