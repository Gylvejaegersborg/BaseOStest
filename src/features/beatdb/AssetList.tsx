import { Play, Pause } from 'lucide-react'
import { fileKindOf, type Asset } from '@/data/library'
import { formatDuration, formatPlays } from '@/data/beats'
import { categoryMeta } from './categories'
import { shortDate } from '@/lib/time'
import { cn } from '@/lib/cn'

interface AssetListProps {
  assets: Asset[]
  selectedId: string | null
  playingId: string | null
  query: string
  onSelect: (a: Asset) => void
  onTogglePlay: (a: Asset) => void
}

export function AssetList({ assets, selectedId, playingId, query, onSelect, onTogglePlay }: AssetListProps) {
  if (assets.length === 0) {
    return <div className="p-6 text-center text-xs text-dim">No assets match.</div>
  }
  return (
    <ul className="divide-y divide-line/60">
      {assets.map((a) => (
        <AssetRow
          key={a.id}
          asset={a}
          selected={a.id === selectedId}
          playing={a.id === playingId}
          query={query}
          onSelect={() => onSelect(a)}
          onTogglePlay={() => onTogglePlay(a)}
        />
      ))}
    </ul>
  )
}

function AssetRow({
  asset,
  selected,
  playing,
  query,
  onSelect,
  onTogglePlay,
}: {
  asset: Asset
  selected: boolean
  playing: boolean
  query: string
  onSelect: () => void
  onTogglePlay: () => void
}) {
  const meta = categoryMeta(asset.category)
  const Icon = meta.icon
  const audio = fileKindOf(asset) === 'audio'

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect())}
        className={cn(
          'group flex cursor-pointer items-center gap-3 border-l-2 px-3 py-2.5 transition-colors',
          selected ? 'bg-panel-2/60' : 'border-transparent hover:bg-panel-2/40',
        )}
        style={selected ? { borderColor: meta.accent } : undefined}
      >
        {/* Art / play affordance */}
        <div
          className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded"
          style={{ background: `linear-gradient(135deg, ${asset.gradient[0]}, ${asset.gradient[1]})` }}
        >
          {audio ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onTogglePlay()
              }}
              aria-label={playing ? `Pause ${asset.title}` : `Play ${asset.title}`}
              className="grid h-full w-full place-items-center bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              style={playing ? { opacity: 1 } : undefined}
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}
            </button>
          ) : (
            <Icon size={16} className="text-white/85" />
          )}
          {playing && <Equalizer />}
        </div>

        {/* Title + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('truncate text-sm', selected ? 'text-text' : 'text-text/90')}>
              <Highlight text={asset.title} q={query} />
            </span>
            {playing && (
              <span className="shrink-0 text-[9px] uppercase tracking-wider" style={{ color: meta.accent }}>
                playing
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-dim">{metaLine(asset)}</div>
        </div>

        {/* File type chip */}
        <span
          className="hidden shrink-0 rounded-sm border px-1.5 py-0.5 text-[9px] uppercase tracking-wider sm:inline"
          style={{ color: meta.accent, borderColor: `${meta.accent}44` }}
        >
          {asset.fileType}
        </span>
      </div>
    </li>
  )
}

function metaLine(a: Asset): string {
  const parts: string[] = [categoryMeta(a.category).label]
  if (a.bpm) parts.push(`${a.bpm} BPM`)
  if (a.musicalKey) parts.push(a.musicalKey)
  if (a.durationSec) parts.push(formatDuration(a.durationSec))
  if (a.plays) parts.push(`${formatPlays(a.plays)} plays`)
  if (a.fileSize) parts.push(a.fileSize)
  parts.push(shortDate(new Date(a.date)))
  return parts.join(' · ')
}

/** Three little bars that bounce while a track plays. */
function Equalizer() {
  return (
    <span className="absolute bottom-0.5 right-0.5 flex items-end gap-[1.5px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[2px] animate-wave-pulse rounded-full bg-white"
          style={{ height: 6 + i * 2, animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  )
}

export function Highlight({ text, q }: { text: string; q: string }) {
  const term = q.trim()
  if (!term) return <>{text}</>
  const idx = text.toLowerCase().indexOf(term.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent/30 text-text">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  )
}
