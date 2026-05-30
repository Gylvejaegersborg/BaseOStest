import { lazy, Suspense, useState } from 'react'
import { Search } from 'lucide-react'
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

/**
 * The Beats view — a single full-screen "Now Playing" card that holds the
 * 3D CD scene (the visualiser ring is sized to surround the card) plus the
 * transport with inline prev / next / shuffle. A semi-transparent beat menu
 * slides in from the right when the user opens the search.
 */
export function BeatsView({ player, cartTiersFor, onAddToCart }: BeatsViewProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [mood, setMood] = useState<string | null>(null)

  const current = player.current

  return (
    <div className="relative h-full w-full overflow-hidden p-3 sm:p-5">
      {/* The Now Playing card */}
      <div
        className="relative mx-auto flex h-full w-full max-w-[1500px] flex-col overflow-hidden rounded-3xl border border-isark-line/70 shadow-[0_30px_120px_-30px_rgba(167,139,250,0.35)] backdrop-blur-xl"
        style={{
          background: current
            ? `linear-gradient(180deg, rgba(20,20,25,0.55), rgba(11,11,14,0.92)), radial-gradient(ellipse at 50% 30%, ${current.gradient[0]}1f, transparent 65%), radial-gradient(ellipse at 50% 95%, ${current.gradient[1]}2a, transparent 70%)`
            : 'rgba(20,20,25,0.85)',
        }}
      >
        {/* Perspective gridflow floor (#15) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[55%] overflow-hidden [perspective:1200px]">
          <div
            className="absolute inset-0 origin-bottom animate-grid-flow"
            style={{
              transform: 'rotateX(72deg)',
              backgroundImage:
                'linear-gradient(rgba(167,139,250,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,0.10) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
              maskImage: 'linear-gradient(to top, black 30%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to top, black 30%, transparent 100%)',
            }}
          />
        </div>

        {/* Floating sonic dust (#16 / #21) */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div
            className="absolute -inset-[50%] animate-dust-drift opacity-[0.06]"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)',
              backgroundSize: '70px 70px',
            }}
          />
          <div
            className="absolute -inset-[50%] animate-dust-drift-reverse opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(244,168,232,0.9) 1px, transparent 1px)',
              backgroundSize: '110px 110px',
            }}
          />
        </div>

        {/* Search / menu toggle — top-left of the card */}
        <div className="pointer-events-auto absolute left-4 top-4 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-isark-line/70 bg-isark-surface/60 px-3 py-2 text-sm text-isark-dim backdrop-blur-md transition-colors hover:border-isark-accent hover:text-isark-text"
          >
            <Search size={14} />
            <span>Browse beats</span>
          </button>
        </div>

        {/* "NOW PLAYING" eyebrow — top-right */}
        <div className="pointer-events-none absolute right-5 top-5 z-20 font-mono text-[10px] uppercase tracking-[0.35em] text-isark-dim">
          Now Playing
        </div>

        {/* The 3D CD scene fills the entire card (visualiser ring frames the perimeter) */}
        <div className="absolute inset-0 z-10">
          <Suspense fallback={<CanvasFallback />}>
            <CDPlayer
              current={current}
              playing={player.playing}
              swapToken={player.swapToken}
              analyserRef={player.analyserRef}
            />
          </Suspense>
        </div>

        {/* Transport overlay — anchored to the bottom of the card */}
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex justify-center p-4">
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
            onPrev={player.prev}
            onNext={player.next}
          />
        </div>
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

function CanvasFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-32 w-32 animate-pulse rounded-full bg-isark-elevated/60" />
    </div>
  )
}
