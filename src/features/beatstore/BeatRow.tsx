import { Check, Pause, Play, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDuration, formatPlays, formatPrice, type Beat, type LicenseTier } from '@/data/beats'
import { Waveform } from './Waveform'

interface BeatRowProps {
  beat: Beat
  playing: boolean
  cartTiers: Set<LicenseTier>
  onTogglePlay: () => void
  onAdd: (tier: LicenseTier, price: number) => void
}

export function BeatRow({ beat, playing, cartTiers, onTogglePlay, onAdd }: BeatRowProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-isark-line bg-isark-surface p-3 transition-colors hover:border-isark-line/0 hover:bg-isark-elevated sm:flex-row sm:items-center">
      {/* Cover + play */}
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={playing ? `Pause ${beat.title}` : `Play ${beat.title}`}
        className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg"
        style={{ background: `linear-gradient(135deg, ${beat.gradient[0]}, ${beat.gradient[1]})` }}
      >
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-black/35 text-isark-text transition-opacity',
            playing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          {playing ? <Pause size={22} /> : <Play size={22} />}
        </span>
      </button>

      {/* Title, meta, waveform */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-sans text-base font-semibold tracking-tight text-isark-text">{beat.title}</h3>
          {beat.mood.map((m) => (
            <span
              key={m}
              className="hidden rounded-full border border-isark-line px-2 py-0.5 text-[10px] uppercase tracking-wide text-isark-dim sm:inline"
            >
              {m}
            </span>
          ))}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 font-mono text-[11px] text-isark-dim">
          <span>{beat.bpm} BPM</span>
          <span>{beat.musicalKey}</span>
          <span>{formatDuration(beat.durationSec)}</span>
          <span>{formatPlays(beat.plays)} plays</span>
        </div>
        <div className="mt-2">
          <Waveform seed={beat.id} playing={playing} />
        </div>
      </div>

      {/* License tiers */}
      <div className="flex shrink-0 flex-col gap-1.5 sm:w-44">
        {beat.licenses.map((lic) => {
          const added = cartTiers.has(lic.tier)
          return (
            <button
              key={lic.tier}
              type="button"
              onClick={() => !added && onAdd(lic.tier, lic.price)}
              title={lic.note}
              className={cn(
                'flex items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors',
                added
                  ? 'border-isark-accent/40 bg-isark-accent/10 text-isark-accent'
                  : 'border-isark-line text-isark-text hover:border-isark-accent hover:bg-isark-accent/5',
              )}
            >
              <span className="flex items-center gap-1.5">
                {added ? <Check size={13} /> : <Plus size={13} className="text-isark-dim" />}
                <span className="font-medium">{lic.tier}</span>
              </span>
              <span className="font-mono">{formatPrice(lic.price)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
