import { useEffect, useMemo, useRef, useState } from 'react'
import { PEERS, colOf, findConflicts, isComplete, rowOf } from '../engine/grid'
import { generatePuzzle } from '../engine/generator'
import { getHint, MAX_HINT_LEVEL, type Hint, type HintLevel } from '../engine/hints'
import { solveWithTechniques } from '../engine/solver'
import { TECHNIQUE_INFO } from '../techniqueInfo'
import type { Difficulty, TechniqueId } from '../engine/types'

export const IDLE_MS = 45_000

export interface RoundSummary {
  difficulty: Difficulty
  timeSec: number
  hintsTotal: number
  hintsByTechnique: Record<string, number>
  conflicts: number
  wrongChecks: number
  requiredTechniques: TechniqueId[]
  tips: string[]
}

interface Snapshot {
  board: number[]
  notes: number[][]
}

const cloneNotes = (n: number[][]) => n.map((a) => a.slice())
const emptyNotes = () => Array.from({ length: 81 }, () => [] as number[])

function buildTips(s: Omit<RoundSummary, 'tips'>): string[] {
  const tips: string[] = []
  const leaned = Object.entries(s.hintsByTechnique).sort((a, b) => b[1] - a[1])
  for (const [id] of leaned.slice(0, 2)) {
    const info = TECHNIQUE_INFO[id as TechniqueId]
    if (info) tips.push(info.coachTip)
  }
  if (s.conflicts >= 3) {
    tips.push(
      `You created ${s.conflicts} rule conflicts this round. Before committing a digit, scan its row, column, and box one more time — catching clashes early saves backtracking.`,
    )
  }
  if (s.wrongChecks > 0) {
    tips.push(
      `${s.wrongChecks} of your entries didn't match the solution. When you're not certain, leave a pencil mark instead of placing a number — guessing compounds fast.`,
    )
  }
  const hardest = [...s.requiredTechniques].sort(
    (a, b) => TECHNIQUE_INFO[b].tier - TECHNIQUE_INFO[a].tier,
  )[0]
  if (hardest && TECHNIQUE_INFO[hardest].tier >= 2 && !s.hintsByTechnique[hardest]) {
    tips.push(
      `You solved this without help on the ${TECHNIQUE_INFO[hardest].name} — the puzzle's toughest idea. That's exactly the skill that levels you up.`,
    )
  }
  if (!tips.length) {
    tips.push(
      s.hintsTotal === 0
        ? 'A clean, unaided solve. Try the next difficulty up to keep stretching your pattern recognition.'
        : 'Solid round. Next time, try spotting the highlighted pattern before revealing the full hint.',
    )
  }
  return tips.slice(0, 4)
}

export interface SudokuGame {
  difficulty: Difficulty
  board: number[]
  notes: number[][]
  given: boolean[]
  solution: number[]
  selected: number | null
  notesMode: boolean
  status: 'playing' | 'won'
  conflicts: Set<number>
  wrongCells: Set<number>
  remaining: number[]
  elapsed: number
  paused: boolean
  hint: Hint | null
  idleTip: Hint | null
  summary: RoundSummary | null
  generating: boolean
  canUndo: boolean
  newGame: (d: Difficulty) => void
  select: (i: number | null) => void
  setDigit: (d: number) => void
  erase: () => void
  undo: () => void
  toggleNotesMode: () => void
  autoPencil: () => void
  requestHint: () => void
  applyHint: () => void
  dismissHint: () => void
  dismissIdleTip: () => void
  check: () => void
  togglePause: () => void
}

