import { useEffect, useMemo, useState } from 'react'
import { BEATS, type Beat, type CartItem, type LicenseTier } from '@/data/beats'
import { useBeatPlayer } from './useBeatPlayer'
import { BeatStoreNav, type StoreView } from './BeatStoreNav'
import { BeatsView } from './views/BeatsView'
import { LicensingView } from './views/LicensingView'
import { AboutView } from './views/AboutView'
import { Cart } from './Cart'
import { Checkout } from './Checkout'
import { Check, Download } from 'lucide-react'

interface BeatStorePageProps {
  open: boolean
  onClose: () => void
}

/**
 * Immersive full-screen beat-store experience. Mounted on top of the OS shell
 * when `open` is true. Holds its own internal view router (Beats / Licensing /
 * About / Cart / Checkout / Done) and a real-audio player driving the 3D CD.
 */
export function BeatStorePage({ open, onClose }: BeatStorePageProps) {
  const [view, setView] = useState<StoreView>('beats')
  const [cart, setCart] = useState<CartItem[]>([])
  const [purchased, setPurchased] = useState<CartItem[]>([])
  const [orderNo, setOrderNo] = useState('')
  const [orderEmail, setOrderEmail] = useState('')
  const player = useBeatPlayer(BEATS)

  // Reset to Beats on open; pause + reset state on close.
  useEffect(() => {
    if (open) {
      setView('beats')
    } else {
      player.pause()
    }
    // The player handles its own teardown on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Esc closes the page.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const cartTiersByBeat = useMemo(() => {
    const map = new Map<string, Set<LicenseTier>>()
    for (const item of cart) {
      const set = map.get(item.beatId) ?? new Set<LicenseTier>()
      set.add(item.tier)
      map.set(item.beatId, set)
    }
    return map
  }, [cart])
  const cartTiersFor = (beatId: string) => cartTiersByBeat.get(beatId) ?? new Set<LicenseTier>()

  const addToCart = (beat: Beat, tier: LicenseTier, price: number) => {
    setCart((prev) =>
      prev.some((i) => i.beatId === beat.id && i.tier === tier)
        ? prev
        : [...prev, { beatId: beat.id, title: beat.title, tier, price }],
    )
  }

  const completeOrder = (email: string) => {
    player.pause()
    setPurchased(cart)
    setOrderEmail(email)
    setOrderNo(`ISK-${Math.floor(100000 + Math.random() * 900000)}`)
    setCart([])
    setView('done')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-isark-bg text-isark-text">
      <BeatStoreNav view={view} cartCount={cart.length} onView={setView} onClose={onClose} />

      <main className="relative min-h-0 flex-1">
        {view === 'beats' && (
          <BeatsView player={player} cartTiersFor={cartTiersFor} onAddToCart={addToCart} />
        )}
        {view === 'licensing' && <LicensingView />}
        {view === 'about' && <AboutView />}
        {view === 'cart' && (
          <Cart
            items={cart}
            onRemove={(i) => setCart((prev) => prev.filter((_, idx) => idx !== i))}
            onCheckout={() => setView('checkout')}
            onBack={() => setView('beats')}
          />
        )}
        {view === 'checkout' && (
          <Checkout items={cart} onComplete={completeOrder} onBack={() => setView('cart')} />
        )}
        {view === 'done' && (
          <DoneView
            purchased={purchased}
            orderNo={orderNo}
            orderEmail={orderEmail}
            onBack={() => setView('beats')}
          />
        )}
      </main>
    </div>
  )
}

function DoneView({
  purchased,
  orderNo,
  orderEmail,
  onBack,
}: {
  purchased: CartItem[]
  orderNo: string
  orderEmail: string
  onBack: () => void
}) {
  return (
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
        onClick={onBack}
        className="mt-6 rounded-lg border border-isark-line px-4 py-2 text-sm text-isark-text transition-colors hover:border-isark-accent"
      >
        Back to store
      </button>
    </div>
  )
}
