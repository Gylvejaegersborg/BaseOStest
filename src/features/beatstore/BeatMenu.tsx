import { useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { BEATS, MOODS, type Beat, formatDuration, formatPlays } from '@/data/beats'

interface BeatMenuProps {
  open: boolean
  onClose: () => void
  currentId: string | null
  playingId: string | null
  query: string
  onQuery: (q: string) => void
  mood: string | null
  onMood: (m: string | null) => void
  onPick: (beat: Beat) => void
}

/**
 * Semi-transparent slide-in panel listing every beat with search and mood filters.
 */
export function BeatMenu({ open, onClose, currentId, playingId, query, onQuery, mood, onMood, onPick }: BeatMenuProps) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return BEATS.filter((b) => {
      if (mood && !b.mood.includes(mood)) return false
      if (!q) return true
      return b.title.toLowerCase().includes(q) || b.mood.some((m) => m.toLowerCase().includes(q))
    })
  }, [query, mood])

  return (
    <aside
      className={cn(
        'pointer-events-auto fixed right-0 top-14 z-30 flex h-[calc(100%-3.5rem)] w-[360px] max-w-[92vw] flex-col border-l border-isark-line/60 bg-isark-bg/40 backdrop-blur-xl transition-transform duration-300',
        open ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      <div className="space-y-3 border-b border-isark-line/60 p-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-isark-line/80 bg-isark-surface/70 px-3 py-2">
            <Search size={14} className="text-isark-dim" />
            <input
              autoFocus={open}
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search beats or moods…"
              className="flex-1 bg-transparent text-sm text-isark-text placeholder:text-isark-dim focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="text-isark-dim hover:text-isark-text"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={mood === null} onClick={() => onMood(null)}>
            All
          </Chip>
          {MOODS.map((m) => (
            <Chip key={m} active={mood === m} onClick={() => onMood(mood === m ? null : m)}>
              {m}
            </Chip>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-isark-dim">No beats match that.</p>
        ) : (
          filtered.map((beat) => (
            <BeatLine
              key={beat.id}
              beat={beat}
              active={beat.id === currentId}
              playing={beat.id === playingId}
              onPick={() => onPick(beat)}
            />
          ))
        )}
      </div>
    </aside>
  )
}

function BeatLine({
  beat,
  active,
  playing,
  onPick,
}: {
  beat: Beat
  active: boolean
  playing: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-lg border bg-isark-surface/40 p-2 text-left transition-colors',
        active ? 'border-isark-accent/60' : 'border-transparent hover:border-isark-line',
      )}
    >
      <WaveSwatch beat={beat} playing={playing} />
      <div className="min-w-0 flex-1">
        <div className={cn('truncate text-sm font-semibold', active ? 'text-isark-accent' : 'text-isark-text')}>
          {beat.title}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-isark-dim">
          {beat.bpm} BPM · {beat.musicalKey} · {formatDuration(beat.durationSec)} · {formatPlays(beat.plays)} plays
        </div>
      </div>
    </button>
  )
}

/**
 * The mini wave-bar mockup #21 — gradient base with a horizontal cyan→magenta
 * wave that breathes when its beat is playing.
 */
function WaveSwatch({ beat, playing }: { beat: Beat; playing: boolean }) {
  return (
    <div
      className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md"
      style={{ background: `linear-gradient(135deg, ${beat.gradient[0]}, ${beat.gradient[1]})` }}
    >
      <div
        className={cn(
          'absolute inset-x-1 bottom-1 h-3 rounded',
          playing ? 'animate-wave-pulse' : 'opacity-70',
        )}
        style={{
          background: 'linear-gradient(90deg, #06B6D4, #A78BFA, #EC4899)',
          filter: playing ? undefined : 'blur(1.5px)',
        }}
      />
      {playing && (
        <span className="absolute right-1 top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-isark-accent shadow-[0_0_6px_rgba(167,139,250,0.9)]" />
      )}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-[11px] transition-colors',
        active
          ? 'border-isark-accent bg-isark-accent text-isark-bg'
          : 'border-isark-line/80 text-isark-dim hover:border-isark-accent hover:text-isark-text',
      )}
    >
      {children}
    </button>
  )
}
