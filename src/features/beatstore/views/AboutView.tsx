import { ExternalLink } from 'lucide-react'

export function AboutView() {
  return (
    <div className="mx-auto h-full max-w-2xl space-y-5 overflow-y-auto p-6">
      <h1 className="font-sans text-3xl font-bold tracking-tight text-isark-text">About isark</h1>
      <p className="text-sm leading-relaxed text-isark-text">
        isark is a small beat shop — a handful of records a month, made carefully and shared here as soon as they're
        ready. Browse the catalog on the Beats page, preview anything, and grab a license if something fits.
      </p>
      <p className="text-sm leading-relaxed text-isark-dim">
        The full library lives on SoundCloud where most tracks are open for download as previews. The store here mirrors
        a curated selection with proper licenses attached.
      </p>
      <div className="flex flex-wrap gap-2 pt-2">
        <a
          href="https://soundcloud.com/itsisark"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-isark-line bg-isark-surface/70 px-3 py-1.5 text-sm text-isark-text transition-colors hover:border-isark-accent hover:text-isark-accent"
        >
          Listen on SoundCloud <ExternalLink size={13} />
        </a>
      </div>
    </div>
  )
}
