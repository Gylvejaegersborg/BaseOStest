// Samurai Sudoku board: five overlapping 9x9 grids (top-left, top-right, center,
// bottom-left, bottom-right) laid out on a single 21x21 master grid. Corner grids
// each share one 3x3 box with the center grid, so those cells are the same physical
// cells for both — no merging needed, a single global index carries the value.

export const SIZE = 21
export const TOTAL = SIZE * SIZE

export function idx(r: number, c: number): number {
  return r * SIZE + c
}
export function rowOf(i: number): number {
  return Math.floor(i / SIZE)
}
export function colOf(i: number): number {
  return i % SIZE
}

/** Top-left corner of each of the five 9x9 sub-grids, in the master 21x21 grid. */
export const SUBGRIDS = [
  { row: 0, col: 0 }, // top-left
  { row: 0, col: 12 }, // top-right
  { row: 6, col: 6 }, // center
  { row: 12, col: 0 }, // bottom-left
  { row: 12, col: 12 }, // bottom-right
] as const

/** Every cell that belongs to at least one of the five sub-grids. */
export const ACTIVE_CELLS: number[] = (() => {
  const set = new Set<number>()
  for (const { row, col } of SUBGRIDS) {
    for (let dr = 0; dr < 9; dr++) {
      for (let dc = 0; dc < 9; dc++) set.add(idx(row + dr, col + dc))
    }
  }
  return [...set].sort((a, b) => a - b)
})()

export const ACTIVE: boolean[] = (() => {
  const a = new Array(TOTAL).fill(false)
  for (const i of ACTIVE_CELLS) a[i] = true
  return a
})()

export function isActive(r: number, c: number): boolean {
  if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false
  return ACTIVE[idx(r, c)]
}

/** All rows/columns/boxes across the five sub-grids, deduped by cell-set (shared corner boxes appear once). */
export const UNITS: number[][] = (() => {
  const seen = new Map<string, number[]>()
  for (const { row, col } of SUBGRIDS) {
    // 9 rows
    for (let dr = 0; dr < 9; dr++) {
      const cells = Array.from({ length: 9 }, (_, dc) => idx(row + dr, col + dc))
      seen.set(cells.slice().sort((a, b) => a - b).join(','), cells)
    }
    // 9 columns
    for (let dc = 0; dc < 9; dc++) {
      const cells = Array.from({ length: 9 }, (_, dr) => idx(row + dr, col + dc))
      seen.set(cells.slice().sort((a, b) => a - b).join(','), cells)
    }
    // 9 boxes
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const cells: number[] = []
        for (let dr = 0; dr < 3; dr++)
          for (let dc = 0; dc < 3; dc++) cells.push(idx(row + br * 3 + dr, col + bc * 3 + dc))
        seen.set(cells.slice().sort((a, b) => a - b).join(','), cells)
      }
    }
  }
  return [...seen.values()]
})()

/** All cells sharing a row/column/box with a given cell, precomputed. */
export const PEERS: number[][] = (() => {
  const peers: number[][] = new Array(TOTAL)
  for (const i of ACTIVE_CELLS) peers[i] = []
  for (const unit of UNITS) {
    for (const i of unit) {
      for (const j of unit) if (j !== i) peers[i].push(j)
    }
  }
  return peers.map((p) => (p ? [...new Set(p)] : []))
})()
