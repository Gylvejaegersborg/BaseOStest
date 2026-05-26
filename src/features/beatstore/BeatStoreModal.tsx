import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Check, Download, Search, ShoppingBag, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { BEATS, MOODS, type CartItem, type LicenseTier } from '@/data/beats'
import { BeatRow } from './BeatRow'
import { Cart } from './Cart'
import { Checkout } from './Checkout'
import { useBeatPreview } from './useBeatPreview'

type View = 'store' | 'cart' | 'checkout' | 'done'

export function BeatStoreModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [view, setView] = useState<View>('store')
  const [query, setQuery] = useState('')
  const [mood, setMood] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [purchased, setPurchased] = useState<CartItem[]>([])
  const [orderNo, setOrderNo] = useState('')
  const [orderEmail, setOrderEmail] = useState('')
  const preview = useBeatPreview()
  const { stop } = preview

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Stop any preview when the modal closes.
  useEffect(() => {
    if (!open) stop()
  }, [open, stop])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return BEATS.filter((b) => {
      if (mood && !b.mood.includes(mood)) return false
      if (!q) return true
      return b.title.toLowerCase().includes(q) || b.mood.some((m) => m.toLowerCase().includes(q))
    })
  }, [query, mood])

  const cartTiersByBeat = useMemo(() => {
    const map = new Map<string, Set<LicenseTier>>()
    for (const item of cart) {
      const set = map.get(item.beatId) ?? new Set<LicenseTier>()
      set.add(item.tier)
      map.set(item.beatId, set)
    }
    return map
  }, [cart])

  if (!open) return null

  const addToCart = (beatId: string, title: string, tier: LicenseTier, price: number) => {
    setCart((prev) =>
      prev.some((i) => i.beatId === beatId && i.tier === tier) ? prev : [...prev, { beatId, title, tier, price }],
    )
  }

  const completeOrder = (email: string) => {
    stop()
    setPurchased(cart)
    setOrderEmail(email)
    setOrderNo(`ISK-${Math.floor(100000 + Math.random() * 900000)}`)
    setCart([])
    setView('done')
  }

  const backToStore = () => setView('store')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-isark-line bg-isark-bg text-isark-text shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-isark-line px-5 py-3.5">
          <div className="flex items-baseline gap-2">
            <span className="font-sans text-lg font-bold tracking-tight text-isark-text">isark</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-isark-accent">beat store</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {view === 'store' && (
              <button
                type="button"
                onClick={() => setView('cart')}
                className="relative flex items-center gap-1.5 rounded-md border border-isark-line px-2.5 py-1.5 text-sm text-isark-text transition-colors hover:border-isark-accent"
              >
                <ShoppingBag size={15} />
                {cart.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-isark-accent px-1 text-[10px] font-bold text-isark-bg">
                    {cart.length}
                  </span>
                )}
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close" className="text-isark-dim hover:text-isark-text">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1">
          {view === 'store' && (
            <div className="flex h-full flex-col">
              <div className="space-y-3 border-b border-isark-line p-4">
                <div className="flex items-center gap-2 rounded-lg border border-isark-line bg-isark-surface px-3 py-2">
                  <Search size={15} className="text-isark-dim" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search beats or moods…"
                    className="flex-1 bg-transparent text-sm text-isark-text placeholder:text-isark-dim focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Chip active={mood === null} onClick={() => setMood(null)}>
                    All
                  </Chip>
                  {MOODS.map((m) => (
                    <Chip key={m} active={mood === m} onClick={() => setMood(mood === m ? null : m)}>
                      {m}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
                {filtered.length === 0 ? (
                  <p className="py-12 text-center text-sm text-isark-dim">No beats match that.</p>
                ) : (
                  filtered.map((beat) => (
                    <BeatRow
                      key={beat.id}
                      beat={beat}
                      playing={preview.playingId === beat.id}
                      cartTiers={cartTiersByBeat.get(beat.id) ?? new Set()}
                      onTogglePlay={() => preview.toggle(beat.id, beat.bpm)}
                      onAdd={(tier, price) => addToCart(beat.id, beat.title, tier, price)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {view === 'cart' && (
            <Cart
              items={cart}
              onRemove={(i) => setCart((prev) => prev.filter((_, idx) => idx !== i))}
              onCheckout={() => setView('checkout')}
              onBack={backToStore}
            />
          )}

          {view === 'checkout' && (
            <Checkout items={cart} onComplete={completeOrder} onBack={() => setView('cart')} />
          )}

          {view === 'done' && (
            <div className="flex h-full flex-col items-center overflow-y-auto p-6 text-center">
              <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-isark-accent/15 text-isark-accent">
                <Check size={28} />
              </div>
              <h2 className="mt-4 font-sans text-2xl font-bold tracking-tight">Order confirmed</h2>
              <p className="mt-1 text-sm text-isark-dim">
                Order <span className="font-mono text-isark-text">{orderNo}</span> · files sent to{' '}
                <span className="text-isark-text">{orderEmail}</span>
              </p>
              <div className="mt-5 w-full max-w-sm space-y-2">
                {purchased.map((item) => (
                  <div
                    key={`${item.beatId}-${item.tier}`}
                    className="flex items-center justify-between rounded-lg border border-isark-line bg-isark-surface px-3 py-2.5 text-left"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{item.title}</div>
                      <div className="font-mono text-[11px] text-isark-dim">{item.tier} license</div>
                    </div>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-md border border-isark-accent/40 bg-isark-accent/10 px-2.5 py-1 text-xs text-isark-accent"
                    >
                      <Download size={13} /> Download
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={backToStore}
                className="mt-6 rounded-lg border border-isark-line px-4 py-2 text-sm text-isark-text transition-colors hover:border-isark-accent"
              >
                Back to store
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs transition-colors',
        active
          ? 'border-isark-accent bg-isark-accent text-isark-bg'
          : 'border-isark-line text-isark-dim hover:border-isark-accent hover:text-isark-text',
      )}
    >
      {children}
    </button>
  )
}
