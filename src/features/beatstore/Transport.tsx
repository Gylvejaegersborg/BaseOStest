import { useEffect, useRef } from 'react'
import { ExternalLink, Pause, Play, Shuffle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { type Beat, type LicenseTier, formatDuration, formatPrice } from '@/data/beats'

interface TransportProps {
  beat: Beat | null
  playing: boolean
  progress: number
  currentTime: number
  duration: number
  shuffle: boolean
  cartTiers: Set<LicenseTier>
  analyserRef: React.MutableRefObject<AnalyserNode | null>
  onTogglePlay: () => void
  onToggleShuffle: () => void
  onSeek: (t01: number) => void
  onAddToCart: (tier: LicenseTier, price: number) => void
}

export function Transport({
  beat,
  playing,
  progress,
  currentTime,
  duration,
  shuffle,
  cartTiers,
  analyserRef,
  onTogglePlay,
  onToggleShuffle,
  onSeek,
  onAddToCart,
}: TransportProps) {
  if (!beat) return null
  return (
    <div className="w-full max-w-3xl space-y-4 rounded-2xl border border-isark-line bg-isark-surface/70 p-4 backdrop-blur-md">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <PulseTitle analyserRef={analyserRef}>{beat.title}</PulseTitle>
            <span className="text-sm text-isark-dim">— {beat.artist}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-isark-dim">
            <span>{beat.bpm} BPM</span>
            <span>·</span>
            <span>{beat.musicalKey}</span>
            <span>·</span>
            <span>{formatDuration(beat.durationSec)}</span>
            {beat.mood.length > 0 && (
              <>
                <span>·</span>
                <span className="text-isark-accent-2">{beat.mood.join(' / ')}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <ColorModules beat={beat} />
          {beat.soundcloudUrl && (
            <a
              href={beat.soundcloudUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-md border border-isark-line px-2.5 py-1 text-[11px] text-isark-dim transition-colors hover:border-isark-accent hover:text-isark-text"
            >
              SoundCloud <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>

      {/* Play + progress row */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-isark-accent text-isark-bg shadow-[0_0_30px_rgba(204,255,0,0.35)] transition-transform hover:scale-105 active:scale-95"
        >
          {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
        </button>
        <button
          type="button"
          onClick={onToggleShuffle}
          aria-label="Shuffle"
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors',
            shuffle
              ? 'border-isark-accent bg-isark-accent/15 text-isark-accent'
              : 'border-isark-line text-isark-dim hover:border-isark-accent/60 hover:text-isark-text',
          )}
        >
          <Shuffle size={16} />
        </button>
        <div className="flex flex-1 items-center gap-2">
          <span className="w-10 text-right font-mono text-[11px] text-isark-dim">{formatDuration(currentTime)}</span>
          <SeekBar progress={progress} onSeek={onSeek} />
          <span className="w-10 font-mono text-[11px] text-isark-dim">{formatDuration(duration || beat.durationSec)}</span>
        </div>
      </div>

      {/* Licenses */}
      <div className="grid grid-cols-3 gap-2">
        {beat.licenses.map((lic) => {
          const inCart = cartTiers.has(lic.tier)
          return (
            <button
              key={lic.tier}
              type="button"
              onClick={() => !inCart && onAddToCart(lic.tier, lic.price)}
              disabled={inCart}
              className={cn(
                'group flex flex-col items-start rounded-lg border p-3 text-left transition-all',
                inCart
                  ? 'border-isark-accent/60 bg-isark-accent/10 text-isark-accent'
                  : 'border-isark-line bg-isark-elevated/60 hover:border-isark-accent hover:bg-isark-elevated',
              )}
            >
              <div className="flex w-full items-baseline justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-isark-dim group-hover:text-isark-text">
                  {lic.tier}
                </span>
                <span className="font-sans text-sm font-semibold text-isark-text">
                  {inCart ? 'Added' : formatPrice(lic.price)}
                </span>
              </div>
              <span className="mt-1 line-clamp-1 text-[11px] text-isark-dim">{lic.note}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Track title that subtly scales and letter-spaces with the audio's overall
 * loudness (RMS of analyser data). Calm when paused; breathes on loud peaks.
 */
function PulseTitle({
  analyserRef,
  children,
}: {
  analyserRef: React.MutableRefObject<AnalyserNode | null>
  children: React.ReactNode
}) {
  const elRef = useRef<HTMLHeadingElement>(null)
  const bufRef = useRef<Uint8Array<ArrayBuffer> | null>(null)

  useEffect(() => {
    let raf = 0
    let smoothed = 0
    const tick = () => {
      const an = analyserRef.current
      const el = elRef.current
      if (an && el) {
        if (!bufRef.current || bufRef.current.length !== an.frequencyBinCount) {
          bufRef.current = new Uint8Array(new ArrayBuffer(an.frequencyBinCount))
        }
        an.getByteFrequencyData(bufRef.current)
        const arr = bufRef.current
        let sum = 0
        for (let i = 0; i < arr.length; i++) sum += arr[i]
        const avg = arr.length > 0 ? sum / arr.length / 255 : 0
        // Light smoothing so the title breathes rather than jitters.
        smoothed = smoothed * 0.78 + avg * 0.22
        const pulse = Math.min(1, smoothed * 1.8)
        el.style.setProperty('--pulse', String(pulse))
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [analyserRef])

  return (
    <h2
      ref={elRef}
      className="truncate font-sans text-2xl font-bold tracking-tight text-isark-text"
      style={
        {
          '--pulse': 0,
          letterSpacing: 'calc(-0.005em + var(--pulse) * 0.04em)',
          transform: 'scale(calc(1 + var(--pulse) * 0.04))',
          transformOrigin: 'left center',
          willChange: 'transform, letter-spacing',
        } as React.CSSProperties
      }
    >
      {children}
    </h2>
  )
}

/**
 * Compact row of color tiles derived from the beat (gradient stops + a couple
 * of brand accents). Gently pulses to give the transport some life when paused.
 */
function ColorModules({ beat }: { beat: Beat }) {
  const colors = [beat.gradient[0], beat.gradient[1], '#A78BFA', '#CCFF00']
  return (
    <div className="flex gap-1.5">
      {colors.map((c, i) => (
        <div
          key={i}
          className="h-4 w-4 rounded-md shadow-[0_0_8px_rgba(255,255,255,0.08)] animate-module-pulse"
          style={{ background: c, animationDelay: `${i * 0.35}s` }}
        />
      ))}
    </div>
  )
}

function SeekBar({ progress, onSeek }: { progress: number; onSeek: (t: number) => void }) {
  return (
    <div
      role="slider"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      className="group relative h-2 flex-1 cursor-pointer rounded-full bg-isark-line"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        onSeek((e.clientX - rect.left) / rect.width)
      }}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-isark-accent transition-[width]"
        style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
      />
      <div
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-isark-accent opacity-0 shadow-[0_0_8px_rgba(204,255,0,0.6)] transition-opacity group-hover:opacity-100"
        style={{ left: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
      />
    </div>
  )
}
