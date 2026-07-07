import { useEffect, useState } from 'react'
import { ClipboardCheck, Plus, X } from 'lucide-react'
import { StatusDot } from '@/components/ui/StatusDot'

interface ClearscopePageProps {
  open: boolean
  onClose: () => void
}

type ItemStatus = 'pass' | 'fail' | 'not_checked'

interface ChecklistItem {
  id: number
  label: string
  status: ItemStatus
  notes?: string
}

const INITIAL_CHECKLIST: ChecklistItem[] = [
  { id: 1, label: 'Roof', status: 'pass' },
  { id: 2, label: 'Foundation', status: 'pass' },
  { id: 3, label: 'Electrical', status: 'fail', notes: 'Two outlets in garage not grounded' },
  { id: 4, label: 'Plumbing', status: 'pass' },
  { id: 5, label: 'HVAC', status: 'not_checked' },
  { id: 6, label: 'Windows & Doors', status: 'pass' },
]

const NEXT_STATUS: Record<ItemStatus, ItemStatus> = {
  pass: 'fail',
  fail: 'not_checked',
  not_checked: 'pass',
}

const STATUS_LABEL: Record<ItemStatus, string> = {
  pass: 'pass',
  fail: 'fail',
  not_checked: 'N/A',
}

const STATUS_COLOR: Record<ItemStatus, string> = {
  pass: '#4CA76B',
  fail: '#D9694F',
  not_checked: '#6E8CA6',
}

/**
 * Clearscope — booking and report generation for independent home
 * inspectors. Weekend-build prototype: mocked interactive preview only,
 * no real booking or backend attached. Full app (Vite/React + Node/Express
 * + node:sqlite) lives in the standalone repo — this is the
 * dashboard-facing representation.
 */
