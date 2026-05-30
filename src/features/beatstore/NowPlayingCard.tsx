import { useEffect, useState } from 'react'
import type { Beat, LicenseTier } from '@/data/beats'
import { Transport } from './Transport'
import { generateLabelDataURL } from './textures'
import type { BeatPlayer } from './useBeatPlayer'

interface NowPlayingCardProps {
  player: BeatPlayer
  cartTiersFor: (beatId: string) => Set<LicenseTier>
  onAddToCart: (beat: Beat, tier: LicenseTier, price: number) => void
}

/**
 * The "Now Playing" card — a big square showing the current beat's artwork
 * with all the transport controls overlaid in a glass info panel at the
 * bottom. Real `coverImage` files are used when available; otherwise the
 * procedural artwork generator paints a unique cover from the beat's gradient
 * and id. Artwork crossfades on track change.
 */
export function NowPlayingCard({ player, cartTiersFor, onAddToCart }: NowPlayingCardProps) {
  const beat = player.current

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-isark-line/60 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)]">
      {/* Artwork layer (crossfades when beat changes) */}
      {beat && <ArtworkLayer beat={beat} />}

      {/* Legibility veil — keeps the artwork visible up top, darkens the bottom for the glass panel */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-isark-bg/95 via-isark-bg/55 to-transparent" />

      {/* Top eyebrow */}
      <div className="pointer-events-none absolute right-5 top-5 z-10 font-mono text-[10px] uppercase tracking-[0.35em] text-isark-text/70">
        Now Playing
      </div>

      {/* Glass info panel at the bottom — Transport sits inside */}
      <div className="absolute inset-x-4 bottom-4 z-10 sm:inset-x-6 sm:bottom-6">
        <div className="rounded-2xl border border-isark-line/60 bg-isark-bg/45 p-4 backdrop-blur-2xl sm:p-5">
          <Transport
            beat={beat}
            playing={player.playing}
            progress={player.progress}
            currentTime={player.currentTime}
            duration={player.duration}
            shuffle={player.shuffle}
            cartTiers={beat ? cartTiersFor(beat.id) : new Set()}
            analyserRef={player.analyserRef}
            onTogglePlay={() => beat && player.toggle(beat)}
            onToggleShuffle={() => player.setShuffle(!player.shuffle)}
            onSeek={player.seek}
            onAddToCart={(tier, price) => beat && onAddToCart(beat, tier, price)}
            onPrev={player.prev}
            onNext={player.next}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Resolves the artwork source for a beat (real file → procedural fallback)
 * and renders it as a smoothly-crossfading background layer keyed on the
 * beat id so React mounts a fresh `animate-fade-in` for each track change.
 */
function ArtworkLayer({ beat }: { beat: Beat }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const useFallback = () => {
      if (cancelled) return
      const url = generateLabelDataURL(beat.gradient, beat.title, beat.id)
      setSrc(url)
    }
    if (beat.coverImage) {
      const img = new Image()
      img.onload = () => {
        if (!cancelled) setSrc(beat.coverImage!)
      }
      img.onerror = useFallback
      img.src = beat.coverImage
    } else {
      useFallback()
    }
    return () => {
      cancelled = true
    }
  }, [beat])

  if (!src) {
    // First-paint placeholder — soft gradient so the card doesn't flash empty.
    return (
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(135deg, ${beat.gradient[0]}, ${beat.gradient[1]})` }}
      />
    )
  }

  return (
    <div
      key={beat.id}
      className="absolute inset-0 animate-fade-in bg-cover bg-center"
      style={{ backgroundImage: `url(${src})` }}
    />
  )
}
