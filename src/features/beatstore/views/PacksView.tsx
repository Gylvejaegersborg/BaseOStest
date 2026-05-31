import { useMemo, useState } from 'react'
import { ArrowRight, Package, Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PACK_CATEGORIES, PACKS, type Pack, type PackCategory, formatPackPrice } from '@/data/packs'
import { PackDetailModal } from '../PackDetailModal'

/**
 * Packs view — non-beat product categories (drum kits, melodies, beat packs).
 * Has a search bar + category chips like the beats menu. By default each
 * category renders as its own section with a "View all" link that filters
 * the page down to just that category.
 */
export function PacksView() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<PackCategory | null>(null)
  const [selected, setSelected] = useState<Pack | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return PACKS.filter((p) => {
      if (activeCategory && p.category !== activeCategory) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.format.toLowerCase().includes(q) ||
        (PACK_CATEGORIES.find((c) => c.id === p.category)?.label.toLowerCase().includes(q) ?? false)
      )
    })
  }, [query, activeCategory])

  return (
    <div className="mx-auto h-full max-w-5xl space-y-6 overflow-y-auto p-4 sm:p-6">
      <header>
        <h1 className="font-sans text-3xl font-bold tracking-tight text-isark-text">Packs</h1>
        <p className="mt-2 max-w-prose text-sm text-isark-dim">
          Drum kits, melody loops and beat packs — sound libraries and curated bundles ready to drag into your sessions.
        </p>
      </header>

      {/* Search + category chips */}
      <div className="space-y-3 rounded-2xl border border-isark-line bg-isark-surface/60 p-3 backdrop-blur-md">
        <div className="flex items-center gap-2 rounded-lg border border-isark-line/80 bg-isark-bg/40 px-3 py-2">
          <Search size={14} className="text-isark-dim" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search packs, formats or descriptions…"
            className="flex-1 bg-transparent text-sm text-isark-text placeholder:text-isark-dim focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="text-isark-dim hover:text-isark-text"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={activeCategory === null} onClick={() => setActiveCategory(null)}>
            All
          </Chip>
          {PACK_CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              active={activeCategory === c.id}
              onClick={() => setActiveCategory(activeCategory === c.id ? null : c.id)}
            >
              {c.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Sections (default) vs. flat filtered grid (when a category or search is active) */}
      {activeCategory || query ? (
        <FlatGrid items={filtered} onOpen={setSelected} />
      ) : (
        PACK_CATEGORIES.map((cat) => {
          const items = PACKS.filter((p) => p.category === cat.id)
          if (items.length === 0) return null
          return (
            <CategorySection
              key={cat.id}
              label={cat.label}
              blurb={cat.blurb}
              count={items.length}
              items={items}
              onViewAll={() => setActiveCategory(cat.id)}
              onOpen={setSelected}
            />
          )
        })
      )}

      {selected && <PackDetailModal pack={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function CategorySection({
  label,
  blurb,
  count,
  items,
  onViewAll,
  onOpen,
}: {
  label: string
  blurb: string
  count: number
  items: Pack[]
  onViewAll: () => void
  onOpen: (pack: Pack) => void
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-sans text-xl font-semibold text-isark-text">{label}</h2>
          <p className="text-sm text-isark-dim">{blurb}</p>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-isark-line bg-isark-elevated/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-isark-dim transition-colors hover:border-isark-accent hover:text-isark-text"
        >
          View all
          <span className="rounded-full bg-isark-accent/20 px-1.5 py-0.5 text-isark-accent">{count}</span>
          <ArrowRight size={11} />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <PackCard key={p.id} pack={p} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}

function FlatGrid({ items, onOpen }: { items: Pack[]; onOpen: (pack: Pack) => void }) {
  if (items.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-isark-dim">No packs match that.</p>
    )
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <PackCard key={p.id} pack={p} onOpen={onOpen} />
      ))}
    </div>
  )
}

function PackCard({ pack, onOpen }: { pack: Pack; onOpen: (pack: Pack) => void }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-isark-line bg-isark-surface/70 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => onOpen(pack)}
        aria-label={`View ${pack.name}`}
        className="relative flex aspect-[5/3] items-end p-4 text-left transition-transform hover:scale-[1.01]"
        style={{ background: `linear-gradient(135deg, ${pack.gradient[0]}, ${pack.gradient[1]})` }}
      >
        <Package size={18} className="absolute right-3 top-3 text-white/70" />
        <div>
          <div className="font-sans text-lg font-bold leading-tight text-white drop-shadow">{pack.name}</div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/80">{pack.format}</div>
        </div>
      </button>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="line-clamp-2 text-sm text-isark-text/85">{pack.description}</p>
        <div className="mt-auto flex items-center justify-between">
          <span className="font-sans text-base font-semibold text-isark-text">{formatPackPrice(pack.price)}</span>
          <button
            type="button"
            onClick={() => onOpen(pack)}
            className="rounded-lg border border-isark-line bg-isark-elevated/60 px-3 py-1.5 text-[11px] uppercase tracking-wider text-isark-dim transition-colors hover:border-isark-accent hover:text-isark-text"
          >
            View pack
          </button>
        </div>
      </div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs transition-colors',
        active
          ? 'border-isark-accent bg-isark-accent text-isark-bg'
          : 'border-isark-line/80 text-isark-dim hover:border-isark-accent hover:text-isark-text',
      )}
    >
      {children}
    </button>
  )
}

export type { Pack, PackCategory }
