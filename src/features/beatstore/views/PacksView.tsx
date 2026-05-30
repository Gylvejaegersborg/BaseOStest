import { Package } from 'lucide-react'
import { PACK_CATEGORIES, PACKS, type Pack, type PackCategory, formatPackPrice } from '@/data/packs'

/**
 * Packs view — one nav-level home for non-beat product categories
 * (drum kits, melodies, beat packs). Items are grouped by category with a
 * short blurb at the top of each section.
 */
export function PacksView() {
  return (
    <div className="mx-auto h-full max-w-5xl space-y-8 overflow-y-auto p-4 sm:p-6">
      <header>
        <h1 className="font-sans text-3xl font-bold tracking-tight text-isark-text">Packs</h1>
        <p className="mt-2 max-w-prose text-sm text-isark-dim">
          Drum kits, melody loops and beat packs — sound libraries and curated bundles to plug straight into your
          sessions. Browse a category to see what's in stock.
        </p>
      </header>

      {PACK_CATEGORIES.map((cat) => {
        const items = PACKS.filter((p) => p.category === cat.id)
        if (items.length === 0) return null
        return (
          <section key={cat.id} className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="font-sans text-xl font-semibold text-isark-text">{cat.label}</h2>
                <p className="text-sm text-isark-dim">{cat.blurb}</p>
              </div>
              <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-isark-dim">
                {items.length} packs
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <PackCard key={p.id} pack={p} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function PackCard({ pack }: { pack: Pack }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-isark-line bg-isark-surface/70 backdrop-blur-sm">
      <div
        className="relative flex aspect-[5/3] items-end p-4"
        style={{ background: `linear-gradient(135deg, ${pack.gradient[0]}, ${pack.gradient[1]})` }}
      >
        <Package size={18} className="absolute right-3 top-3 text-white/70" />
        <div>
          <div className="font-sans text-lg font-bold leading-tight text-white drop-shadow">{pack.name}</div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/80">{pack.format}</div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="text-sm text-isark-text/85">{pack.description}</p>
        <div className="mt-auto flex items-center justify-between">
          <span className="font-sans text-base font-semibold text-isark-text">{formatPackPrice(pack.price)}</span>
          <button
            type="button"
            className="rounded-lg border border-isark-line bg-isark-elevated/60 px-3 py-1.5 text-[11px] uppercase tracking-wider text-isark-dim transition-colors hover:border-isark-accent hover:text-isark-text"
            // Cart wiring lives on the beats view for now — packs are catalog-only.
            onClick={() => undefined}
          >
            View pack
          </button>
        </div>
      </div>
    </div>
  )
}

export type { Pack, PackCategory }