export function ClearscopePage({ open, onClose }: ClearscopePageProps) {
  const [businessName, setBusinessName] = useState('Bedrock Inspections')
  const [propertyAddress, setPropertyAddress] = useState('412 Maplewood Ave')
  const [checklist, setChecklist] = useState<ChecklistItem[]>(INITIAL_CHECKLIST)
  const [newItemLabel, setNewItemLabel] = useState('')
  let itemSeq = checklist.length

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const cycleStatus = (id: number) =>
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, status: NEXT_STATUS[item.status] } : item)))

  const addItem = () => {
    const label = newItemLabel.trim()
    if (!label) return
    itemSeq += 1
    setChecklist((prev) => [...prev, { id: itemSeq, label, status: 'not_checked' }])
    setNewItemLabel('')
  }

  const removeItem = (id: number) => setChecklist((prev) => prev.filter((item) => item.id !== id))

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0D2138] font-mono text-[#EAF1F8]">
      <header className="flex items-center justify-between border-b border-[#2A4E6E] bg-[#12304F] px-4 py-3">
        <div className="flex items-center gap-3">
          <ClipboardCheck size={18} className="text-[#8FD3F4]" />
          <h1 className="font-display text-lg uppercase tracking-wider text-[#EAF1F8]">Clearscope</h1>
          <span
            className="flex items-center gap-1.5 border px-2 py-0.5 text-[10px] uppercase tracking-wider"
            style={{ color: '#6E8CA6', borderColor: '#2A4E6E', backgroundColor: '#173A5E' }}
          >
            <StatusDot color="#6E8CA6" size={6} /> weekend build · prototype
          </span>
        </div>
        <button onClick={onClose} className="text-[#6E8CA6] transition-colors hover:text-[#EAF1F8]">
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="mb-4 text-xs text-[#6E8CA6]">
          Mock data only — full app lives in the standalone repo.
        </p>
        <div className="grid gap-4 sm:grid-cols-[240px_1fr]">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-[#6E8CA6]">Inspector / company</label>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded border border-[#2A4E6E] bg-[#12304F] px-2 py-1.5 text-sm text-[#EAF1F8] focus:outline-none focus:ring-1 focus:ring-[#8FD3F4]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-[#6E8CA6]">Property address</label>
              <input
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                className="w-full rounded border border-[#2A4E6E] bg-[#12304F] px-2 py-1.5 text-sm text-[#EAF1F8] focus:outline-none focus:ring-1 focus:ring-[#8FD3F4]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-[#6E8CA6]">Checklist</label>
              <p className="mb-1.5 text-[10px] text-[#6E8CA6]">Click a stamp to cycle pass / fail / N/A.</p>
              <ul className="space-y-1.5">
                {checklist.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded border border-[#2A4E6E] bg-[#12304F] px-2 py-1.5 text-xs"
                  >
                    <span className="truncate">{item.label}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button onClick={() => cycleStatus(item.id)} className="cursor-pointer">
                        <Stamp status={item.status} small />
                      </button>
                      <button onClick={() => removeItem(item.id)} className="text-[#6E8CA6] hover:text-[#EAF1F8]">
                        <X size={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-1">
                <input
                  value={newItemLabel}
                  onChange={(e) => setNewItemLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addItem()}
                  placeholder="e.g. Attic insulation"
                  className="w-0 min-w-0 flex-1 rounded border border-[#2A4E6E] bg-[#12304F] px-1.5 py-1 text-[11px] text-[#EAF1F8] placeholder:text-[#6E8CA6] focus:outline-none focus:ring-1 focus:ring-[#8FD3F4]"
                />
                <button
                  onClick={addItem}
                  className="flex shrink-0 items-center justify-center rounded border border-[#8FD3F4]/50 bg-[#8FD3F4]/10 px-2 text-[#8FD3F4] hover:bg-[#8FD3F4]/20"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>

            <p className="border-t border-[#2A4E6E] pt-2 text-[10px] leading-relaxed text-[#6E8CA6]">
              This is the shareable report page a client sees after the inspection wraps.
            </p>
          </div>

          <ReportPreview businessName={businessName} propertyAddress={propertyAddress} checklist={checklist} />
        </div>
      </div>
    </div>
  )
}

function ReportPreview({
  businessName,
  propertyAddress,
  checklist,
}: {
  businessName: string
  propertyAddress: string
  checklist: ChecklistItem[]
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#2A4E6E] bg-[#0D2138] text-[#EAF1F8]">
      <div className="flex items-center gap-1.5 border-b border-[#2A4E6E] bg-[#12304F] px-2 py-1.5">
        <span className="h-2 w-2 rounded-full bg-[#D9694F]/60" />
        <span className="h-2 w-2 rounded-full bg-[#8FD3F4]/60" />
        <span className="h-2 w-2 rounded-full bg-[#4CA76B]/60" />
        <span className="ml-2 truncate text-[10px] text-[#6E8CA6]">clearscope.app/report/{'{report-slug}'}</span>
      </div>

      <div
        className="border-b border-[#2A4E6E] px-6 py-8 text-center"
        style={{
          backgroundImage:
            'linear-gradient(rgba(143, 211, 244, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(143, 211, 244, 0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      >
        <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#6E8CA6]">
          Inspection report — {businessName || 'Your inspector'}
        </p>
        <h3 className="font-display text-2xl font-semibold" style={{ color: '#8FD3F4' }}>
          {propertyAddress || 'Property address'}
        </h3>
        <p className="mt-2 font-mono text-sm text-[#6E8CA6]">Jamie Ortiz · 2026-07-14</p>
      </div>

      <div className="max-h-[380px] space-y-3 overflow-y-auto p-5">
        {checklist.map((item) => (
          <div key={item.id} className="rounded-lg border border-[#2A4E6E] bg-[#12304F] p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium">{item.label}</p>
              <Stamp status={item.status} />
            </div>
            {item.notes && <p className="text-sm text-[#6E8CA6]">{item.notes}</p>}
          </div>
        ))}
      </div>

      <div className="py-3 text-center text-[10px] text-[#6E8CA6]">Report generated with Clearscope</div>
    </div>
  )
}

function Stamp({ status, small }: { status: ItemStatus; small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded border-2 border-current font-bold uppercase tracking-wider ${
        small ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
      }`}
      style={{ color: STATUS_COLOR[status], transform: 'rotate(-2deg)' }}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
