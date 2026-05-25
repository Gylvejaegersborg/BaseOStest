import {
  PEERS,
  UNITS,
  boxOf,
  boxUnit,
  cellName,
  cellNames,
  colOf,
  colUnit,
  rowOf,
  rowUnit,
  unitKind,
  unitName,
} from './grid'
import type { Elimination, Step, TechniqueId } from './types'

type Detector = (cands: number[][]) => Step | null

function combinations<T>(arr: T[], k: number): T[][] {
  const out: T[][] = []
  const combo: T[] = []
  const rec = (start: number) => {
    if (combo.length === k) {
      out.push(combo.slice())
      return
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i])
      rec(i + 1)
      combo.pop()
    }
  }
  rec(0)
  return out
}

function union(...lists: number[][]): number[] {
  const s = new Set<number>()
  for (const l of lists) for (const v of l) s.add(v)
  return [...s].sort((a, b) => a - b)
}

// ── Singles ──────────────────────────────────────────────────────────────────

const nakedSingle: Detector = (cands) => {
  for (let i = 0; i < 81; i++) {
    if (cands[i].length === 1) {
      const v = cands[i][0]
      return {
        technique: 'nakedSingle',
        placements: [{ index: i, value: v }],
        eliminations: [],
        highlights: [i],
        units: [boxUnit(boxOf(i))],
        explanation: `${cellName(i)} has only one candidate left: ${v}. Every other digit already appears in its row, column, or box, so ${cellName(i)} = ${v}.`,
      }
    }
  }
  return null
}

const hiddenSingle: Detector = (cands) => {
  for (let u = 0; u < 27; u++) {
    for (let d = 1; d <= 9; d++) {
      const spots = UNITS[u].filter((i) => cands[i].includes(d))
      if (spots.length === 1 && cands[spots[0]].length > 1) {
        const i = spots[0]
        return {
          technique: 'hiddenSingle',
          placements: [{ index: i, value: d }],
          eliminations: [],
          highlights: [i],
          units: [u],
          explanation: `In ${unitName(u)}, ${d} can only go in ${cellName(i)} — it is blocked from every other cell of that ${unitKind(u)}. So ${cellName(i)} = ${d}.`,
        }
      }
    }
  }
  return null
}

// ── Naked subsets (pair / triple) ─────────────────────────────────────────────

function nakedSubset(cands: number[][], n: number): Step | null {
  const technique: TechniqueId = n === 2 ? 'nakedPair' : 'nakedTriple'
  for (let u = 0; u < 27; u++) {
    const cells = UNITS[u].filter((i) => cands[i].length >= 2 && cands[i].length <= n)
    if (cells.length < n) continue
    for (const combo of combinations(cells, n)) {
      const digits = union(...combo.map((i) => cands[i]))
      if (digits.length !== n) continue
      const comboSet = new Set(combo)
      const eliminations: Elimination[] = []
      for (const j of UNITS[u]) {
        if (comboSet.has(j)) continue
        for (const d of digits) if (cands[j].includes(d)) eliminations.push({ index: j, value: d })
      }
      if (eliminations.length) {
        return {
          technique,
          placements: [],
          eliminations,
          highlights: combo,
          units: [u],
          explanation: `In ${unitName(u)}, cells ${cellNames(combo)} can only hold {${digits.join(', ')}}. Those ${n} digits are locked into those ${n} cells, so they can be removed from the rest of the ${unitKind(u)}.`,
        }
      }
    }
  }
  return null
}

// ── Hidden subsets (pair / triple) ────────────────────────────────────────────

