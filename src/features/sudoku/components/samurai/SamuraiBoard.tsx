import { useMemo } from 'react'
import { PEERS, SIZE, TOTAL, colOf, isActive, rowOf } from '../../engine/samurai/geometry'
import type { SamuraiGame } from '../../state/useSamuraiGame'
import { SamuraiCell } from './SamuraiCell'

export function SamuraiBoard({ game }: { game: SamuraiGame }) {
  const { board, notes, given, selected, conflicts, wrongCells, hintCell, select } = game
  const selVal = selected !== null ? board[selected] : 0
  const peerSet = useMemo(() => new Set(selected !== null ? PEERS[selected] : []), [selected])

  return (
    <div
      className="grid aspect-square w-full max-w-[min(96vw,44rem)] bg-claude-surface shadow-[0_2px_24px_rgba(31,30,28,0.10)]"
      style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${SIZE}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: TOTAL }, (_, i) => {
        const r = rowOf(i)
        const c = colOf(i)
        if (!isActive(r, c)) return <div key={i} className="pointer-events-none" />
        return (
          <SamuraiCell
            key={i}
            value={board[i]}
            notes={notes[i]}
            given={given[i]}
            selected={selected === i}
            peer={i !== selected && peerSet.has(i)}
            sameValue={selVal !== 0 && board[i] === selVal && i !== selected}
            conflict={conflicts.has(i)}
            wrong={wrongCells.has(i)}
            isHint={hintCell === i}
            row={r}
            col={c}
            onClick={() => select(i)}
          />
        )
      })}
    </div>
  )
}
