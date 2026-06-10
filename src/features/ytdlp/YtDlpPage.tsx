import { useEffect, useRef, useState } from 'react'
import { Download, Music, Video, X, Plus, Trash2, AlertCircle, CheckCircle2, Loader2, Youtube } from 'lucide-react'
import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/lib/cn'

interface YtDlpPageProps {
  open: boolean
  onClose: () => void
}

type MediaType = 'video+audio' | 'audio-only' | 'video-only'
type VideoQuality = 'best' | '2160p' | '1080p' | '720p' | '480p' | '360p'
type VideoFormat = 'mp4' | 'webm' | 'mkv'
type AudioFormat = 'mp3' | 'm4a' | 'opus' | 'flac'
type JobStatus = 'queued' | 'fetching' | 'downloading' | 'done' | 'error'

interface DownloadJob {
  id: number
  url: string
  mediaType: MediaType
  videoQuality: VideoQuality
  format: VideoFormat | AudioFormat
  status: JobStatus
  progress: number
  title: string
  size: string
  speed: string
  eta: string
  addedAt: Date
}

let jobSeq = 0

const FAKE_TITLES = [
  'Lo-Fi Hip Hop Radio – Beats to Study/Relax to',
  'Kendrick Lamar – Not Like Us (Official Video)',
  'Aphex Twin – Windowlicker',
  'NTS Radio Session Vol.3 – Full Stream',
  'How to Produce Trap Beats in FL Studio 2024',
  'Tyler, The Creator – CHROMAKOPIA Full Album',
  'Burial – Untrue (Full Album)',
  'MF DOOM – Doomsday (Lyrics)',
]

const FAKE_SIZES = ['42.3 MB', '128.7 MB', '67.1 MB', '1.2 GB', '312.4 MB', '89.5 MB', '204.8 MB', '55.6 MB']

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function buildJob(
  url: string,
  mediaType: MediaType,
  videoQuality: VideoQuality,
  format: VideoFormat | AudioFormat,
): DownloadJob {
  return {
    id: jobSeq++,
    url,
    mediaType,
    videoQuality,
    format,
    status: 'queued',
    progress: 0,
    title: randomItem(FAKE_TITLES),
    size: randomItem(FAKE_SIZES),
    speed: '0 KB/s',
    eta: '—',
    addedAt: new Date(),
  }
}

const STATUS_COLOR: Record<JobStatus, string> = {
  queued: '#6b7785',
  fetching: '#f0a020',
  downloading: '#36e0c8',
  done: '#46d369',
  error: '#ff5566',
}

const STATUS_LABEL: Record<JobStatus, string> = {
  queued: 'queued',
  fetching: 'fetching info',
  downloading: 'downloading',
  done: 'complete',
  error: 'error',
}

