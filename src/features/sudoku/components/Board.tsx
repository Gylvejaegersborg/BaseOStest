import { boxOf, colOf, rowOf } from '../engine/grid'
import type { SudokuGame } from '../state/useSudokuGame'
import { Cell } from './Cell'

export function Board({ game, highlights }: { game: SudokuGame; highlights: Set<number> }) {
  const { board, notes, given, selected, conflicts, wrongCells, select } = game
  const selVal = selected !== null ? board[selected] : 0
  const selRow = selected !== null ? rowOf(selected) : -1
  const selCol = selected !== null ? colOf(selected) : -1
  const selBox = selected !== null ? boxOf(selected) : -1

  return (
    <div className="grid aspect-square w-full max-w-[min(92vw,30rem)] grid-cols-[repeat(9,minmax(0,1fr))] grid-rows-[repeat(9,minmax(0,1fr))] border-2 border-claude-ink/40 bg-claude-surface shadow-[0_2px_24px_rgba(31,30,28,0.10)]">
      {board.map((v, i) => {
        const peer =
          selected !== null &&
          i !== selected &&
          (rowOf(i) === selRow || colOf(i) === selCol || boxOf(i) === selBox)
        return (
          <Cell
            key={i}
            value={v}
            notes={notes[i]}
            given={given[i]}
            selected={selected === i}
            peer={peer}
            sameValue={selVal !== 0 && v === selVal && i !== selected}
            conflict={conflicts.has(i)}
            wrong={wrongCells.has(i)}
            hintEvidence={highlights.has(i)}
            row={rowOf(i)}
            col={colOf(i)}
            onClick={() => select(i)}
          />
        )
      })}
    </div>
  )
}
