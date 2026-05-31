import { useEffect, useMemo, useState } from 'react'
import { BEATS, CONTACT_EMAIL, formatPrice, type Beat, type CartItem, type LicenseTier } from '@/data/beats'
import { useBeatPlayer } from './useBeatPlayer'
import { BeatStoreNav, type StoreView } from './BeatStoreNav'
import { BeatsView } from './views/BeatsView'
import { PacksView } from './views/PacksView'
import { LicensingView } from './views/LicensingView'
import { AboutView } from './views/AboutView'
import { Cart } from './Cart'
import { Checkout } from './Checkout'
import { Check, Download, Mail } from 'lucide-react'

interface BeatStorePageProps {
  open: boolean
  onClose: () => void
}

/**
 * Immersive full-screen beat-store experience. Mounted on top of the OS shell
 * when `open` is true. Holds its own internal view router (Beats / Packs /
 * Licensing / About / Cart / Checkout / Done) and a real-audio player driving
 * the Now Playing card.
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
        {view === 'packs' && <PacksView />}
        {view === 'licensing' && <LicensingView />}
        {view === 'about' && <AboutView onBrowseBeats={() => setView('beats')} />}
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
  const total = purchased.reduce((s, i) => s + i.price, 0)

  // Build a mailto: link that drafts an order receipt in the customer's mail
  // client. There's no backend on this static site, so this is the most
  // honest way to "send a receipt" — the user actually opens their own mail
  // app with a draft prefilled.
  const receiptBody =
    `ISARK Order ${orderNo}\n\n` +
    `Thanks for your purchase — here are your files:\n\n` +
    purchased
      .map((p) => {
        const beat = BEATS.find((b) => b.id === p.beatId)
        const link = beat?.audioFile ? `${window.location.origin}${beat.audioFile}` : '(demo — no file)'
        return `• ${p.title} · ${p.tier} license · ${formatPrice(p.price)}\n  ${link}`
      })
      .join('\n\n') +
    `\n\nTotal: ${formatPrice(total)}\n\n— ISARK`

  const receiptMailto = `mailto:${encodeURIComponent(orderEmail)}?subject=${encodeURIComponent(
    `ISARK Order ${orderNo}`,
  )}&body=${encodeURIComponent(receiptBody)}`

  return (
    <div className="flex h-full flex-col items-center overflow-y-auto p-6 text-center">
      <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-isark-accent/15 text-isark-accent">
        <Check size={28} />
      </div>
      <h2 className="mt-4 font-sans text-2xl font-bold tracking-tight">Order confirmed</h2>
      <p className="mt-1 max-w-md text-sm text-isark-dim">
        Order <span className="font-mono text-isark-text">{orderNo}</span> — your files are below. Hit
        <span className="mx-1 font-semibold text-isark-text">Email me a receipt</span> to draft a copy in your mail
        client.
      </p>

      <div className="mt-5 w-full max-w-md space-y-2">
        {purchased.map((item) => {
          const beat = BEATS.find((b) => b.id === item.beatId)
          const audioUrl = beat?.audioFile
          const downloadName = `${item.title} — ISARK [${item.tier}].mp3`
          return (
            <div
              key={`${item.beatId}-${item.tier}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-isark-line bg-isark-surface px-3 py-2.5 text-left"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{item.title}</div>
                <div className="font-mono text-[11px] text-isark-dim">
                  {item.tier} license · {formatPrice(item.price)}
                </div>
              </div>
              {audioUrl ? (
                <a
                  href={audioUrl}
                  download={downloadName}
                  className="flex shrink-0 items-center gap-1.5 rounded-md border border-isark-accent/50 bg-isark-accent/10 px-2.5 py-1 text-xs text-isark-accent transition-colors hover:bg-isark-accent/20"
                >
                  <Download size={13} /> Download
                </a>
              ) : (
                <span
                  className="shrink-0 rounded-md border border-isark-line px-2.5 py-1 text-[11px] text-isark-dim"
                  title="No file uploaded for this demo beat"
                >
                  Demo · no file
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <a
          href={receiptMailto}
          className="flex items-center gap-2 rounded-lg bg-isark-accent px-4 py-2.5 text-sm font-semibold text-isark-bg shadow-[0_0_24px_rgba(167,139,250,0.45)] transition-transform hover:scale-[1.02] active:scale-95"
        >
          <Mail size={15} /> Email me a receipt
        </a>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-isark-line px-4 py-2.5 text-sm text-isark-text transition-colors hover:border-isark-accent"
        >
          Back to store
        </button>
      </div>

      <p className="mt-3 text-[11px] text-isark-dim">
        Need a different format or stems? Email <span className="text-isark-text">{CONTACT_EMAIL}</span> with your order
        number.
      </p>
    </div>
  )
}
