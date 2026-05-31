import { ChevronLeft, ChevronRight, Pause, Play, Shuffle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { type Beat, type License, type LicenseTier, formatDuration, formatPrice } from '@/data/beats'

interface TransportProps {
  beat: Beat | null
  playing: boolean
  progress: number
  currentTime: number
  duration: number
  shuffle: boolean
  cartTiers: Set<LicenseTier>
  onTogglePlay: () => void
  onToggleShuffle: () => void
  onSeek: (t01: number) => void
  /** Open the license detail modal — clicking a license button no longer adds directly. */
  onOpenLicense: (license: License) => void
  onPrev: () => void
  onNext: () => void
}

/**
 * The bottom glass panel on the Now Playing card — transport controls + license
 * tiers only. Song metadata (title, artist, BPM/key) lives in the floating
 * TitleOverlay over the artwork, not here.
 */
export function Transport({
  beat,
  playing,
  progress,
  currentTime,
  duration,
  shuffle,
  cartTiers,
  onTogglePlay,
  onToggleShuffle,
  onSeek,
  onOpenLicense,
  onPrev,
  onNext,
}: TransportProps) {
  if (!beat) return null
  return (
    <div className="w-full space-y-3">
      {/* Transport row: prev · play · next · shuffle · seek */}
      <div className="flex items-center gap-2">
        <TransportButton onClick={onPrev} label="Previous beat">
          <ChevronLeft size={18} />
        </TransportButton>
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-isark-accent text-isark-bg shadow-[0_0_24px_rgba(167,139,250,0.45)] transition-transform hover:scale-105 active:scale-95 sm:h-12 sm:w-12"
        >
          {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </button>
        <TransportButton onClick={onNext} label="Next beat">
          <ChevronRight size={18} />
        </TransportButton>
        <TransportButton onClick={onToggleShuffle} label="Shuffle" active={shuffle} className="ml-1">
          <Shuffle size={14} />
        </TransportButton>
        <div className="ml-2 flex flex-1 items-center gap-2">
          <span className="hidden w-10 text-right font-mono text-[11px] text-isark-text/70 sm:inline">
            {formatDuration(currentTime)}
          </span>
          <SeekBar progress={progress} onSeek={onSeek} />
          <span className="w-10 font-mono text-[11px] text-isark-text/70">
            {formatDuration(duration || beat.durationSec)}
          </span>
        </div>
      </div>

      {/* Licenses — click opens the detail modal for that tier */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {beat.licenses.map((lic) => {
          const inCart = cartTiers.has(lic.tier)
          const negotiable = lic.price === 'negotiable'
          return (
            <button
              key={lic.tier}
              type="button"
              onClick={() => onOpenLicense(lic)}
              aria-label={`View ${lic.tier} license`}
              className={cn(
                'group flex flex-col items-start rounded-lg border p-2.5 text-left transition-all sm:p-3',
                inCart
                  ? 'border-isark-accent/60 bg-isark-accent/10 text-isark-accent'
                  : 'border-isark-line/70 bg-isark-elevated/40 hover:border-isark-accent hover:bg-isark-elevated',
              )}
            >
              <div className="flex w-full items-baseline justify-between gap-1">
                <span className="truncate font-mono text-[10px] uppercase tracking-wider text-isark-text/70 group-hover:text-isark-text">
                  {lic.tier}
                </span>
                <span
                  className={cn(
                    'shrink-0 font-sans text-[13px] font-semibold text-isark-text sm:text-sm',
                    negotiable && 'text-isark-accent',
                  )}
                >
                  {inCart ? 'Added' : formatPrice(lic.price)}
                </span>
              </div>
              <span className="mt-0.5 hidden line-clamp-1 text-[11px] text-isark-text/55 sm:block">{lic.note}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TransportButton({
  onClick,
  label,
  active = false,
  className,
  children,
}: {
  onClick: () => void
  label: string
  active?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors',
        active
          ? 'border-isark-accent bg-isark-accent/15 text-isark-accent'
          : 'border-isark-line/70 text-isark-text/75 hover:border-isark-accent/60 hover:text-isark-text',
        className,
      )}
    >
      {children}
    </button>
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
      className="group relative h-2 flex-1 cursor-pointer rounded-full bg-isark-line/60"
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
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-isark-accent opacity-0 shadow-[0_0_8px_rgba(167,139,250,0.7)] transition-opacity group-hover:opacity-100"
        style={{ left: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
      />
    </div>
  )
}
