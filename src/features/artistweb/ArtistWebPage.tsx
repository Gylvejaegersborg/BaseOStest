import { useEffect, useMemo } from 'react'
import { ArrowRight, Cloud, Instagram, Mail, Pause, Play, X, Youtube } from 'lucide-react'
import { BEATS, CONTACT_EMAIL, formatPlays, type Beat } from '@/data/beats'
import { useBeatPlayer } from '../beatstore/useBeatPlayer'
import { useOsOverlay, mergeById } from '@/features/team/osOverlay'
import { cn } from '@/lib/cn'

interface ArtistWebPageProps {
  open: boolean
  onClose: () => void
  /** Closes this page and opens the Beat Store (the purchase-focused UI). */
  onGetBeats: () => void
}

const LINKS = [
  { label: 'SoundCloud', href: 'https://soundcloud.com/itsisark', icon: Cloud, glow: '#36e0c8' },
  { label: 'Instagram', href: 'https://instagram.com/', icon: Instagram, glow: '#e0408a' },
  { label: 'YouTube', href: 'https://youtube.com/', icon: Youtube, glow: '#ff5566' },
  { label: 'Email', href: `mailto:${CONTACT_EMAIL}`, icon: Mail, glow: '#f0a020' },
] as const

/**
 * The public face of ISΛRK — hero, releases grid, bio and link hub. Mounted as
 * a full-screen overlay on top of the OS shell when `open` is true (same modal
 * pattern as the Beat Store). Clicking a release previews it through the shared
 * Web-Audio player; the "Get Beats" CTA hands off to the purchase-focused store.
 */
