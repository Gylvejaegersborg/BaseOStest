import { useEffect, useState } from 'react'
import { Anchor, Plus, X } from 'lucide-react'
import { StatusDot } from '@/components/ui/StatusDot'

interface TidewriterPageProps {
  open: boolean
  onClose: () => void
}

interface TripType {
  id: number
  name: string
  hours: number
  partySize: number
}

const INITIAL_TRIP_TYPES: TripType[] = [
  { id: 1, name: 'Half-day inshore', hours: 4, partySize: 4 },
  { id: 2, name: 'Full-day offshore', hours: 8, partySize: 6 },
]

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'your-charter'
  )
}

/**
 * Tidewriter — trip booking and catch/trip log for independent fishing
 * guides. Weekend-build prototype: mocked interactive preview only, no
 * real booking submission or backend attached. Full app (Vite/React +
 * Node/Express + node:sqlite) lives in the standalone repo — this is the
 * dashboard-facing representation.
 */
export function TidewriterPage({ open, onClose }: TidewriterPageProps) {
  const [businessName, setBusinessName] = useState('Cole Charters')
  const [tripTypes, setTripTypes] = useState<TripType[]>(INITIAL_TRIP_TYPES)
  const [newTripName, setNewTripName] = useState('')
  const [newTripHours, setNewTripHours] = useState('4')
  let tripTypeSeq = tripTypes.length

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const addTripType = () => {
    const name = newTripName.trim()
    if (!name) return
    const hours = parseFloat(newTripHours) || 4
    tripTypeSeq += 1
    setTripTypes((prev) => [...prev, { id: tripTypeSeq, name, hours, partySize: 4 }])
    setNewTripName('')
    setNewTripHours('4')
  }

  const removeTripType = (id: number) => setTripTypes((prev) => prev.filter((t) => t.id !== id))

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0F1E24] font-mono text-[#EAF2F0]">
      <header className="flex items-center justify-between border-b border-[#2C4048] bg-[#16262D] px-4 py-3">
        <div className="flex items-center gap-3">
          <Anchor size={18} className="text-[#C08A3E]" />
          <h1 className="font-display text-lg uppercase tracking-wider text-[#EAF2F0]">Tidewriter</h1>
          <span
            className="flex items-center gap-1.5 border px-2 py-0.5 text-[10px] uppercase tracking-wider"
            style={{ color: '#7C9291', borderColor: '#2C4048', backgroundColor: '#1D2F37' }}
          >
            <StatusDot color="#7C9291" size={6} /> weekend build · prototype
          </span>
        </div>
        <button onClick={onClose} className="text-[#7C9291] transition-colors hover:text-[#EAF2F0]">
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="mb-4 text-xs text-[#7C9291]">
          Mock data only — full app lives in the standalone repo.
        </p>
        <div className="grid gap-4 sm:grid-cols-[240px_1fr]">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-[#7C9291]">Charter name</label>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded border border-[#2C4048] bg-[#16262D] px-2 py-1.5 text-sm text-[#EAF2F0] focus:outline-none focus:ring-1 focus:ring-[#C08A3E]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-[#7C9291]">Trip types</label>
              <ul className="space-y-1.5">
                {tripTypes.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded border border-[#2C4048] bg-[#16262D] px-2 py-1.5 text-xs"
                  >
                    <span className="truncate">
                      {t.name} <span className="text-[#7C9291]">· {t.hours}h</span>
                    </span>
                    <button onClick={() => removeTripType(t.id)} className="shrink-0 text-[#7C9291] hover:text-[#EAF2F0]">
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-1">
                <input
                  value={newTripName}
                  onChange={(e) => setNewTripName(e.target.value)}
                  placeholder="e.g. Night flounder run"
                  className="w-0 min-w-0 flex-1 rounded border border-[#2C4048] bg-[#16262D] px-1.5 py-1 text-[11px] text-[#EAF2F0] placeholder:text-[#7C9291] focus:outline-none focus:ring-1 focus:ring-[#C08A3E]"
                />
                <input
                  value={newTripHours}
                  onChange={(e) => setNewTripHours(e.target.value)}
                  placeholder="hrs"
                  className="w-12 rounded border border-[#2C4048] bg-[#16262D] px-1.5 py-1 text-[11px] text-[#EAF2F0] placeholder:text-[#7C9291] focus:outline-none focus:ring-1 focus:ring-[#C08A3E]"
                />
                <button
                  onClick={addTripType}
                  className="flex shrink-0 items-center justify-center rounded border border-[#C08A3E]/50 bg-[#C08A3E]/10 px-2 text-[#C08A3E] hover:bg-[#C08A3E]/20"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>

            <p className="border-t border-[#2C4048] pt-2 text-[10px] leading-relaxed text-[#7C9291]">
              This is the public booking page a client sees when the guide shares their trip link.
            </p>
          </div>

          <BookingPreview businessName={businessName} tripTypes={tripTypes} />
        </div>
      </div>
    </div>
  )
}

const TIDE_LINE_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='24' viewBox='0 0 120 24'%3E%3Cpath d='M0 12 Q 15 0, 30 12 T 60 12 T 90 12 T 120 12' stroke='%23C08A3E' stroke-width='1.5' fill='none' opacity='0.6'/%3E%3C/svg%3E\")"

function BookingPreview({ businessName, tripTypes }: { businessName: string; tripTypes: TripType[] }) {
  const [submitted, setSubmitted] = useState(false)
  const slug = slugify(businessName)

  return (
    <div className="overflow-hidden rounded-lg border border-[#2C4048] bg-[#0F1E24] text-[#EAF2F0]">
      <div className="flex items-center gap-1.5 border-b border-[#2C4048] bg-[#16262D] px-2 py-1.5">
        <span className="h-2 w-2 rounded-full bg-[#C08A3E]/60" />
        <span className="h-2 w-2 rounded-full bg-[#3E8E8B]/60" />
        <span className="h-2 w-2 rounded-full bg-[#7C9291]/60" />
        <span className="ml-2 truncate text-[10px] text-[#7C9291]">tidewriter.app/book/{slug}</span>
      </div>

      <div
        className="h-6"
        style={{ backgroundImage: TIDE_LINE_BG, backgroundRepeat: 'repeat-x', backgroundSize: '120px 24px' }}
      />

      {submitted ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="font-display text-xl">Request sent.</p>
          <p className="max-w-xs text-xs text-[#7C9291]">
            {businessName || 'Your guide'} will confirm your trip request soon. Tight lines!
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-2 text-[10px] uppercase tracking-wider text-[#C08A3E] hover:underline"
          >
            ← back to booking page
          </button>
        </div>
      ) : (
        <>
          <div className="px-6 py-6 text-center">
            <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-[#7C9291]">Book a trip with</p>
            <h3 className="font-display text-2xl" style={{ color: '#C08A3E', fontFamily: "'Lora', serif" }}>
              {businessName || 'Your Guide'}
            </h3>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              setSubmitted(true)
            }}
            className="mx-auto max-w-sm space-y-3 px-6 pb-6"
          >
            {tripTypes.length > 0 && (
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wide text-[#7C9291]">Trip type</label>
                <select className="w-full rounded border border-[#2C4048] bg-[#1D2F37] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C08A3E]">
                  {tripTypes.map((t) => (
                    <option key={t.id}>
                      {t.name} ({t.hours}h, up to {t.partySize})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-[#7C9291]">Your name</label>
              <input className="w-full rounded border border-[#2C4048] bg-[#1D2F37] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C08A3E]" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-[#7C9291]">Preferred date</label>
              <input type="date" className="w-full rounded border border-[#2C4048] bg-[#1D2F37] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C08A3E]" />
            </div>
            <button
              type="submit"
              className="w-full rounded bg-[#C08A3E] py-2.5 font-medium text-[#0F1E24] transition hover:brightness-110"
            >
              Request this trip
            </button>
            <p className="text-center text-[10px] text-[#7C9291]">
              Preview only — no request sent. {businessName || 'Your guide'} will confirm availability in the real app.
            </p>
          </form>
        </>
      )}

      <div
        className="h-6"
        style={{ backgroundImage: TIDE_LINE_BG, backgroundRepeat: 'repeat-x', backgroundSize: '120px 24px' }}
      />
      <div className="py-3 text-center text-[10px] text-[#7C9291]">Booked with Tidewriter</div>
    </div>
  )
}
