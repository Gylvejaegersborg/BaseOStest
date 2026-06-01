import { useEffect } from 'react'
import { Check, Mail, ShoppingBag, X } from 'lucide-react'
import { CONTACT_EMAIL, formatPrice, type Beat, type License } from '@/data/beats'

interface LicenseDetailModalProps {
  beat: Beat
  license: License
  inCart: boolean
  onAddToCart: (beat: Beat, license: License) => void
  onClose: () => void
}

/**
 * Big detail pop-up for a single license tier. Opens from the license buttons
 * in the Transport on the Now Playing card. Negotiable tiers (Exclusive)
 * surface a mailto contact CTA instead of an add-to-cart button.
 */
export function LicenseDetailModal({ beat, license, inCart, onAddToCart, onClose }: LicenseDetailModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const negotiable = license.price === 'negotiable'
  const subject = `Exclusive enquiry — ${beat.title} (Prod. ISARK)`
  const body = `Hi ISARK,\n\nI'm interested in an exclusive license for "${beat.title}".\n\nLet me know your terms.\n\nThanks!`
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${license.tier} license — ${beat.title}`}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-isark-line bg-isark-surface text-isark-text shadow-[0_30px_100px_-10px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header band — gradient from the beat, license tier + price big */}
        <div
          className="relative flex items-end p-5 sm:p-6"
          style={{ background: `linear-gradient(135deg, ${beat.gradient[0]}, ${beat.gradient[1]})` }}
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
            <div className="inline-flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-white/85 backdrop-blur-sm">
              {license.tier} license
            </div>
            <h2 className="mt-2 font-sans text-3xl font-bold leading-tight text-white drop-shadow sm:text-4xl">
              {beat.title}
            </h2>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-white/85">
              {beat.bpm} BPM · {beat.musicalKey} · {beat.artist}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto p-5 sm:p-6">
          <p className="text-sm leading-relaxed text-isark-text/90">{license.details}</p>

          {license.highlights.length > 0 && (
            <div>
              <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-isark-dim">What's included</h3>
              <ul className="space-y-1.5 text-sm text-isark-text/90">
                {license.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2">
                    <Check size={14} className="mt-0.5 shrink-0 text-isark-accent" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {negotiable && (
            <div className="rounded-lg border border-isark-accent/40 bg-isark-accent/10 p-3 text-[12px] text-isark-text/90">
              Exclusive pricing depends on the beat's history and where you plan to release it. Hit the contact button
              and we'll talk numbers.
            </div>
          )}
        </div>

        {/* Footer — price + primary action */}
        <div className="flex items-center justify-between gap-3 border-t border-isark-line bg-isark-bg/40 p-4 sm:p-5">
          <div>
            <div className="font-sans text-2xl font-semibold text-isark-text">{formatPrice(license.price)}</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-isark-dim">
              {negotiable ? 'Quoted per beat' : 'One-time purchase'}
            </div>
          </div>
          {negotiable ? (
            <a
              href={mailto}
              className="flex items-center gap-2 rounded-lg bg-isark-accent px-4 py-2.5 text-sm font-semibold text-isark-bg shadow-[0_0_24px_rgba(167,139,250,0.45)] transition-transform hover:scale-[1.02] active:scale-95"
            >
              <Mail size={15} />
              Contact ISARK
            </a>
          ) : inCart ? (
            <span className="flex items-center gap-2 rounded-lg border border-isark-accent/50 bg-isark-accent/10 px-4 py-2.5 text-sm font-semibold text-isark-accent">
              <Check size={15} /> Added to cart
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                onAddToCart(beat, license)
                onClose()
              }}
              className="flex items-center gap-2 rounded-lg bg-isark-accent px-4 py-2.5 text-sm font-semibold text-isark-bg shadow-[0_0_24px_rgba(167,139,250,0.45)] transition-transform hover:scale-[1.02] active:scale-95"
            >
              <ShoppingBag size={15} />
              Add to cart
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
