import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import type { Beat, LicenseTier } from '@/data/beats'
import { BeatMenu } from '../BeatMenu'
import { NowPlayingCard } from '../NowPlayingCard'
import { PerimeterVisualiser } from '../PerimeterVisualiser'
import type { BeatPlayer } from '../useBeatPlayer'

interface BeatsViewProps {
  player: BeatPlayer
  cartTiersFor: (beatId: string) => Set<LicenseTier>
  onAddToCart: (beat: Beat, tier: LicenseTier, price: number) => void
}

/**
 * Beats view — a single artwork-as-card with all controls overlaid, and a
 * rainbow audio-reactive bar visualiser around its perimeter. The card fills
 * the available area on every viewport so the visualiser bars sit right up
 * against the screen edge.
 */
export function BeatsView({ player, cartTiersFor, onAddToCart }: BeatsViewProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [mood, setMood] = useState<string | null>(null)
  const [vp, setVp] = useState(() => readViewport())

  useEffect(() => {
    const onResize = () => setVp(readViewport())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const current = player.current

  // Pad / corner radius / bar length scale with the viewport so the visualiser
  // doesn't eat the card on phones but still has room to breathe on desktop.
  const pad = vp.isSmall ? 22 : 56
  const cornerRadius = vp.isSmall ? 18 : 24
  const maxBarLen = pad - 4

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Search / menu toggle — outside the card so it stays available everywhere */}
      <div className="pointer-events-auto absolute left-3 top-3 z-30 sm:left-4 sm:top-4">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Browse beats"
          className="flex items-center gap-2 rounded-lg border border-isark-line/70 bg-isark-surface/60 px-2.5 py-2 text-sm text-isark-dim backdrop-blur-md transition-colors hover:border-isark-accent hover:text-isark-text sm:px-3"
        >
          <Search size={14} />
          <span className="hidden sm:inline">Browse beats</span>
        </button>
      </div>

      {/* Card + perimeter visualiser composition — fills the whole content area
          so the rainbow bars touch the wall on every side. */}
      <div className="relative h-full w-full">
        {/* Rainbow bars around the card edge */}
        <PerimeterVisualiser
          analyserRef={player.analyserRef}
          playing={player.playing}
          pad={pad}
          cornerRadius={cornerRadius}
          maxBarLen={maxBarLen}
        />
        {/* The artwork-as-card, inset by `pad` so the visualiser sits between
            the card and the viewport wall. */}
        <div
          className="absolute"
          style={{
            left: pad,
            top: pad,
            right: pad,
            bottom: pad,
            borderRadius: cornerRadius,
          }}
        >
          {current ? (
            <NowPlayingCard
              player={player}
              cartTiersFor={cartTiersFor}
              onAddToCart={onAddToCart}
            />
          ) : null}
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

function readViewport(): { isSmall: boolean } {
  if (typeof window === 'undefined') return { isSmall: false }
  return { isSmall: window.innerWidth < 640 }
}