function hiddenSubset(cands: number[][], n: number): Step | null {
  const technique: TechniqueId = n === 2 ? 'hiddenPair' : 'hiddenTriple'
  for (let u = 0; u < 27; u++) {
    const digitSpots = new Map<number, number[]>()
    for (let d = 1; d <= 9; d++) {
      const spots = UNITS[u].filter((i) => cands[i].includes(d))
      if (spots.length >= 1 && spots.length <= n) digitSpots.set(d, spots)
    }
    const digits = [...digitSpots.keys()]
    if (digits.length < n) continue
    for (const combo of combinations(digits, n)) {
      const cells = union(...combo.map((d) => digitSpots.get(d)!))
      if (cells.length !== n) continue
      const comboSet = new Set(combo)
      const eliminations: Elimination[] = []
      for (const i of cells) {
        for (const d of cands[i]) if (!comboSet.has(d)) eliminations.push({ index: i, value: d })
      }
      if (eliminations.length) {
        return {
          technique,
          placements: [],
          eliminations,
          highlights: cells,
          units: [u],
          explanation: `In ${unitName(u)}, the digits {${combo.join(', ')}} appear only in cells ${cellNames(cells)}. Those digits must fill those cells, so every other candidate can be removed from them.`,
        }
      }
    }
  }
  return null
}

// ── Locked candidates ─────────────────────────────────────────────────────────

const pointingPair: Detector = (cands) => {
  for (let b = 0; b < 9; b++) {
    const box = UNITS[boxUnit(b)]
    for (let d = 1; d <= 9; d++) {
      const spots = box.filter((i) => cands[i].includes(d))
      if (spots.length < 2 || spots.length > 3) continue
      const rows = new Set(spots.map(rowOf))
      const cols = new Set(spots.map(colOf))
      let lineUnit = -1
      if (rows.size === 1) lineUnit = rowUnit(rowOf(spots[0]))
      else if (cols.size === 1) lineUnit = colUnit(colOf(spots[0]))
      if (lineUnit === -1) continue
      const eliminations: Elimination[] = []
      for (const j of UNITS[lineUnit]) {
        if (boxOf(j) === b) continue
        if (cands[j].includes(d)) eliminations.push({ index: j, value: d })
      }
      if (eliminations.length) {
        return {
          technique: 'pointingPair',
          placements: [],
          eliminations,
          highlights: spots,
          units: [boxUnit(b), lineUnit],
          explanation: `In box ${b + 1}, digit ${d} can only sit in ${unitName(lineUnit)} (cells ${cellNames(spots)}). One of them must be ${d}, so ${d} can be removed from the rest of ${unitName(lineUnit)}.`,
        }
      }
    }
  }
  return null
}

const boxLineReduction: Detector = (cands) => {
  for (let line = 0; line < 18; line++) {
    for (let d = 1; d <= 9; d++) {
      const spots = UNITS[line].filter((i) => cands[i].includes(d))
      if (spots.length < 2 || spots.length > 3) continue
      const boxes = new Set(spots.map(boxOf))
      if (boxes.size !== 1) continue
      const b = boxes.values().next().value as number
      const eliminations: Elimination[] = []
      for (const j of UNITS[boxUnit(b)]) {
        if (UNITS[line].includes(j)) continue
        if (cands[j].includes(d)) eliminations.push({ index: j, value: d })
      }
      if (eliminations.length) {
        return {
          technique: 'boxLineReduction',
          placements: [],
          eliminations,
          highlights: spots,
          units: [line, boxUnit(b)],
          explanation: `In ${unitName(line)}, digit ${d} only appears inside box ${b + 1} (cells ${cellNames(spots)}). So ${d} must live in that overlap and can be removed from the rest of box ${b + 1}.`,
        }
      }
    }
  }
  return null
}

// ── X-Wing ─────────────────────────────────────────────────────────────────────

const xWing: Detector = (cands) => {
  // Row-based: two rows where digit d sits in the same two columns.
  for (let d = 1; d <= 9; d++) {
    const rowCols: { line: number; positions: number[]; coords: number[] }[] = []
    for (let r = 0; r < 9; r++) {
      const spots = UNITS[rowUnit(r)].filter((i) => cands[i].includes(d))
      if (spots.length === 2) rowCols.push({ line: rowUnit(r), positions: spots, coords: spots.map(colOf) })
    }
    const rowStep = pairLines(cands, d, rowCols, 'col')
    if (rowStep) return rowStep

    const colRows: { line: number; positions: number[]; coords: number[] }[] = []
    for (let c = 0; c < 9; c++) {
      const spots = UNITS[colUnit(c)].filter((i) => cands[i].includes(d))
      if (spots.length === 2) colRows.push({ line: colUnit(c), positions: spots, coords: spots.map(rowOf) })
    }
    const colStep = pairLines(cands, d, colRows, 'row')
    if (colStep) return colStep
  }
  return null
}

