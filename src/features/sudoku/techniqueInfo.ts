import type { TechniqueId } from './engine/types'

export interface TechniqueInfo {
  id: TechniqueId
  name: string
  tier: number
  /** Short category label used in gentle nudges. */
  category: string
  /** Level-1 nudge phrasing (no specific cell). */
  nudge: string
  /** "How to spot it" — shown at level 2. */
  spot: string
  /** A worked mini-example for the learning guide. */
  example: string
  /** Coaching line used in the post-round report when the player leaned on this. */
  coachTip: string
}

export const TECHNIQUE_ORDER: TechniqueId[] = [
  'nakedSingle',
  'hiddenSingle',
  'nakedPair',
  'hiddenPair',
  'pointingPair',
  'boxLineReduction',
  'nakedTriple',
  'hiddenTriple',
  'xWing',
  'xyWing',
]

export const TECHNIQUE_INFO: Record<TechniqueId, TechniqueInfo> = {
  nakedSingle: {
    id: 'nakedSingle',
    name: 'Naked Single',
    tier: 1,
    category: 'naked single',
    nudge: 'A cell somewhere has run out of options — only one digit can still fit.',
    spot: 'Look for an empty cell whose row, column, and box together already use eight different digits. The ninth is forced.',
    example: 'If R1C1 sees 1,2,3,4,5,6,7,8 across its row/column/box, then R1C1 must be 9.',
    coachTip: 'Naked singles are the bread and butter — after every placement, glance at that cell’s neighbours to catch the next forced cell for free.',
  },
  hiddenSingle: {
    id: 'hiddenSingle',
    name: 'Hidden Single',
    tier: 1,
    category: 'hidden single',
    nudge: 'In one row, column, or box, a digit has only one square left to live in.',
    spot: 'Pick a digit and a unit. Cross out every cell in that unit where the digit is blocked. If exactly one cell survives, that’s the answer.',
    example: 'If 7 is blocked from every cell of box 3 except R2C8, then R2C8 = 7 even if that cell could hold other digits too.',
    coachTip: 'Hidden singles hide in plain sight. Scan digit-by-digit (1–9) across each box before resorting to pencil marks — it’s the fastest way to find them.',
  },
  nakedPair: {
    id: 'nakedPair',
    name: 'Naked Pair',
    tier: 2,
    category: 'naked pair',
    nudge: 'Two cells in one unit share the exact same two candidates.',
    spot: 'Find two cells in the same row, column, or box that both hold only the same pair, e.g. {3,8}. Those digits are claimed.',
    example: 'If R4C1 and R4C5 both hold only {3,8}, no other cell in row 4 can be 3 or 8.',
    coachTip: 'Naked pairs unlock eliminations without placing anything. When two cells mirror each other, sweep their two digits out of the rest of the unit.',
  },
  hiddenPair: {
    id: 'hiddenPair',
    name: 'Hidden Pair',
    tier: 2,
    category: 'hidden pair',
    nudge: 'Two digits in a unit are confined to the same two cells.',
    spot: 'Find two digits that each appear in only the same two cells of a unit. Those cells belong to that pair — clear their other candidates.',
    example: 'If 2 and 6 only fit in R1C3 and R1C7 within row 1, strip every other candidate from those two cells.',
    coachTip: 'Hidden pairs are easy to miss because the cells look busy. Track where each digit can go in a unit, not just what each cell can hold.',
  },
  pointingPair: {
    id: 'pointingPair',
    name: 'Pointing Pair',
    tier: 2,
    category: 'pointing pair',
    nudge: 'Inside one box, a digit lines up along a single row or column.',
    spot: 'If a digit’s only spots in a box all share one row (or column), it must be on that line — remove it from the line outside the box.',
    example: 'If 5 in box 1 can only be in R1C1 and R1C2, then 5 is removed from the rest of row 1.',
    coachTip: 'Pointing pairs connect boxes to lines. When a digit hugs one edge of a box, follow that line outward and eliminate.',
  },
  boxLineReduction: {
    id: 'boxLineReduction',
    name: 'Box/Line Reduction',
    tier: 2,
    category: 'box/line reduction',
    nudge: 'Along one line, a digit only appears within a single box.',
    spot: 'If a digit on a row/column is restricted to one box, it must be in that overlap — remove it from the rest of the box.',
    example: 'If 4 in row 7 can only sit in box 8, then 4 leaves every other cell of box 8.',
    coachTip: 'Box/line reduction is the mirror of the pointing pair — read the line first, then prune the box.',
  },
  nakedTriple: {
    id: 'nakedTriple',
    name: 'Naked Triple',
    tier: 3,
    category: 'naked triple',
    nudge: 'Three cells in a unit between them use only three candidates.',
    spot: 'Three cells whose combined candidates total exactly three digits (each cell holds two or three of them). Those digits are claimed.',
    example: 'Cells holding {1,5}, {5,9}, {1,9} together use only {1,5,9} — remove those from the rest of the unit.',
    coachTip: 'Triples don’t need all three digits in every cell. Look for three cells that collectively cover just three numbers.',
  },
  hiddenTriple: {
    id: 'hiddenTriple',
    name: 'Hidden Triple',
    tier: 3,
    category: 'hidden triple',
    nudge: 'Three digits in a unit are confined to the same three cells.',
    spot: 'Three digits that only appear within the same three cells of a unit. Clear every other candidate from those cells.',
    example: 'If 2, 4 and 7 only appear in three cells of a column, those cells are exactly {2,4,7}.',
    coachTip: 'Hidden triples reward tracking digit positions. If three numbers keep landing in the same trio of cells, lock them in.',
  },
  xWing: {
    id: 'xWing',
    name: 'X-Wing',
    tier: 4,
    category: 'X-Wing',
    nudge: 'A digit forms a rectangle: two lines confine it to the same two cross-lines.',
    spot: 'Find a digit appearing exactly twice in two rows, in the same two columns (or vice-versa). The four corners form an X-Wing.',
    example: 'If 3 sits in only columns 2 and 6 of both row 1 and row 8, remove 3 from columns 2 and 6 elsewhere.',
    coachTip: 'X-Wings are about candidate geometry, not single cells. When a digit appears twice in two parallel lines, check the corners.',
  },
  xyWing: {
    id: 'xyWing',
    name: 'XY-Wing',
    tier: 4,
    category: 'XY-Wing',
    nudge: 'A two-candidate pivot links two pincer cells that force a shared digit.',
    spot: 'Pivot {X,Y} sees a {X,Z} cell and a {Y,Z} cell. Whatever the pivot is, one pincer becomes Z — so Z falls from cells seeing both pincers.',
    example: 'Pivot {4,7} with pincers {4,2} and {7,2} forces a 2 somewhere — remove 2 from cells that see both pincers.',
    coachTip: 'XY-Wings are short forcing chains. Start from any two-candidate cell and look for two partners that share a third digit.',
  },
}
