import { useEffect, useMemo, useRef, useState } from 'react'
import { ACTIVE_CELLS, PEERS, TOTAL, colOf, rowOf } from '../engine/samurai/geometry'
import { generateSamuraiPuzzle, type SamuraiDifficulty } from '../engine/samurai/generator'
import { cellCandidates, findConflicts, isComplete } from '../engine/samurai/solver'

export interface SamuraiSummary {
  difficulty: SamuraiDifficulty
  timeSec: number
  hintsUsed: number
  wrongChecks: number
}

interface Snapshot {
  board: number[]
  notes: number[][]
}

const cloneNotes = (n: number[][]) => n.map((a) => a.slice())
const emptyNotes = () => Array.from({ length: TOTAL }, () => [] as number[])

export interface SamuraiGame {
  difficulty: SamuraiDifficulty
  board: number[]
  notes: number[][]
  given: boolean[]
  selected: number | null
  notesMode: boolean
  status: 'playing' | 'won'
  conflicts: Set<number>
  wrongCells: Set<number>
  elapsed: number
  paused: boolean
  hintCell: number | null
  summary: SamuraiSummary | null
  generating: boolean
  canUndo: boolean
  newGame: (d: SamuraiDifficulty) => void
  select: (i: number | null) => void
  setDigit: (d: number) => void
  erase: () => void
  undo: () => void
  toggleNotesMode: () => void
  autoPencil: () => void
  requestHint: () => void
  check: () => void
  togglePause: () => void
}

export function useSamuraiGame(initial: SamuraiDifficulty = 'easy'): SamuraiGame {
  const [difficulty, setDifficulty] = useState<SamuraiDifficulty>(initial)
  const [given, setGiven] = useState<boolean[]>(() => new Array(TOTAL).fill(false))
  const [solution, setSolution] = useState<number[]>(() => new Array(TOTAL).fill(0))
  const [board, setBoard] = useState<number[]>(() => new Array(TOTAL).fill(0))
  const [notes, setNotes] = useState<number[][]>(emptyNotes)
  const [selected, setSelected] = useState<number | null>(null)
  const [notesMode, setNotesMode] = useState(false)
  const [status, setStatus] = useState<'playing' | 'won'>('playing')
  const [wrongCells, setWrongCells] = useState<Set<number>>(() => new Set())
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hintCell, setHintCell] = useState<number | null>(null)
  const [summary, setSummary] = useState<SamuraiSummary | null>(null)
  const [generating, setGenerating] = useState(false)

  const history = useRef<Snapshot[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const metrics = useRef({ hintsUsed: 0, wrongChecks: 0 })

  const start = (d: SamuraiDifficulty) => {
    setGenerating(true)
    setTimeout(() => {
      const { puzzle, solution: sol } = generateSamuraiPuzzle(d)
      setDifficulty(d)
      setGiven(puzzle.map((v) => v !== 0))
      setSolution(sol)
      setBoard(puzzle.slice())
      setNotes(emptyNotes())
      setSelected(null)
      setNotesMode(false)
      setStatus('playing')
      setWrongCells(new Set())
      setElapsed(0)
      setPaused(false)
      setHintCell(null)
      setSummary(null)
      history.current = []
      setCanUndo(false)
      metrics.current = { hintsUsed: 0, wrongChecks: 0 }
      setGenerating(false)
    }, 30)
  }

  useEffect(() => {
    start(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (status !== 'playing' || paused || generating) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [status, paused, generating])

  useEffect(() => {
    if (status !== 'playing' || generating) return
    if (!isComplete(board) || !ACTIVE_CELLS.every((i) => board[i] === solution[i])) return
    setStatus('won')
    setSummary({
      difficulty,
      timeSec: elapsed,
      hintsUsed: metrics.current.hintsUsed,
      wrongChecks: metrics.current.wrongChecks,
    })
  }, [board, status, generating, solution, difficulty, elapsed])

  const conflicts = useMemo(() => findConflicts(board), [board])

  const snapshot = () => {
    history.current.push({ board: board.slice(), notes: cloneNotes(notes) })
    if (history.current.length > 200) history.current.shift()
    setCanUndo(true)
  }

  const select = (i: number | null) => setSelected(i)

  const setDigit = (d: number) => {
    if (paused || status !== 'playing') return
    setHintCell(null)
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
    setHintCell(null)
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
    setHintCell(null)
  }

  const toggleNotesMode = () => setNotesMode((m) => !m)

  const autoPencil = () => {
    if (paused || status !== 'playing') return
    snapshot()
    setNotes(() => {
      const next = emptyNotes()
      for (const i of ACTIVE_CELLS) {
        if (board[i] !== 0) continue
        for (const d of cellCandidates(board, i)) next[i].push(d)
      }
      return next
    })
  }

  const requestHint = () => {
    if (status !== 'playing') return
    // Prefer a naked single (only one legal digit left) so the reveal feels earned; otherwise
    // hand over the easiest-looking empty cell.
    let best: number | null = null
    let bestCount = 10
    for (const i of ACTIVE_CELLS) {
      if (board[i] !== 0) continue
      const c = cellCandidates(board, i).length
      if (c > 0 && c < bestCount) {
        bestCount = c
        best = i
        if (c === 1) break
      }
    }
    if (best === null) return
    snapshot()
    setBoard((prev) => {
      const next = prev.slice()
      next[best!] = solution[best!]
      return next
    })
    setNotes((prev) => {
      const next = cloneNotes(prev)
      next[best!] = []
      for (const p of PEERS[best!]) {
        const at = next[p].indexOf(solution[best!])
        if (at !== -1) next[p].splice(at, 1)
      }
      return next
    })
    metrics.current.hintsUsed++
    setHintCell(best)
  }

  const check = () => {
    const wrong = new Set<number>()
    for (const i of ACTIVE_CELLS) {
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
    selected,
    notesMode,
    status,
    conflicts,
    wrongCells,
    elapsed,
    paused,
    hintCell,
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
    check,
    togglePause,
  }
}

export { rowOf, colOf }
