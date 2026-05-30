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
 * Beats view — a single big artwork-as-card with all controls overlaid, and
 * a rainbow audio-reactive bar visualiser around its perimeter.
 *
 * Sizing is responsive: on phones the card fills the available area as a
 * portrait rectangle (background-cover handles the artwork crop). On wider
 * viewports it locks back to a square so the cover reads as a cover.
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
  // doesn't eat the card on phones.
  const pad = vp.isSmall ? 22 : 60
  const cornerRadius = vp.isSmall ? 18 : 24
  const maxBarLen = pad - 4

  const containerStyle: React.CSSProperties = vp.isSmall
    ? { width: '100%', height: '100%' }
    : {
        width: 'min(88vmin, calc(100vh - 96px))',
        height: 'min(88vmin, calc(100vh - 96px))',
      }

  return (
    <div className="relative h-full w-full overflow-hidden p-0 sm:p-4">
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

      {/* Card + perimeter visualiser composition */}
      <div className="flex h-full w-full items-center justify-center">
        <div className="relative" style={containerStyle}>
          {/* Rainbow bars around the card edge */}
          <PerimeterVisualiser
            analyserRef={player.analyserRef}
            playing={player.playing}
            pad={pad}
            cornerRadius={cornerRadius}
            maxBarLen={maxBarLen}
          />
          {/* The artwork-as-card, inset by `pad` to leave room for the visualiser */}
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
