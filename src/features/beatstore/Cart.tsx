import { ArrowLeft, ShoppingBag, Trash2 } from 'lucide-react'
import { formatPrice, type CartItem } from '@/data/beats'

interface CartProps {
  items: CartItem[]
  onRemove: (index: number) => void
  onCheckout: () => void
  onBack: () => void
}

export function Cart({ items, onRemove, onCheckout, onBack }: CartProps) {
  const total = items.reduce((s, i) => s + i.price, 0)

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-5">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 flex items-center gap-1.5 text-xs uppercase tracking-wide text-isark-dim hover:text-isark-text"
        >
          <ArrowLeft size={14} /> Back to store
        </button>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-isark-dim">
            <ShoppingBag size={28} />
            <p className="text-sm">Your cart is empty.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li
                key={`${item.beatId}-${item.tier}`}
                className="flex items-center gap-3 rounded-lg border border-isark-line bg-isark-surface px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-sans text-sm font-semibold text-isark-text">{item.title}</div>
                  <div className="font-mono text-[11px] text-isark-dim">{item.tier} license</div>
                </div>
                <span className="font-mono text-sm text-isark-text">{formatPrice(item.price)}</span>
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  aria-label="Remove"
                  className="text-isark-dim transition-colors hover:text-[#FF5566]"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-isark-line p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-isark-dim">Subtotal</span>
          <span className="font-mono text-lg text-isark-text">{formatPrice(total)}</span>
        </div>
        <button
          type="button"
          disabled={items.length === 0}
          onClick={onCheckout}
          className="w-full rounded-lg bg-isark-accent py-2.5 text-sm font-semibold text-isark-bg transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-30"
        >
          Checkout
        </button>
      </div>
    </div>
  )
}
