export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

export type TechniqueId =
  | 'nakedSingle'
  | 'hiddenSingle'
  | 'nakedPair'
  | 'nakedTriple'
  | 'hiddenPair'
  | 'hiddenTriple'
  | 'pointingPair'
  | 'boxLineReduction'
  | 'xWing'
  | 'xyWing'

export interface Placement {
  index: number
  value: number
}

export interface Elimination {
  index: number
  value: number
}

/** A single logical move a human solver could make from the current candidates. */
export interface Step {
  technique: TechniqueId
  placements: Placement[]
  eliminations: Elimination[]
  /** Cells that form the "evidence" for this step — highlighted in level-3 hints. */
  highlights: number[]
  /** Unit ids (0-8 rows, 9-17 columns, 18-26 boxes) involved in the reasoning. */
  units: number[]
  explanation: string
}

export interface TechniqueSolveResult {
  solved: boolean
  steps: Step[]
  usedTechniques: TechniqueId[]
  /** 1 = singles … 4 = X-Wing/XY-Wing, 5 = needs guessing (not solvable by us). */
  tier: number
}
