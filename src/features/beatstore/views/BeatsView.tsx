import { useState } from 'react'
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
 */
export function BeatsView({ player, cartTiersFor, onAddToCart }: BeatsViewProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [mood, setMood] = useState<string | null>(null)

  const current = player.current

  // Tunables — kept in one place so card/visualiser stay in sync.
  const PAD = 60
  const CARD_RADIUS = 24

  return (
    <div className="relative h-full w-full overflow-hidden p-4">
      {/* Search / menu toggle — outside the card so it stays available everywhere */}
      <div className="pointer-events-auto absolute left-4 top-4 z-30">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg border border-isark-line/70 bg-isark-surface/60 px-3 py-2 text-sm text-isark-dim backdrop-blur-md transition-colors hover:border-isark-accent hover:text-isark-text"
        >
          <Search size={14} />
          <span>Browse beats</span>
        </button>
      </div>

      {/* Card + perimeter visualiser composition — a big square centred on the viewport. */}
      <div className="flex h-full w-full items-center justify-center">
        <div
          className="relative aspect-square"
          style={{
            width: 'min(88vmin, calc(100vh - 96px))',
            height: 'min(88vmin, calc(100vh - 96px))',
          }}
        >
          {/* Rainbow bars around the card edge */}
          <PerimeterVisualiser
            analyserRef={player.analyserRef}
            playing={player.playing}
            pad={PAD}
            cornerRadius={CARD_RADIUS}
          />
          {/* The artwork-as-card, inset to leave room for the visualiser */}
          <div
            className="absolute"
            style={{
              left: PAD,
              top: PAD,
              right: PAD,
              bottom: PAD,
              borderRadius: CARD_RADIUS,
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
