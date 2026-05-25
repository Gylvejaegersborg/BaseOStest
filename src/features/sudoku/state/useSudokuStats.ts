import { useCallback, useEffect, useState } from 'react'
import type { Difficulty } from '../engine/types'

const KEY = 'baseos.sudoku.stats.v1'

export interface RoundRecord {
  difficulty: Difficulty
  timeSec: number
  hintsTotal: number
  conflicts: number
  wrongChecks: number
  hintsByTechnique: Record<string, number>
  completedAt: number
}

export interface SudokuStats {
  rounds: RoundRecord[]
  techniqueLeans: Record<string, number>
  bestByDifficulty: Partial<Record<Difficulty, number>>
  solved: number
}

const EMPTY: SudokuStats = { rounds: [], techniqueLeans: {}, bestByDifficulty: {}, solved: 0 }

function load(): SudokuStats {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<SudokuStats>
    return { ...EMPTY, ...parsed }
  } catch {
    return EMPTY
  }
}

export function useSudokuStats() {
  const [stats, setStats] = useState<SudokuStats>(() => load())

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(stats))
    } catch {
      // storage unavailable — progress just won't persist this session.
    }
  }, [stats])

  const recordRound = useCallback((record: RoundRecord) => {
    setStats((s) => {
      const techniqueLeans = { ...s.techniqueLeans }
      for (const [k, v] of Object.entries(record.hintsByTechnique)) {
        techniqueLeans[k] = (techniqueLeans[k] ?? 0) + v
      }
      const prevBest = s.bestByDifficulty[record.difficulty]
      return {
        rounds: [...s.rounds, record].slice(-50),
        techniqueLeans,
        bestByDifficulty: {
          ...s.bestByDifficulty,
          [record.difficulty]: prevBest === undefined ? record.timeSec : Math.min(prevBest, record.timeSec),
        },
        solved: s.solved + 1,
      }
    })
  }, [])

  /** Average hints over the rounds before the most recent one (for trend display). */
  const priorAvgHints = useCallback(
    (window = 5): number | null => {
      const prior = stats.rounds.slice(0, -1).slice(-window)
      if (!prior.length) return null
      return prior.reduce((a, r) => a + r.hintsTotal, 0) / prior.length
    },
    [stats.rounds],
  )

  return { stats, recordRound, priorAvgHints }
}
