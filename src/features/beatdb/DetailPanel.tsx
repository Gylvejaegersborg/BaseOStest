import { useState } from 'react'
import { CornerUpRight, Pencil, Trash2 } from 'lucide-react'
import { deleteSong } from '@/features/library/libraryClient'
import { useRefreshOverlay } from '@/features/overlay/osOverlay'
import { assetById, type Asset } from '@/data/library'
import { formatDuration, formatPlays } from '@/data/beats'
import type { BeatPlayer } from '@/features/beatstore/useBeatPlayer'
import { Badge } from '@/components/ui/Badge'
import { shortDate } from '@/lib/time'
import { categoryMeta } from './categories'
import { FilePreview } from './FilePreview'

interface DetailPanelProps {
  asset: Asset
  player: BeatPlayer
  onSelectRelated?: (a: Asset) => void
  /** Edit an uploaded song (opens the song form). */
  onEdit?: (a: Asset) => void
}

export function DetailPanel({ asset, player, onSelectRelated, onEdit }: DetailPanelProps) {
  const refresh = useRefreshOverlay()
  const [confirming, setConfirming] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const remove = async () => {
    try {
      player.pause()
      await deleteSong(asset.id)
      setConfirming(false)
      await refresh()
    } catch (e) {
      setRemoveError(e instanceof Error ? e.message : String(e))
    }
  }
  const meta = categoryMeta(asset.category)
  const related = asset.relatedId ? assetById(asset.relatedId) : undefined

  const specs: Array<[string, string]> = []
  if (asset.bpm) specs.push(['BPM', String(asset.bpm)])
  if (asset.musicalKey) specs.push(['Key', asset.musicalKey])
  if (asset.durationSec) specs.push(['Length', formatDuration(asset.durationSec)])
  if (asset.plays) specs.push(['Plays', formatPlays(asset.plays)])
  specs.push(['Type', asset.fileType.toUpperCase()])
  if (asset.fileSize) specs.push(['Size', asset.fileSize])
  specs.push(['Added', shortDate(new Date(asset.date))])
  if (asset.source) specs.push(['Source', asset.source])

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span
            className="rounded-sm border px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
            style={{ color: meta.accent, borderColor: `${meta.accent}55`, backgroundColor: `${meta.accent}11` }}
          >
            {meta.label}
          </span>
          <span className="text-[10px] tracking-wider text-dim">{asset.fileType.toUpperCase()}</span>
        </div>
        <h2 className="font-display text-lg leading-tight text-text">{asset.title}</h2>
        <p className="text-xs text-dim">{asset.artist}</p>
      </div>

      <FilePreview asset={asset} player={player} />

      {asset.note && <p className="text-xs leading-relaxed text-text/85">{asset.note}</p>}

      {/* Tags */}
      {asset.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {asset.tags.map((t) => (
            <Badge key={t} color={meta.accent}>
              {t}
            </Badge>
          ))}
        </div>
      )}

      {/* Spec sheet */}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line text-xs">
        {specs.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 bg-panel px-2.5 py-1.5">
            <dt className="text-[9px] uppercase tracking-wider text-dim">{k}</dt>
            <dd className="truncate text-text/90">{v}</dd>
          </div>
        ))}
      </dl>

      {/* Uploaded songs are the operator's own: edit or remove them (and their files). */}
      {asset.uploaded && (
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex gap-2">
            <button onClick={() => onEdit?.(asset)} className="flex items-center gap-1.5 border border-line px-2.5 py-1.5 text-dim transition-colors hover:border-accent/50 hover:text-text">
              <Pencil size={12} /> Edit
            </button>
            {confirming ? (
              <>
                <button onClick={remove} className="border border-red-400/60 px-2.5 py-1.5 text-red-400 hover:bg-red-400/10">Delete for good</button>
                <button onClick={() => setConfirming(false)} className="px-2 py-1.5 text-dim hover:text-text">Keep</button>
              </>
            ) : (
              <button onClick={() => { setRemoveError(null); setConfirming(true) }} className="flex items-center gap-1.5 border border-line px-2.5 py-1.5 text-dim transition-colors hover:border-red-400/50 hover:text-red-400">
                <Trash2 size={12} /> Delete
              </button>
            )}
          </div>
          {confirming && <p className="text-[10px] text-dim">This removes the song and its uploaded audio from the server. It can't be undone.</p>}
          {removeError && <p role="alert" className="text-[11px] text-red-400">{removeError}</p>}
        </div>
      )}

      {/* Related asset */}
      {related && (
        <button
          onClick={() => onSelectRelated?.(related)}
          className="flex items-center gap-2 rounded border border-line bg-panel/60 px-3 py-2 text-left text-xs text-dim transition-colors hover:border-accent/50 hover:text-text"
        >
          <CornerUpRight size={13} className="shrink-0 text-accent" />
          <span className="min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-dim">Related · {categoryMeta(related.category).label}</span>
            <span className="block truncate text-text/90">{related.title}</span>
          </span>
        </button>
      )}
    </div>
  )
}