export function useSudokuGame(initial: Difficulty = 'easy'): SudokuGame {
  const [difficulty, setDifficulty] = useState<Difficulty>(initial)
  const [given, setGiven] = useState<boolean[]>(() => new Array(81).fill(false))
  const [solution, setSolution] = useState<number[]>(() => new Array(81).fill(0))
  const [requiredTechniques, setRequiredTechniques] = useState<TechniqueId[]>([])
  const [board, setBoard] = useState<number[]>(() => new Array(81).fill(0))
  const [notes, setNotes] = useState<number[][]>(emptyNotes)
  const [selected, setSelected] = useState<number | null>(null)
  const [notesMode, setNotesMode] = useState(false)
  const [status, setStatus] = useState<'playing' | 'won'>('playing')
  const [wrongCells, setWrongCells] = useState<Set<number>>(() => new Set())
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hint, setHint] = useState<Hint | null>(null)
  const [idleTip, setIdleTip] = useState<Hint | null>(null)
  const [summary, setSummary] = useState<RoundSummary | null>(null)
  const [generating, setGenerating] = useState(false)
  const [lastInteraction, setLastInteraction] = useState(() => Date.now())

  const history = useRef<Snapshot[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const metrics = useRef({ hintsTotal: 0, conflicts: 0, wrongChecks: 0, hintsByTechnique: {} as Record<string, number> })
  const countedHints = useRef<Set<string>>(new Set())
  const boardRef = useRef(board)
  boardRef.current = board

  const start = (d: Difficulty) => {
    setGenerating(true)
    // Defer so the "dealing" state can paint before the synchronous generation.
    setTimeout(() => {
      const { puzzle, solution: sol } = generatePuzzle(d)
      setDifficulty(d)
      setGiven(puzzle.map((v) => v !== 0))
      setSolution(sol)
      setRequiredTechniques(solveWithTechniques(puzzle).usedTechniques)
      setBoard(puzzle.slice())
      setNotes(emptyNotes())
      setSelected(null)
      setNotesMode(false)
      setStatus('playing')
      setWrongCells(new Set())
      setElapsed(0)
      setPaused(false)
      setHint(null)
      setIdleTip(null)
      setSummary(null)
      history.current = []
      setCanUndo(false)
      metrics.current = { hintsTotal: 0, conflicts: 0, wrongChecks: 0, hintsByTechnique: {} }
      countedHints.current = new Set()
      setLastInteraction(Date.now())
      setGenerating(false)
    }, 30)
  }

  // First puzzle on mount.
  useEffect(() => {
    start(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Timer.
  useEffect(() => {
    if (status !== 'playing' || paused || generating) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [status, paused, generating])

  // Idle nudge.
  useEffect(() => {
    setIdleTip(null)
    if (status !== 'playing' || paused || generating) return
    const id = setTimeout(() => {
      const tip = getHint(boardRef.current, solution, 1)
      if (tip.kind === 'step') setIdleTip(tip)
    }, IDLE_MS)
    return () => clearTimeout(id)
  }, [lastInteraction, status, paused, generating, solution])

  // Detect a completed, correct grid and build the round summary exactly once.
  useEffect(() => {
    if (status !== 'playing' || generating) return
    if (!isComplete(board) || !board.every((v, i) => v === solution[i])) return
    setStatus('won')
    const m = metrics.current
    const base: Omit<RoundSummary, 'tips'> = {
      difficulty,
      timeSec: elapsed,
      hintsTotal: m.hintsTotal,
      hintsByTechnique: { ...m.hintsByTechnique },
      conflicts: m.conflicts,
      wrongChecks: m.wrongChecks,
      requiredTechniques,
    }
    setSummary({ ...base, tips: buildTips(base) })
  }, [board, status, generating, solution, difficulty, elapsed, requiredTechniques])

  const conflicts = useMemo(() => findConflicts(board), [board])

  const remaining = useMemo(() => {
    const counts = new Array(10).fill(0)
    for (const v of board) if (v) counts[v]++
    return Array.from({ length: 9 }, (_, i) => 9 - counts[i + 1])
  }, [board])

  const touch = () => setLastInteraction(Date.now())
  const snapshot = () => {
    history.current.push({ board: board.slice(), notes: cloneNotes(notes) })
    if (history.current.length > 200) history.current.shift()
    setCanUndo(true)
  }

  const select = (i: number | null) => {
    setSelected(i)
    touch()
  }

  const setDigit = (d: number) => {
    if (paused || status !== 'playing') return
    touch()
    setHint(null)
    setWrongCells(new Set())
    if (selected === null || given[selected]) return
    const i = selected
    if (notesMode) {
      if (board[i] !== 0) return
      snapshot()
      setNotes((prev) => {
        const next = cloneNotes(prev)
        const cell = next[i]
        const at = cell.indexOf(d)
        if (at === -1) cell.push(d)
        else cell.splice(at, 1)
        cell.sort((a, b) => a - b)
        return next
      })
      return
    }
    snapshot()
    const clearing = board[i] === d
    if (!clearing) {
      const illegal = PEERS[i].some((p) => board[p] === d)
      if (illegal) metrics.current.conflicts++
    }
    setNotes((prev) => {
      const next = cloneNotes(prev)
      next[i] = []
      if (!clearing) for (const p of PEERS[i]) {
        const at = next[p].indexOf(d)
        if (at !== -1) next[p].splice(at, 1)
      }
      return next
    })
    setBoard((prev) => {
      const next = prev.slice()
      next[i] = clearing ? 0 : d
      return next
    })
  }

  const erase = () => {
    if (paused || status !== 'playing') return
    touch()
    setHint(null)
    setWrongCells(new Set())
    if (selected === null || given[selected]) return
    const i = selected
    snapshot()
    setBoard((prev) => {
      const next = prev.slice()
      next[i] = 0
      return next
    })
    setNotes((prev) => {
      const next = cloneNotes(prev)
      next[i] = []
      return next
    })
  }

  const undo = () => {
    const snap = history.current.pop()
    setCanUndo(history.current.length > 0)
    if (!snap) return
    setBoard(snap.board)
    setNotes(snap.notes)
    setWrongCells(new Set())
    setHint(null)
    touch()
  }

  const toggleNotesMode = () => setNotesMode((m) => !m)

  const autoPencil = () => {
    if (paused || status !== 'playing') return
    touch()
    snapshot()
    setNotes(() => {
      const next = emptyNotes()
      for (let i = 0; i < 81; i++) {
        if (board[i] !== 0) continue
        const used = new Set<number>()
        for (const p of PEERS[i]) if (board[p] !== 0) used.add(board[p])
        for (let d = 1; d <= 9; d++) if (!used.has(d)) next[i].push(d)
      }
      return next
    })
  }

  const requestHint = () => {
    touch()
    setIdleTip(null)
    const nextLevel = (hint ? Math.min(hint.level + 1, MAX_HINT_LEVEL) : 1) as HintLevel
    const h = getHint(board, solution, nextLevel)
    if (h.kind === 'step' && h.level === 1) metrics.current.hintsTotal++
    if (h.kind === 'step' && h.technique && h.level >= 2 && !countedHints.current.has(h.signature)) {
      countedHints.current.add(h.signature)
      const t = h.technique
      metrics.current.hintsByTechnique[t] = (metrics.current.hintsByTechnique[t] ?? 0) + 1
    }
    setHint(h)
  }

  const applyHint = () => {
    if (!hint?.step || !hint.canApply) return
    touch()
    snapshot()
    const step = hint.step
    setNotes((prev) => {
      const next = cloneNotes(prev)
      for (const e of step.eliminations) {
        const at = next[e.index].indexOf(e.value)
        if (at !== -1) next[e.index].splice(at, 1)
      }
      for (const p of step.placements) {
        next[p.index] = []
        for (const peer of PEERS[p.index]) {
          const at = next[peer].indexOf(p.value)
          if (at !== -1) next[peer].splice(at, 1)
        }
      }
      return next
    })
    setBoard((prev) => {
      const next = prev.slice()
      for (const p of step.placements) next[p.index] = p.value
      return next
    })
    setHint(null)
  }

  const dismissHint = () => setHint(null)
  const dismissIdleTip = () => {
    setIdleTip(null)
    touch()
  }

  const check = () => {
    touch()
    const wrong = new Set<number>()
    for (let i = 0; i < 81; i++) {
      if (board[i] !== 0 && !given[i] && board[i] !== solution[i]) wrong.add(i)
    }
    metrics.current.wrongChecks += wrong.size
    setWrongCells(wrong)
  }

  const togglePause = () => setPaused((p) => !p)

  return {
    difficulty,
    board,
    notes,
    given,
    solution,
    selected,
    notesMode,
    status,
    conflicts,
    wrongCells,
    remaining,
    elapsed,
    paused,
    hint,
    idleTip,
    summary,
    generating,
    canUndo,
    newGame: start,
    select,
    setDigit,
    erase,
    undo,
    toggleNotesMode,
    autoPencil,
    requestHint,
    applyHint,
    dismissHint,
    dismissIdleTip,
    check,
    togglePause,
  }
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Re-export coordinate helpers used by the board renderer.
export { rowOf, colOf }