export function YtDlpPage({ open, onClose }: YtDlpPageProps) {
  const [url, setUrl] = useState('')
  const [mediaType, setMediaType] = useState<MediaType>('video+audio')
  const [videoQuality, setVideoQuality] = useState<VideoQuality>('1080p')
  const [videoFormat, setVideoFormat] = useState<VideoFormat>('mp4')
  const [audioFormat, setAudioFormat] = useState<AudioFormat>('mp3')
  const [subs, setSubs] = useState(false)
  const [playlist, setPlaylist] = useState(false)
  const [jobs, setJobs] = useState<DownloadJob[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map())

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // cleanup all timers on unmount
  useEffect(() => {
    return () => {
      for (const t of timers.current.values()) clearInterval(t)
    }
  }, [])

  const updateJob = (id: number, patch: Partial<DownloadJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)))
  }

  const simulateJob = (job: DownloadJob) => {
    // fetching phase: 600–1200 ms
    setTimeout(() => {
      updateJob(job.id, { status: 'fetching' })
      setTimeout(() => {
        updateJob(job.id, { status: 'downloading', progress: 0 })

        const interval = setInterval(() => {
          setJobs((prev) => {
            const j = prev.find((x) => x.id === job.id)
            if (!j) { clearInterval(interval); return prev }

            const increment = Math.random() * 8 + 2
            const next = Math.min(j.progress + increment, 100)
            const speed = `${(Math.random() * 8 + 2).toFixed(1)} MB/s`
            const remaining = Math.ceil((100 - next) / (increment / 0.3))
            const eta = next >= 100 ? '0s' : `${remaining}s`

            if (next >= 100) {
              clearInterval(interval)
              timers.current.delete(job.id)
              return prev.map((x) =>
                x.id === job.id ? { ...x, status: 'done', progress: 100, speed: '—', eta: '0s' } : x,
              )
            }
            return prev.map((x) =>
              x.id === job.id ? { ...x, progress: next, speed, eta } : x,
            )
          })
        }, 300)

        timers.current.set(job.id, interval)
      }, Math.random() * 600 + 600)
    }, Math.random() * 400 + 200)
  }

  const enqueue = () => {
    const trimmed = url.trim()
    if (!trimmed) return
    const fmt = mediaType === 'audio-only' ? audioFormat : videoFormat
    const job = buildJob(trimmed, mediaType, videoQuality, fmt)
    setJobs((prev) => [job, ...prev])
    setUrl('')
    simulateJob(job)
  }

  const removeJob = (id: number) => {
    const t = timers.current.get(id)
    if (t) { clearInterval(t); timers.current.delete(id) }
    setJobs((prev) => prev.filter((j) => j.id !== id))
  }

  const clearDone = () => {
    setJobs((prev) => prev.filter((j) => j.status !== 'done' && j.status !== 'error'))
  }

  if (!open) return null

  const isAudio = mediaType === 'audio-only'
  const doneCount = jobs.filter((j) => j.status === 'done').length
  const activeCount = jobs.filter((j) => j.status === 'downloading' || j.status === 'fetching').length

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg font-mono text-text">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-line bg-panel/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <Youtube size={18} className="text-accent" />
          <h1 className="font-display text-lg uppercase tracking-wider text-text">yt-dlp</h1>
          <span
            className="flex items-center gap-1.5 border px-2 py-0.5 text-[10px] uppercase tracking-wider"
            style={{ color: '#f0a020', borderColor: '#f0a02055', backgroundColor: '#f0a02011' }}
          >
            <StatusDot color="#f0a020" size={6} /> mockup · no backend
          </span>
          {activeCount > 0 && (
            <span
              className="flex items-center gap-1.5 border px-2 py-0.5 text-[10px] uppercase tracking-wider"
              style={{ color: '#36e0c8', borderColor: '#36e0c855', backgroundColor: '#36e0c811' }}
            >
              <StatusDot color="#36e0c8" size={6} pulse /> {activeCount} active
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-dim transition-colors hover:text-text">
          <X size={18} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* Left: options panel */}
        <aside className="shrink-0 border-b border-line bg-panel/30 lg:w-[300px] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="border-b border-line px-3 py-2 text-[10px] uppercase tracking-widest text-dim">
            Download Options
          </div>
          <div className="flex flex-col gap-4 p-4">
            {/* URL */}
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-dim">URL</span>
              <div className="flex gap-1">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && enqueue()}
                  placeholder="https://youtube.com/watch?v=…"
                  className="min-w-0 flex-1 border border-line bg-bg px-2.5 py-2 text-xs text-text placeholder:text-dim focus:border-accent/60 focus:outline-none"
                />
              </div>
            </label>

            {/* Media type */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-dim">Type</span>
              <div className="flex flex-col gap-1">
                {(['video+audio', 'audio-only', 'video-only'] as MediaType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setMediaType(t)}
                    className={cn(
                      'flex items-center gap-2 border px-2.5 py-2 text-xs transition-colors',
                      mediaType === t
                        ? 'border-accent/60 bg-accent/10 text-accent'
                        : 'border-line text-dim hover:border-line-2 hover:text-text',
                    )}
                  >
                    {t === 'audio-only' ? <Music size={12} /> : <Video size={12} />}
                    {t === 'video+audio' ? 'Video + Audio' : t === 'audio-only' ? 'Audio only' : 'Video only (no sound)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality — only for video types */}
            {!isAudio && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-dim">Quality</span>
                <select
                  value={videoQuality}
                  onChange={(e) => setVideoQuality(e.target.value as VideoQuality)}
                  className="border border-line bg-bg px-2 py-2 text-xs text-text focus:border-accent/60 focus:outline-none"
                >
                  {(['best', '2160p', '1080p', '720p', '480p', '360p'] as VideoQuality[]).map((q) => (
                    <option key={q} value={q}>{q === 'best' ? 'Best available' : q}</option>
                  ))}
                </select>
              </label>
            )}

            {/* Format */}
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-dim">
                {isAudio ? 'Audio format' : 'Container'}
              </span>
              {isAudio ? (
                <select
                  value={audioFormat}
                  onChange={(e) => setAudioFormat(e.target.value as AudioFormat)}
                  className="border border-line bg-bg px-2 py-2 text-xs text-text focus:border-accent/60 focus:outline-none"
                >
                  {(['mp3', 'm4a', 'opus', 'flac'] as AudioFormat[]).map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={videoFormat}
                  onChange={(e) => setVideoFormat(e.target.value as VideoFormat)}
                  className="border border-line bg-bg px-2 py-2 text-xs text-text focus:border-accent/60 focus:outline-none"
                >
                  {(['mp4', 'webm', 'mkv'] as VideoFormat[]).map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              )}
            </label>

            {/* Extras */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-wider text-dim">Extras</span>
              <Toggle checked={subs} onChange={setSubs} label="Embed subtitles" disabled={isAudio} />
              <Toggle checked={playlist} onChange={setPlaylist} label="Download full playlist" />
            </div>

            {/* Command preview */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-dim">Command preview</span>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all border border-line bg-bg/60 p-2.5 text-[10px] leading-relaxed text-accent">
                {buildCommand({ url, mediaType, videoQuality, videoFormat, audioFormat, subs, playlist })}
              </pre>
            </div>

            {/* Enqueue button */}
            <button
              onClick={enqueue}
              disabled={!url.trim()}
              className={cn(
                'flex items-center justify-center gap-2 border py-2.5 text-xs uppercase tracking-wider transition-colors',
                url.trim()
                  ? 'border-accent/50 bg-accent/10 text-accent hover:bg-accent/20'
                  : 'cursor-not-allowed border-line text-dim opacity-50',
              )}
            >
              <Plus size={13} /> Add to queue
            </button>
          </div>
        </aside>

        {/* Right: queue */}
        <main className="flex min-w-0 flex-1 flex-col lg:min-h-0">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="text-[10px] uppercase tracking-widest text-dim">
              Download Queue · {jobs.length} job{jobs.length !== 1 ? 's' : ''}
            </span>
            {doneCount > 0 && (
              <button
                onClick={clearDone}
                className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-dim transition-colors hover:text-text"
              >
                <Trash2 size={11} /> Clear done
              </button>
            )}
          </div>

          <div className="flex-1 lg:min-h-0 lg:overflow-y-auto">
            {jobs.length === 0 ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center text-dim">
                <Download size={28} className="opacity-30" />
                <p className="text-xs">Queue is empty.</p>
                <p className="text-[10px]">Paste a URL and hit Add to queue.</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-line">
                {jobs.map((job) => (
                  <JobRow key={job.id} job={job} onRemove={() => removeJob(job.id)} />
                ))}
              </div>
            )}
          </div>

          {/* Footer stats */}
          <div className="flex flex-wrap items-center gap-4 border-t border-line bg-panel/20 px-4 py-2">
            {(['queued', 'fetching', 'downloading', 'done', 'error'] as JobStatus[]).map((s) => {
              const count = jobs.filter((j) => j.status === s).length
              if (count === 0) return null
              return (
                <span key={s} className="flex items-center gap-1.5 text-[10px]" style={{ color: STATUS_COLOR[s] }}>
                  <StatusDot color={STATUS_COLOR[s]} size={5} /> {count} {STATUS_LABEL[s]}
                </span>
              )
            })}
            {jobs.length === 0 && <span className="text-[10px] text-dim">no jobs</span>}
          </div>
        </main>
      </div>
    </div>
  )
}

/* ── Job row ────────────────────────────────────────────────────────────── */

function JobRow({ job, onRemove }: { job: DownloadJob; onRemove: () => void }) {
  const color = STATUS_COLOR[job.status]
  const isActive = job.status === 'downloading' || job.status === 'fetching'

  return (
    <div className="flex flex-col gap-2 px-4 py-3 hover:bg-panel/20">
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className="mt-0.5 shrink-0" style={{ color }}>
          {job.status === 'done' && <CheckCircle2 size={14} />}
          {job.status === 'error' && <AlertCircle size={14} />}
          {(job.status === 'fetching' || job.status === 'downloading') && (
            <Loader2 size={14} className="animate-spin" />
          )}
          {job.status === 'queued' && <Download size={14} className="opacity-50" />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-text">{job.title}</p>
          <p className="mt-0.5 truncate text-[10px] text-dim">{job.url}</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-dim">
            <span style={{ color }}>{STATUS_LABEL[job.status]}</span>
            <span>{job.mediaType === 'audio-only' ? '♪' : '▶'} {job.format.toUpperCase()}</span>
            {job.mediaType !== 'audio-only' && <span>{job.videoQuality}</span>}
            <span>{job.size}</span>
            {isActive && <span>{job.speed}</span>}
            {isActive && <span>eta {job.eta}</span>}
          </div>
        </div>

        <button
          onClick={onRemove}
          className="shrink-0 text-dim transition-colors hover:text-danger"
          title="Remove"
        >
          <X size={13} />
        </button>
      </div>

      {/* Progress bar */}
      {(isActive || job.status === 'done') && (
        <div className="ml-5 h-[3px] w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${job.progress}%`, backgroundColor: color }}
          />
        </div>
      )}
    </div>
  )
}

/* ── Toggle ─────────────────────────────────────────────────────────────── */

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 text-[11px] transition-colors',
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:text-text',
        checked && !disabled ? 'text-accent' : 'text-dim',
      )}
    >
      <span
        className={cn(
          'flex h-3.5 w-3.5 items-center justify-center border text-[9px]',
          checked && !disabled ? 'border-accent bg-accent/20 text-accent' : 'border-line',
        )}
      >
        {checked && '✓'}
      </span>
      {label}
    </button>
  )
}

/* ── Command builder ─────────────────────────────────────────────────────── */

function buildCommand({
  url,
  mediaType,
  videoQuality,
  videoFormat,
  audioFormat,
  subs,
  playlist,
}: {
  url: string
  mediaType: MediaType
  videoQuality: VideoQuality
  videoFormat: VideoFormat
  audioFormat: AudioFormat
  subs: boolean
  playlist: boolean
}): string {
  const parts = ['yt-dlp']

  if (mediaType === 'audio-only') {
    parts.push('-x', `--audio-format ${audioFormat}`)
  } else {
    const q = videoQuality === 'best' ? 'bestvideo+bestaudio' : `bestvideo[height<=${videoQuality}]+bestaudio`
    parts.push(`-f "${q}"`, `--merge-output-format ${videoFormat}`)
  }

  if (mediaType !== 'audio-only' && subs) parts.push('--embed-subs --write-auto-subs')
  if (!playlist) parts.push('--no-playlist')
  parts.push('-o "%(title)s.%(ext)s"')
  parts.push(`"${url || '<url>'}"`)

  return parts.join(' \\\n  ')
}
