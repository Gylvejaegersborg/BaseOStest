import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { type Beat, type LicenseTier, formatDuration } from '@/data/beats'
import { Transport } from './Transport'
import { generateLabelDataURL } from './textures'
import type { BeatPlayer } from './useBeatPlayer'

interface NowPlayingCardProps {
  player: BeatPlayer
  cartTiersFor: (beatId: string) => Set<LicenseTier>
  onAddToCart: (beat: Beat, tier: LicenseTier, price: number) => void
}

/**
 * The Now Playing card — a big square (or portrait on phones) showing the
 * current beat's artwork edge-to-edge. The song's text (title, artist, meta)
 * floats over the artwork as a glassy pill at the top; the transport controls
 * sit in a separate glass panel at the bottom.
 */
export function NowPlayingCard({ player, cartTiersFor, onAddToCart }: NowPlayingCardProps) {
  const beat = player.current

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-isark-line/60 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)]">
      {/* Artwork layer (crossfades when beat changes) */}
      {beat && <ArtworkLayer beat={beat} />}

      {/* Soft top + bottom veils so the glassy text and the transport panel stay legible
          regardless of cover */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-isark-bg/85 via-transparent to-isark-bg/40" />

      {/* Glassy title pill hovering over the artwork */}
      {beat && <TitleOverlay beat={beat} />}

      {/* Glass info panel at the bottom — transport + licenses only */}
      <div className="absolute inset-x-3 bottom-3 z-10 sm:inset-x-5 sm:bottom-5">
        <div className="rounded-2xl border border-white/10 bg-black/35 p-3 backdrop-blur-2xl sm:p-4">
          <Transport
            beat={beat}
            playing={player.playing}
            progress={player.progress}
            currentTime={player.currentTime}
            duration={player.duration}
            shuffle={player.shuffle}
            cartTiers={beat ? cartTiersFor(beat.id) : new Set()}
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
 * Floating glassy text pill over the artwork — title + artist + a tiny mono
 * metadata line. Sits at the top of the card. Translucent fill + backdrop blur
 * so the cover shows through.
 */
function TitleOverlay({ beat }: { beat: Beat }) {
  return (
    <div className="pointer-events-none absolute inset-x-3 top-4 z-10 sm:inset-x-5 sm:top-5">
      <div className="inline-block max-w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-3 backdrop-blur-md">
        <h2 className="truncate font-sans text-2xl font-bold tracking-tight text-white/95 [text-shadow:0_2px_18px_rgba(0,0,0,0.5)] sm:text-3xl">
          {beat.title}
        </h2>
        <p className="mt-0.5 truncate text-sm text-white/75 [text-shadow:0_1px_10px_rgba(0,0,0,0.6)]">
          {beat.artist}
        </p>
        {/* BPM · key · duration on one row */}
        <p className="mt-1.5 truncate font-mono text-[10px] uppercase tracking-[0.18em] text-white/65 sm:text-[11px]">
          <span>{beat.bpm} BPM</span>
          <span className="mx-2">·</span>
          <span>{beat.musicalKey}</span>
          <span className="mx-2">·</span>
          <span>{formatDuration(beat.durationSec)}</span>
        </p>
        {/* Mood / genre on its own row so it doesn't reflow into the metadata */}
        {beat.mood.length > 0 && (
          <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.22em] text-isark-accent-2 sm:text-[11px]">
            {beat.mood.join(' · ')}
          </p>
        )}
        {beat.soundcloudUrl && (
          <a
            href={beat.soundcloudUrl}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto mt-2 inline-flex items-center gap-1 text-[11px] text-white/70 hover:text-white"
          >
            SoundCloud <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  )
}

/**
 * Resolves the artwork source (real coverImage → procedural fallback) and
 * renders it as a smoothly crossfading background layer keyed on the beat
 * id so React mounts a fresh `animate-fade-in` on every track change.
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