function pairLines(
  cands: number[][],
  d: number,
  lines: { line: number; positions: number[]; coords: number[] }[],
  eliminateAlong: 'row' | 'col',
): Step | null {
  for (const [a, b] of combinations(lines, 2)) {
    if (a.coords[0] !== b.coords[0] || a.coords[1] !== b.coords[1]) continue
    const crossUnits =
      eliminateAlong === 'col'
        ? a.coords.map((c) => colUnit(c))
        : a.coords.map((r) => rowUnit(r))
    const evidence = new Set([...a.positions, ...b.positions])
    const eliminations: Elimination[] = []
    for (const cu of crossUnits) {
      for (const j of UNITS[cu]) {
        if (evidence.has(j)) continue
        if (cands[j].includes(d)) eliminations.push({ index: j, value: d })
      }
    }
    if (eliminations.length) {
      const baseUnits = [a.line, b.line]
      return {
        technique: 'xWing',
        placements: [],
        eliminations,
        highlights: [...evidence],
        units: [...baseUnits, ...crossUnits],
        explanation: `X-Wing on ${d}: in ${unitName(a.line)} and ${unitName(b.line)}, ${d} is confined to the same ${eliminateAlong === 'col' ? 'columns' : 'rows'} (${crossUnits.map(unitName).join(' and ')}). That locks ${d} into those lines for these two units, so ${d} can be removed elsewhere along ${crossUnits.map(unitName).join(' and ')}.`,
      }
    }
  }
  return null
}

// ── XY-Wing ──────────────────────────────────────────────────────────────────

const xyWing: Detector = (cands) => {
  for (let i = 0; i < 81; i++) {
    const pivot = cands[i]
    if (pivot.length !== 2) continue
    const [p, q] = pivot
    const pincers = PEERS[i].filter((j) => cands[j].length === 2)
    for (const a of pincers) {
      const ca = cands[a]
      const aP = ca.includes(p)
      const aQ = ca.includes(q)
      if (aP === aQ) continue // must share exactly one pivot digit
      const za = ca.find((x) => x !== (aP ? p : q))!
      for (const b of pincers) {
        if (b === a) continue
        const cb = cands[b]
        const bP = cb.includes(p)
        const bQ = cb.includes(q)
        if (bP === bQ) continue
        if (aP === bP) continue // the two pincers must take different pivot digits
        const zb = cb.find((x) => x !== (bP ? p : q))!
        if (za !== zb) continue
        const z = za
        if (z === p || z === q) continue
        const peersB = new Set(PEERS[b])
        const eliminations: Elimination[] = []
        for (const c of PEERS[a]) {
          if (c === i || c === a || c === b) continue
          if (!peersB.has(c)) continue
          if (cands[c].includes(z)) eliminations.push({ index: c, value: z })
        }
        if (eliminations.length) {
          return {
            technique: 'xyWing',
            placements: [],
            eliminations,
            highlights: [i, a, b],
            units: [],
            explanation: `XY-Wing: pivot ${cellName(i)} {${p}, ${q}} sees ${cellName(a)} {${ca.join(', ')}} and ${cellName(b)} {${cb.join(', ')}}. Whatever the pivot becomes, one of those two cells is forced to ${z}, so ${z} can be removed from any cell seeing both ${cellName(a)} and ${cellName(b)}.`,
          }
        }
      }
    }
  }
  return null
}

// ── Pipeline ───────────────────────────────────────────────────────────────────

const DETECTORS: Detector[] = [
  nakedSingle,
  hiddenSingle,
  (c) => nakedSubset(c, 2),
  (c) => hiddenSubset(c, 2),
  pointingPair,
  boxLineReduction,
  (c) => nakedSubset(c, 3),
  (c) => hiddenSubset(c, 3),
  xWing,
  xyWing,
]

/** The single easiest logical step available from the given candidate grid. */
export function findNextStep(cands: number[][]): Step | null {
  for (const detect of DETECTORS) {
    const step = detect(cands)
    if (step) return step
  }
  return null
}
