// Core 9x9 Sudoku grid primitives. A board is a flat array of 81 numbers,
// index = row * 9 + col, with 0 meaning "empty".

export const N = 81

export function rowOf(i: number): number {
  return Math.floor(i / 9)
}
export function colOf(i: number): number {
  return i % 9
}
export function boxOf(i: number): number {
  return Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3)
}

/** Unit id helpers: rows 0-8, columns 9-17, boxes 18-26. */
export function rowUnit(r: number): number {
  return r
}
export function colUnit(c: number): number {
  return 9 + c
}
export function boxUnit(b: number): number {
  return 18 + b
}

/** All 27 units, each an array of the 9 cell indices it contains. */
export const UNITS: number[][] = (() => {
  const units: number[][] = []
  for (let r = 0; r < 9; r++) units.push(Array.from({ length: 9 }, (_, c) => r * 9 + c))
  for (let c = 0; c < 9; c++) units.push(Array.from({ length: 9 }, (_, r) => r * 9 + c))
  for (let b = 0; b < 9; b++) {
    const br = Math.floor(b / 3) * 3
    const bc = (b % 3) * 3
    const cells: number[] = []
    for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) cells.push((br + dr) * 9 + (bc + dc))
    units.push(cells)
  }
  return units
})()

/** The three unit ids (row, column, box) that a given cell belongs to. */
export function unitsOfCell(i: number): number[] {
  return [rowUnit(rowOf(i)), colUnit(colOf(i)), boxUnit(boxOf(i))]
}

/** The 20 peer cells (same row/column/box) of every cell, precomputed. */
export const PEERS: number[][] = (() => {
  const peers: number[][] = []
  for (let i = 0; i < N; i++) {
    const set = new Set<number>()
    for (const u of unitsOfCell(i)) for (const j of UNITS[u]) if (j !== i) set.add(j)
    peers.push([...set])
  }
  return peers
})()

/** Digits 1-9 still legal in cell `i` given the current board (direct peer elimination). */
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

/** Candidate digits for every cell ([] for already-filled cells). */
export function computeCandidates(board: number[]): number[][] {
  const cands: number[][] = new Array(N)
  for (let i = 0; i < N; i++) cands[i] = cellCandidates(board, i)
  return cands
}

/** True if placing `v` in cell `i` breaks no row/column/box rule. */
export function isValidPlacement(board: number[], i: number, v: number): boolean {
  for (const p of PEERS[i]) if (board[p] === v) return false
  return true
}

/** Indices that participate in a duplicate within any unit (used for coach-mode highlighting). */
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
  return board.every((v) => v !== 0)
}

export function isSolved(board: number[]): boolean {
  return isComplete(board) && findConflicts(board).size === 0
}

export function unitKind(u: number): 'row' | 'column' | 'box' {
  if (u < 9) return 'row'
  if (u < 18) return 'column'
  return 'box'
}

export function unitName(u: number): string {
  if (u < 9) return `row ${u + 1}`
  if (u < 18) return `column ${u - 9 + 1}`
  return `box ${u - 18 + 1}`
}

/** Human-friendly cell name, e.g. R3C5. */
export function cellName(i: number): string {
  return `R${rowOf(i) + 1}C${colOf(i) + 1}`
}

export function cellNames(idx: number[]): string {
  return idx.map(cellName).join(', ')
}
