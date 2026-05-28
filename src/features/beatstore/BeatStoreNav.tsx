import { Disc3, FileText, Info, ShoppingBag, X } from 'lucide-react'
import { cn } from '@/lib/cn'

export type StoreView = 'beats' | 'licensing' | 'about' | 'cart' | 'checkout' | 'done'

interface BeatStoreNavProps {
  view: StoreView
  cartCount: number
  onView: (v: StoreView) => void
  onClose: () => void
}

const ITEMS: Array<{ id: StoreView; label: string; icon: typeof Disc3 }> = [
  { id: 'beats', label: 'Beats', icon: Disc3 },
  { id: 'licensing', label: 'Licensing', icon: FileText },
  { id: 'about', label: 'About', icon: Info },
]

export function BeatStoreNav({ view, cartCount, onView, onClose }: BeatStoreNavProps) {
  return (
    <header className="relative z-40 flex h-14 items-center gap-2 border-b border-isark-line/70 bg-isark-bg/55 px-4 backdrop-blur-xl">
      <div className="flex items-baseline gap-2">
        <span className="font-sans text-lg font-bold tracking-tight text-isark-text">isark</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-isark-accent">beat store</span>
      </div>

      <nav className="ml-6 flex items-center gap-1">
        {ITEMS.map((it) => {
          const Icon = it.icon
          const active = view === it.id
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onView(it.id)}
              className={cn(
                'group relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                active ? 'text-isark-text' : 'text-isark-dim hover:text-isark-text',
              )}
            >
              <Icon size={14} />
              <span>{it.label}</span>
              {active && (
                <span
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-isark-accent shadow-[0_0_10px_rgba(204,255,0,0.6)]"
                  aria-hidden
                />
              )}
            </button>
          )
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => onView('cart')}
          className={cn(
            'relative flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors',
            view === 'cart'
              ? 'border-isark-accent text-isark-text'
              : 'border-isark-line text-isark-dim hover:border-isark-accent hover:text-isark-text',
          )}
        >
          <ShoppingBag size={14} />
          {cartCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-isark-accent px-1 text-[10px] font-bold text-isark-bg">
              {cartCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close beat store"
          className="rounded-md border border-isark-line p-1.5 text-isark-dim transition-colors hover:border-isark-accent hover:text-isark-text"
        >
          <X size={16} />
        </button>
      </div>
    </header>
  )
}
