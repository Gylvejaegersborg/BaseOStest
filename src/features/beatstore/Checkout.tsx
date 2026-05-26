import { useState } from 'react'
import { ArrowLeft, Lock } from 'lucide-react'
import { formatPrice, type CartItem } from '@/data/beats'

interface CheckoutProps {
  items: CartItem[]
  onComplete: (email: string) => void
  onBack: () => void
}

const inputCls =
  'w-full rounded-md border border-isark-line bg-isark-bg px-3 py-2 text-sm text-isark-text placeholder:text-isark-dim focus:border-isark-accent focus:outline-none'

export function Checkout({ items, onComplete, onBack }: CheckoutProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [card, setCard] = useState('')
  const [exp, setExp] = useState('')
  const [cvc, setCvc] = useState('')
  const total = items.reduce((s, i) => s + i.price, 0)
  const ready = email.includes('@') && name.trim().length > 1 && card.replace(/\s/g, '').length >= 12 && exp && cvc

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-5">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 flex items-center gap-1.5 text-xs uppercase tracking-wide text-isark-dim hover:text-isark-text"
        >
          <ArrowLeft size={14} /> Back to cart
        </button>

        <div className="mb-4 rounded-lg border border-isark-line bg-isark-surface p-3">
          {items.map((item) => (
            <div key={`${item.beatId}-${item.tier}`} className="flex justify-between py-0.5 text-sm">
              <span className="text-isark-dim">
                {item.title} <span className="font-mono text-[11px]">· {item.tier}</span>
              </span>
              <span className="font-mono text-isark-text">{formatPrice(item.price)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wide text-isark-dim">Email (delivery)</label>
            <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wide text-isark-dim">Name on card</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wide text-isark-dim">Card number</label>
            <input
              className={inputCls}
              value={card}
              onChange={(e) => setCard(e.target.value.replace(/[^\d ]/g, '').slice(0, 19))}
              placeholder="4242 4242 4242 4242"
              inputMode="numeric"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-isark-dim">Expiry</label>
              <input className={inputCls} value={exp} onChange={(e) => setExp(e.target.value.slice(0, 5))} placeholder="MM/YY" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-isark-dim">CVC</label>
              <input
                className={inputCls}
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                inputMode="numeric"
              />
            </div>
          </div>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-isark-dim">
          <Lock size={11} /> Demo checkout — no real payment is processed.
        </p>
      </div>

      <div className="border-t border-isark-line p-4">
        <button
          type="button"
          disabled={!ready}
          onClick={() => onComplete(email)}
          className="w-full rounded-lg bg-isark-accent py-2.5 text-sm font-semibold text-isark-bg transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-30"
        >
          Pay {formatPrice(total)}
        </button>
      </div>
    </div>
  )
}
