import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Play, Pause, ExternalLink, FileArchive, Download, ImageOff, Film } from 'lucide-react'
import { fileKindOf, toBeat, type Asset } from '@/data/library'
import { formatDuration } from '@/data/beats'
import type { BeatPlayer } from '@/features/beatstore/useBeatPlayer'
import { categoryMeta } from './categories'

interface FilePreviewProps {
  asset: Asset
  player: BeatPlayer
}

/** Renders the right-hand preview based on the asset's file kind. */
export function FilePreview({ asset, player }: FilePreviewProps) {
  switch (fileKindOf(asset)) {
    case 'audio':
      return <AudioPreview asset={asset} player={player} />
    case 'image':
      return <ImagePreview asset={asset} />
    case 'video':
      return <VideoPreview asset={asset} />
    case 'text':
      return <TextPreview asset={asset} />
    case 'archive':
      return <ArchivePreview asset={asset} />
  }
}

// ── Audio ───────────────────────────────────────────────────────────────────
function AudioPreview({ asset, player }: FilePreviewProps) {
  const accent = categoryMeta(asset.category).accent
  const isCurrent = player.current?.id === asset.id
  const playing = isCurrent && player.playing
  const progress = isCurrent ? player.progress : 0
  const elapsed = isCurrent ? player.currentTime : 0
  const total = asset.durationSec ?? player.duration

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative grid aspect-video w-full place-items-center overflow-hidden rounded"
        style={{ background: `linear-gradient(135deg, ${asset.gradient[0]}, ${asset.gradient[1]})` }}
      >
        {asset.coverImage ? (
          <img src={asset.coverImage} alt={asset.title} className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-lg tracking-widest text-white/80">{asset.title.toUpperCase()}</span>
        )}
        <button
          onClick={() => player.toggle(toBeat(asset))}
          aria-label={playing ? 'Pause' : 'Play'}
          className="absolute grid h-14 w-14 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-transform hover:scale-105"
        >
          {playing ? <Pause size={24} /> : <Play size={24} className="translate-x-0.5" />}
        </button>
      </div>

      <Waveform
        seed={asset.id}
        progress={progress}
        accent={accent}
        onSeek={(p) => {
          if (!isCurrent) player.play(toBeat(asset))
          player.seek(p)
        }}
      />
      <div className="flex justify-between font-mono text-[10px] tabular-nums text-dim">
        <span>{formatDuration(Math.floor(elapsed))}</span>
        <span>{formatDuration(Math.floor(total))}</span>
      </div>

      {asset.soundcloudUrl && (
        <a
          href={asset.soundcloudUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 border border-line py-2 text-[11px] uppercase tracking-wider text-accent transition-colors hover:border-accent/60"
        >
          Open in SoundCloud <ExternalLink size={12} />
        </a>
      )}
    </div>
  )
}

/** Deterministic static waveform with a progress overlay; click to seek. */
function Waveform({
  seed,
  progress,
  accent,
  onSeek,
}: {
  seed: string
  progress: number
  accent: string
  onSeek: (p: number) => void
}) {
  const bars = useMemo(() => {
    let h = 0
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    return Array.from({ length: 72 }, () => {
      h = (h * 1103515245 + 12345) >>> 0
      return 0.18 + ((h >>> 8) % 1000) / 1000 * 0.82
    })
  }, [seed])

  return (
    <div
      className="flex h-16 cursor-pointer items-center gap-[2px]"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)))
      }}
    >
      {bars.map((v, i) => {
        const played = i / bars.length <= progress
        return (
          <span
            key={i}
            className="flex-1 rounded-full transition-colors"
            style={{
              height: `${Math.round(v * 100)}%`,
              backgroundColor: played ? accent : '#2a3442',
            }}
          />
        )
      })}
    </div>
  )
}

// ── Image ───────────────────────────────────────────────────────────────────
function ImagePreview({ asset }: { asset: Asset }) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="grid aspect-square w-full place-items-center overflow-hidden rounded border border-line"
        style={{ background: `linear-gradient(135deg, ${asset.gradient[0]}, ${asset.gradient[1]})` }}
      >
        {asset.coverImage ? (
          <img src={asset.coverImage} alt={asset.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-center text-white/80">
            <ImageOff size={22} className="opacity-70" />
            <span className="font-display text-sm tracking-widest">{asset.title.toUpperCase()}</span>
            <span className="text-[10px] uppercase tracking-wider text-white/60">
              {asset.fileType} · placeholder art
            </span>
          </div>
        )}
      </div>
      <DownloadButton asset={asset} />
    </div>
  )
}

// ── Video ───────────────────────────────────────────────────────────────────
function VideoPreview({ asset }: { asset: Asset }) {
  if (asset.videoFile) {
    return (
      <video
        src={asset.videoFile}
        controls
        poster={asset.coverImage}
        className="w-full rounded border border-line bg-black"
      />
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative grid aspect-video w-full place-items-center overflow-hidden rounded border border-line"
        style={{ background: `linear-gradient(135deg, ${asset.gradient[0]}, ${asset.gradient[1]})` }}
      >
        <div className="grid h-14 w-14 place-items-center rounded-full bg-black/55 text-white">
          <Film size={22} />
        </div>
        <span className="absolute bottom-2 left-2 text-[10px] uppercase tracking-wider text-white/70">
          {asset.fileType} · external
        </span>
      </div>
      {asset.videoUrl && (
        <a
          href={asset.videoUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 border border-line py-2 text-[11px] uppercase tracking-wider text-accent transition-colors hover:border-accent/60"
        >
          Watch <ExternalLink size={12} />
        </a>
      )}
    </div>
  )
}

// ── Text (lyrics / notes) ───────────────────────────────────────────────────
function TextPreview({ asset }: { asset: Asset }) {
  return (
    <div className="rounded border border-line bg-bg/40 p-4">
      <article className="prose-term">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{asset.body ?? '_Empty file._'}</ReactMarkdown>
      </article>
    </div>
  )
}

// ── Archive (stems / trackouts) ─────────────────────────────────────────────
function ArchivePreview({ asset }: { asset: Asset }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded border border-line bg-bg/40 p-4">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded"
          style={{ background: `linear-gradient(135deg, ${asset.gradient[0]}, ${asset.gradient[1]})` }}
        >
          <FileArchive size={22} className="text-white/90" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm text-text">{asset.id}.{asset.fileType}</div>
          <div className="text-[11px] text-dim">{asset.fileSize ?? 'archive'} · compressed</div>
        </div>
      </div>
      <DownloadButton asset={asset} />
    </div>
  )
}

function DownloadButton({ asset }: { asset: Asset }) {
  return (
    <button
      type="button"
      className="flex items-center justify-center gap-2 border border-line py-2 text-[11px] uppercase tracking-wider text-accent transition-colors hover:border-accent/60"
      onClick={() => {
        // Files aren't hosted yet; this is the hook for the future download endpoint.
      }}
    >
      Download {asset.fileType} <Download size={12} />
    </button>
  )
}
