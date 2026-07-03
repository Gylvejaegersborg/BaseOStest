import { ACTIVE_CELLS, PEERS, TOTAL, UNITS } from './geometry'

export function cellCandidates(board: number[], i: number): number[] {
  if (board[i] !== 0) return []
  const used = new Set<number>()
  for (const p of PEERS[i]) {
    const v = board[p]
    if (v !== 0) used.add(v)
  }
  const out: number[] = []
  for (let d = 1; d <= 9; d++) if (!used.has(d)) out.push(d)
  return out
}

export function computeCandidates(board: number[]): number[][] {
  const cands: number[][] = new Array(TOTAL)
  for (const i of ACTIVE_CELLS) cands[i] = cellCandidates(board, i)
  return cands
}

export function isValidPlacement(board: number[], i: number, v: number): boolean {
  for (const p of PEERS[i]) if (board[p] === v) return false
  return true
}

export function findConflicts(board: number[]): Set<number> {
  const conflicts = new Set<number>()
  for (const unit of UNITS) {
    const seen = new Map<number, number[]>()
    for (const i of unit) {
      const v = board[i]
      if (v === 0) continue
      const arr = seen.get(v)
      if (arr) arr.push(i)
      else seen.set(v, [i])
    }
    for (const idxs of seen.values()) if (idxs.length > 1) for (const i of idxs) conflicts.add(i)
  }
  return conflicts
}

export function isComplete(board: number[]): boolean {
  return ACTIVE_CELLS.every((i) => board[i] !== 0)
}

export function isSolved(board: number[]): boolean {
  return isComplete(board) && findConflicts(board).size === 0
}

/** Pick the empty active cell with the fewest candidates (MRV heuristic). */
function pickCell(board: number[]): { index: number; cands: number[] } | null {
  let best = -1
  let bestCands: number[] | null = null
  for (const i of ACTIVE_CELLS) {
    if (board[i] !== 0) continue
    const c = cellCandidates(board, i)
    if (c.length === 0) return { index: i, cands: [] }
    if (!bestCands || c.length < bestCands.length) {
      best = i
      bestCands = c
      if (c.length === 1) break
    }
  }
  return best === -1 ? null : { index: best, cands: bestCands! }
}

export function solveBacktrack(board: number[]): number[] | null {
  const work = board.slice()
  const recurse = (): boolean => {
    const pick = pickCell(work)
    if (!pick) return true
    if (pick.cands.length === 0) return false
    for (const v of pick.cands) {
      work[pick.index] = v
      if (recurse()) return true
      work[pick.index] = 0
    }
    return false
  }
  return recurse() ? work : null
}

/** Count solutions up to `cap` (default 2 — enough to test uniqueness). Time-boxed to avoid runaway search. */
export function countSolutions(board: number[], cap = 2, deadline = Infinity): number {
  const work = board.slice()
  let count = 0
  let aborted = false
  const recurse = (): boolean => {
    if (Date.now() > deadline) {
      aborted = true
      return true
    }
    const pick = pickCell(work)
    if (!pick) {
      count++
      return count >= cap
    }
    if (pick.cands.length === 0) return false
    for (const v of pick.cands) {
      work[pick.index] = v
      if (recurse()) return true
      work[pick.index] = 0
    }
    return false
  }
  recurse()
  return aborted ? cap : count
}
