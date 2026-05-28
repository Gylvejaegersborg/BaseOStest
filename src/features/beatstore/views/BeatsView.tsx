import { lazy, Suspense, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Beat, LicenseTier } from '@/data/beats'
import { Transport } from '../Transport'
import { BeatMenu } from '../BeatMenu'
import type { BeatPlayer } from '../useBeatPlayer'

const CDPlayer = lazy(() => import('../cdplayer/CDPlayer').then((m) => ({ default: m.CDPlayer })))

interface BeatsViewProps {
  player: BeatPlayer
  cartTiersFor: (beatId: string) => Set<LicenseTier>
  onAddToCart: (beat: Beat, tier: LicenseTier, price: number) => void
}

export function BeatsView({ player, cartTiersFor, onAddToCart }: BeatsViewProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [mood, setMood] = useState<string | null>(null)

  const current = player.current

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Background colour wash — driven by the current beat's gradient */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: current
            ? `radial-gradient(ellipse at 50% 30%, ${current.gradient[0]}22, transparent 70%), radial-gradient(ellipse at 50% 90%, ${current.gradient[1]}33, transparent 80%)`
            : undefined,
        }}
      />

      {/* Perspective gridflow floor (#15 from the mockup) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[55%] overflow-hidden [perspective:1200px]">
        <div
          className="absolute inset-0 origin-bottom animate-grid-flow"
          style={{
            transform: 'rotateX(72deg)',
            backgroundImage:
              'linear-gradient(rgba(204,255,0,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(204,255,0,0.07) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'linear-gradient(to top, black 30%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 30%, transparent 100%)',
          }}
        />
      </div>

      {/* Floating sonic dust (#16/#21 from the mockup) */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute -inset-[50%] animate-dust-drift opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)',
            backgroundSize: '70px 70px',
          }}
        />
        <div
          className="absolute -inset-[50%] animate-dust-drift-reverse opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(166,139,255,0.9) 1px, transparent 1px)',
            backgroundSize: '110px 110px',
          }}
        />
      </div>

      {/* Search / menu toggle */}
      <div className="pointer-events-auto absolute left-4 top-4 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg border border-isark-line/70 bg-isark-surface/60 px-3 py-2 text-sm text-isark-dim backdrop-blur-md transition-colors hover:border-isark-accent hover:text-isark-text"
        >
          <Search size={14} />
          <span>Browse beats</span>
        </button>
      </div>

      <ArrowButton side="left" onClick={player.prev} />
      <ArrowButton side="right" onClick={player.next} />

      {/* The 3D CD player — center stage */}
      <div className="absolute inset-x-0 top-0 z-10 flex h-[58%] items-center justify-center">
        <div className="relative h-full w-full max-w-3xl">
          <Suspense fallback={<CanvasFallback />}>
            <CDPlayer
              current={current}
              playing={player.playing}
              swapToken={player.swapToken}
              analyserRef={player.analyserRef}
            />
          </Suspense>
        </div>
      </div>

      {/* Transport strip */}
      <div className="absolute inset-x-0 bottom-6 z-10 flex justify-center px-4">
        <Transport
          beat={current}
          playing={player.playing}
          progress={player.progress}
          currentTime={player.currentTime}
          duration={player.duration}
          shuffle={player.shuffle}
          cartTiers={current ? cartTiersFor(current.id) : new Set()}
          analyserRef={player.analyserRef}
          onTogglePlay={() => current && player.toggle(current)}
          onToggleShuffle={() => player.setShuffle(!player.shuffle)}
          onSeek={player.seek}
          onAddToCart={(tier, price) => current && onAddToCart(current, tier, price)}
        />
      </div>

      <BeatMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        currentId={current?.id ?? null}
        playingId={player.playing ? current?.id ?? null : null}
        query={query}
        onQuery={setQuery}
        mood={mood}
        onMood={setMood}
        onPick={(b) => player.play(b)}
      />
    </div>
  )
}

function ArrowButton({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous beat' : 'Next beat'}
      className={cn(
        'group absolute top-[28%] z-20 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-isark-line/70 bg-isark-surface/50 text-isark-text backdrop-blur-md transition-all hover:border-isark-accent hover:bg-isark-accent/15 hover:text-isark-accent active:scale-95',
        side === 'left' ? 'left-6 sm:left-10' : 'right-6 sm:right-10',
      )}
    >
      <Icon size={28} />
    </button>
  )
}

function CanvasFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-32 w-32 animate-pulse rounded-full bg-isark-elevated/60" />
    </div>
  )
}
