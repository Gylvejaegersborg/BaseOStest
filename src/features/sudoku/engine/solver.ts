import { N, PEERS, cellCandidates, computeCandidates, isComplete, isSolved } from './grid'
import { findNextStep } from './techniques'
import { tierOfTechnique } from './techniqueMeta'
import type { Step, TechniqueId, TechniqueSolveResult } from './types'

/** Solve by backtracking (minimum-remaining-values). Returns a filled board or null. */
export function solveBacktrack(board: number[]): number[] | null {
  const work = board.slice()
  const recurse = (): boolean => {
    let best = -1
    let bestCands: number[] | null = null
    for (let i = 0; i < N; i++) {
      if (work[i] !== 0) continue
      const c = cellCandidates(work, i)
      if (c.length === 0) return false
      if (!bestCands || c.length < bestCands.length) {
        best = i
        bestCands = c
        if (c.length === 1) break
      }
    }
    if (best === -1) return true
    for (const v of bestCands!) {
      work[best] = v
      if (recurse()) return true
      work[best] = 0
    }
    return false
  }
  return recurse() ? work : null
}

/** Count solutions up to `cap` (default 2 — enough to test uniqueness). */
export function countSolutions(board: number[], cap = 2): number {
  const work = board.slice()
  let count = 0
  const recurse = (): boolean => {
    let best = -1
    let bestCands: number[] | null = null
    for (let i = 0; i < N; i++) {
      if (work[i] !== 0) continue
      const c = cellCandidates(work, i)
      if (c.length === 0) return false
      if (!bestCands || c.length < bestCands.length) {
        best = i
        bestCands = c
        if (c.length === 1) break
      }
    }
    if (best === -1) {
      count++
      return count >= cap
    }
    for (const v of bestCands!) {
      work[best] = v
      if (recurse()) return true
      work[best] = 0
    }
    return false
  }
  recurse()
  return count
}

/** Apply one step to a board + candidate grid in place. */
export function applyStepToCandidates(board: number[], cands: number[][], step: Step): void {
  for (const { index, value } of step.placements) {
    board[index] = value
    cands[index] = []
    for (const p of PEERS[index]) {
      const at = cands[p].indexOf(value)
      if (at !== -1) cands[p].splice(at, 1)
    }
  }
  for (const { index, value } of step.eliminations) {
    const at = cands[index].indexOf(value)
    if (at !== -1) cands[index].splice(at, 1)
  }
}

/**
 * Solve using human techniques only, maintaining a persistent candidate grid so
 * eliminations from earlier steps inform later ones. Returns the ordered steps,
 * the techniques used, and a difficulty tier (5 = needs guessing / unsolved).
 */
export function solveWithTechniques(board: number[]): TechniqueSolveResult {
  const work = board.slice()
  const cands = computeCandidates(work)
  const steps: Step[] = []
  const used = new Set<TechniqueId>()
  let guard = 0
  while (!isComplete(work) && guard++ < 256) {
    const step = findNextStep(cands)
    if (!step) break
    applyStepToCandidates(work, cands, step)
    steps.push(step)
    used.add(step.technique)
  }
  const solved = isSolved(work)
  let tier = solved ? 1 : 5
  if (solved) for (const t of used) tier = Math.max(tier, tierOfTechnique(t))
  return { solved, steps, usedTechniques: [...used], tier }
}
