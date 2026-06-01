import { ArrowRight, ExternalLink } from 'lucide-react'

interface AboutViewProps {
  /** Used by the call to action to switch the store back to Beats. */
  onBrowseBeats?: () => void
}

export function AboutView({ onBrowseBeats }: AboutViewProps) {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col justify-center gap-6 p-6">
      <div className="space-y-4">
        <h1 className="font-sans text-4xl font-bold tracking-tight text-isark-text sm:text-5xl">ISΛRK</h1>
        <p className="text-base leading-relaxed text-isark-text/90 sm:text-lg">
          Producer making dark, electric beats for the next wave. Late-night sessions, no compromises.
        </p>
        <p className="text-base leading-relaxed text-isark-text/75 sm:text-lg">
          These are his beats. Preview anything, grab a license, build something.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={onBrowseBeats}
          className="inline-flex items-center gap-2 rounded-lg bg-isark-accent px-5 py-2.5 text-sm font-semibold text-isark-bg shadow-[0_0_28px_rgba(167,139,250,0.45)] transition-transform hover:scale-[1.02] active:scale-95"
        >
          Browse the catalog
          <ArrowRight size={15} />
        </button>
        <a
          href="https://soundcloud.com/itsisark"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-isark-line bg-isark-surface/70 px-4 py-2.5 text-sm text-isark-text transition-colors hover:border-isark-accent hover:text-isark-accent"
        >
          Listen on SoundCloud <ExternalLink size={13} />
        </a>
      </div>
    </div>
  )
}
