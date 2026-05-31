import { useEffect } from 'react'
import { Package, ShoppingBag, X } from 'lucide-react'
import { type Pack, formatPackPrice, PACK_CATEGORIES } from '@/data/packs'

interface PackDetailModalProps {
  pack: Pack
  onClose: () => void
  onAddToCart?: (pack: Pack) => void
}

/**
 * Big detail pop-up for a pack. Opens from the "View pack" buttons in the
 * Packs view and on the modal-style overlay. Closes on Esc or backdrop click.
 */
export function PackDetailModal({ pack, onClose, onAddToCart }: PackDetailModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const categoryLabel = PACK_CATEGORIES.find((c) => c.id === pack.category)?.label ?? pack.category

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={pack.name}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-isark-line bg-isark-surface text-isark-text shadow-[0_30px_100px_-10px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover */}
        <div
          className="relative flex aspect-[5/2] items-end p-6"
          style={{ background: `linear-gradient(135deg, ${pack.gradient[0]}, ${pack.gradient[1]})` }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-md border border-white/20 bg-black/30 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
          >
            <X size={16} />
          </button>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/85 backdrop-blur-sm">
              <Package size={11} />
              {categoryLabel}
            </div>
            <h2 className="mt-2 font-sans text-3xl font-bold leading-tight text-white drop-shadow sm:text-4xl">
              {pack.name}
            </h2>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-white/85">{pack.format}</p>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto p-5 sm:p-6">
          <p className="text-sm leading-relaxed text-isark-text/90">{pack.description}</p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Items" value={String(pack.itemCount)} />
            {pack.bpmRange && <Stat label="Tempo" value={pack.bpmRange} />}
            <Stat label="Price" value={formatPackPrice(pack.price)} highlight />
          </div>

          {pack.highlights.length > 0 && (
            <div>
              <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-isark-dim">What's inside</h3>
              <ul className="space-y-1.5 text-sm text-isark-text/90">
                {pack.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-isark-accent" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-isark-line bg-isark-bg/40 p-4 sm:p-5">
          <div>
            <div className="font-sans text-2xl font-semibold text-isark-text">{formatPackPrice(pack.price)}</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-isark-dim">One-time purchase</div>
          </div>
          <button
            type="button"
            onClick={() => onAddToCart?.(pack)}
            className="flex items-center gap-2 rounded-lg bg-isark-accent px-4 py-2.5 text-sm font-semibold text-isark-bg shadow-[0_0_24px_rgba(167,139,250,0.45)] transition-transform hover:scale-[1.02] active:scale-95"
          >
            <ShoppingBag size={16} />
            Add to cart
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-isark-line bg-isark-elevated/40 px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-wider text-isark-dim">{label}</div>
      <div className={`mt-0.5 font-sans text-base font-semibold ${highlight ? 'text-isark-accent' : 'text-isark-text'}`}>
        {value}
      </div>
    </div>
  )
}