export function ArtistWebPage({ open, onClose, onGetBeats }: ArtistWebPageProps) {
  const overlay = useOsOverlay()
  const allBeats = useMemo(() => mergeById(BEATS, overlay.beats), [overlay.beats])
  const player = useBeatPlayer(allBeats)

  // Pause audio when the page is closed.
  useEffect(() => {
    if (!open) player.pause()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Esc closes the page.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // A scattered, stable particle field for the hero backdrop.
  const particles = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: `${(i * 53) % 100}%`,
        top: `${(i * 29 + 7) % 100}%`,
        size: 1 + ((i * 7) % 3),
        delay: `${(i % 9) * 0.4}s`,
        duration: `${2.6 + (i % 5) * 0.7}s`,
      })),
    [],
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-bg text-text">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/80 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg tracking-[0.2em] text-text">ISΛRK</span>
          <span className="hidden text-[10px] uppercase tracking-[0.25em] text-dim sm:inline">/ artist</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close artist page"
          className="flex items-center gap-1.5 border border-line px-2.5 py-1.5 text-[11px] uppercase tracking-wider text-dim transition-colors hover:border-accent/60 hover:text-accent"
        >
          Close <X size={13} />
        </button>
      </header>

      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative flex min-h-[62vh] items-center justify-center overflow-hidden px-4 py-20">
        {/* Animated gradient wash */}
        <div
          className="pointer-events-none absolute inset-0 animate-gradient-pan opacity-70"
          style={{
            background:
              'linear-gradient(115deg, #0a0c10 0%, rgba(54,224,200,0.18) 28%, #0a0c10 50%, rgba(224,64,138,0.20) 74%, #0a0c10 100%)',
            backgroundSize: '300% 300%',
          }}
        />
        {/* Glow blobs */}
        <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-accent/20 blur-[90px]" />
        <div className="pointer-events-none absolute -right-20 bottom-1/4 h-72 w-72 rounded-full bg-magenta/20 blur-[90px]" />
        {/* Dotted grid */}
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" />
        {/* Particle field */}
        <div className="pointer-events-none absolute inset-0">
          {particles.map((p, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-accent animate-twinkle"
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                animationDelay: p.delay,
                animationDuration: p.duration,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <h1 className="font-display text-6xl tracking-[0.18em] text-text drop-shadow-[0_0_30px_rgba(54,224,200,0.35)] sm:text-8xl">
            ISΛRK
          </h1>
          <p className="mt-4 font-display text-sm uppercase tracking-[0.45em] text-accent sm:text-base">
            producer · beatmaker
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onGetBeats}
              className="group flex items-center gap-2 bg-accent px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-bg shadow-[0_0_28px_rgba(54,224,200,0.45)] transition-transform hover:scale-[1.03] active:scale-95"
            >
              Get Beats <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </button>
            <a
              href="#releases"
              className="border border-line px-5 py-2.5 text-xs uppercase tracking-wider text-text transition-colors hover:border-accent/60 hover:text-accent"
            >
              Listen
            </a>
          </div>
        </div>
      </section>

      {/* ─────────────────────── Releases ─────────────────────── */}
      <section id="releases" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <SectionHeading label="Releases" count={allBeats.length} />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allBeats.map((beat) => (
            <ReleaseCard
              key={beat.id}
              beat={beat}
              playing={player.playing && player.current?.id === beat.id}
              onToggle={() => player.toggle(beat)}
            />
          ))}
        </div>
      </section>

      {/* ───────────────────────── Bio ────────────────────────── */}
      <section className="border-y border-line bg-panel/30">
        <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
          <SectionHeading label="Bio" />
          <p className="mt-6 text-sm leading-relaxed text-text/85 sm:text-base">
            ISΛRK builds beats in the dark — low-end that sits in your chest, hats that flicker like a dying
            streetlight, and melodies pulled from somewhere between a dream and a glitch. Rooted in trap and drill
            but allergic to the template, the sound leans nocturnal: smoke, neon and concrete. Every loop starts
            from a feeling and gets sculpted until it bites.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-dim">
            Self-taught, homeserver-hosted, perpetually shipping. If it knocks at 3am, it makes the cut.
          </p>
        </div>
      </section>

      {/* ───────────────────────── Links ──────────────────────── */}
      <section className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
        <SectionHeading label="Connect" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {LINKS.map((l) => {
            const Icon = l.icon
            return (
              <a
                key={l.label}
                href={l.href}
                target={l.href.startsWith('http') ? '_blank' : undefined}
                rel={l.href.startsWith('http') ? 'noreferrer' : undefined}
                className="group flex flex-col items-center gap-2 border border-line bg-panel/40 py-5 text-dim transition-all hover:-translate-y-0.5 hover:text-text"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${l.glow}88`
                  e.currentTarget.style.boxShadow = `0 0 22px -4px ${l.glow}aa`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = ''
                  e.currentTarget.style.boxShadow = ''
                }}
              >
                <Icon size={22} className="transition-colors group-hover:text-[color:var(--glow)]" style={{ ['--glow' as string]: l.glow }} />
                <span className="text-[11px] uppercase tracking-wider">{l.label}</span>
              </a>
            )
          })}
        </div>
      </section>

      {/* ─────────────────────── Get Beats CTA ─────────────────── */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="relative mx-auto w-full max-w-4xl overflow-hidden border border-line bg-panel/40 px-6 py-12 text-center">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-accent/10 via-transparent to-magenta/10" />
          <div className="relative z-10">
            <h2 className="font-display text-2xl tracking-wider text-text sm:text-3xl">Want these in your project?</h2>
            <p className="mt-2 text-sm text-dim">License any beat — MP3, WAV, stems or exclusive.</p>
            <button
              type="button"
              onClick={onGetBeats}
              className="group mt-6 inline-flex items-center gap-2 bg-accent px-6 py-3 text-xs font-semibold uppercase tracking-wider text-bg shadow-[0_0_28px_rgba(54,224,200,0.45)] transition-transform hover:scale-[1.03] active:scale-95"
            >
              Get Beats <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
        <p className="mt-8 text-center text-[11px] uppercase tracking-[0.25em] text-dim">
          ISΛRK © {new Date().getFullYear()}
        </p>
      </section>
    </div>
  )
}

function SectionHeading({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-line sm:max-w-[40px]" />
      <h2 className="font-display text-sm uppercase tracking-[0.3em] text-accent">{label}</h2>
      {count !== undefined && <span className="font-mono text-[11px] text-dim">[{count}]</span>}
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

function ReleaseCard({
  beat,
  playing,
  onToggle,
}: {
  beat: Beat
  playing: boolean
  onToggle: () => void
}) {
  const hasAudio = Boolean(beat.audioFile)
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'group relative flex flex-col overflow-hidden border bg-panel/60 text-left transition-all hover:-translate-y-0.5',
        playing ? 'border-accent/70 shadow-glow' : 'border-line hover:border-line-2',
      )}
    >
      {/* Cover */}
      <div
        className="relative flex aspect-square w-full items-center justify-center"
        style={{ background: `linear-gradient(140deg, ${beat.gradient[0]}, ${beat.gradient[1]})` }}
      >
        {/* Play / pause / EQ overlay */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity',
            playing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bg/80 text-accent backdrop-blur-sm">
            {playing ? <Pause size={20} /> : <Play size={20} className="translate-x-0.5" />}
          </span>
        </div>
        {/* Animated equalizer while playing */}
        {playing && (
          <div className="absolute bottom-2 left-2 flex items-end gap-0.5">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="w-1 rounded-sm bg-accent animate-wave-pulse"
                style={{ height: 6 + i * 3, animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
        )}
        {!hasAudio && (
          <span className="absolute right-2 top-2 border border-white/20 bg-black/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/70">
            Preview
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate font-display text-base text-text transition-colors group-hover:text-accent">
            {beat.title}
          </h3>
          <span className="shrink-0 font-mono text-[11px] text-dim">{beat.bpm} BPM</span>
        </div>
        <p className="truncate text-[11px] text-dim">
          {beat.artist} · {beat.musicalKey} · {formatPlays(beat.plays)} plays
        </p>
        <div className="flex flex-wrap gap-1">
          {beat.mood.map((m) => (
            <span
              key={m}
              className="border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-dim"
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}
