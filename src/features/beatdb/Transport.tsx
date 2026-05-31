import { Play, Pause, SkipBack, SkipForward, Shuffle } from 'lucide-react'
import type { BeatPlayer } from '@/features/beatstore/useBeatPlayer'
import { formatDuration } from '@/data/beats'
import { cn } from '@/lib/cn'

/** Compact, always-docked now-playing strip so a beat keeps playing while you browse. */
export function Transport({ player }: { player: BeatPlayer }) {
  const beat = player.current
  if (!beat) return null

  return (
    <footer className="flex h-16 shrink-0 items-center gap-3 border-t border-line bg-panel/80 px-3 backdrop-blur sm:px-4">
      {/* Track */}
      <div className="flex min-w-0 items-center gap-3" style={{ flexBasis: 220 }}>
        <div
          className="h-10 w-10 shrink-0 rounded"
          style={{ background: `linear-gradient(135deg, ${beat.gradient[0]}, ${beat.gradient[1]})` }}
        />
        <div className="min-w-0">
          <div className="truncate text-xs text-text">{beat.title}</div>
          <div className="truncate text-[10px] text-dim">{beat.artist}</div>
        </div>
      </div>

      {/* Controls + progress */}
      <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => player.setShuffle(!player.shuffle)}
            aria-label="Shuffle"
            className={cn('transition-colors', player.shuffle ? 'text-accent' : 'text-dim hover:text-text')}
          >
            <Shuffle size={14} />
          </button>
          <button onClick={() => player.prev()} aria-label="Previous" className="text-dim hover:text-text">
            <SkipBack size={16} />
          </button>
          <button
            onClick={() => (player.playing ? player.pause() : player.play(beat))}
            aria-label={player.playing ? 'Pause' : 'Play'}
            className="grid h-8 w-8 place-items-center rounded-full bg-accent text-bg transition-transform hover:scale-105"
          >
            {player.playing ? <Pause size={16} /> : <Play size={16} className="translate-x-0.5" />}
          </button>
          <button onClick={() => player.next()} aria-label="Next" className="text-dim hover:text-text">
            <SkipForward size={16} />
          </button>
        </div>
        <div className="flex w-full max-w-md items-center gap-2">
          <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums text-dim">
            {formatDuration(Math.floor(player.currentTime))}
          </span>
          <div
            className="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-line-2"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              player.seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)))
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-accent"
              style={{ width: `${player.progress * 100}%` }}
            />
          </div>
          <span className="w-9 shrink-0 font-mono text-[10px] tabular-nums text-dim">
            {formatDuration(Math.floor(player.duration))}
          </span>
        </div>
      </div>

      <div className="hidden w-[120px] shrink-0 sm:block" />
    </footer>
  )
}
