import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Stethoscope, X } from 'lucide-react'
import { StatusDot } from '@/components/ui/StatusDot'

interface RecalloPageProps {
  open: boolean
  onClose: () => void
}

type Status = 'overdue' | 'upcoming' | 'ok'

interface Patient {
  id: number
  name: string
  phone: string
  lastVisitDate: string
  recallIntervalMonths: number
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function addMonths(dateStr: string, months: number): Date {
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  return d
}

function statusOf(p: Patient): { status: Status; daysUntilDue: number } {
  const due = addMonths(p.lastVisitDate, p.recallIntervalMonths)
  const diffDays = Math.round((due.getTime() - new Date(today() + 'T00:00:00').getTime()) / 86400000)
  const status: Status = diffDays < 0 ? 'overdue' : diffDays <= 30 ? 'upcoming' : 'ok'
  return { status, daysUntilDue: diffDays }
}

/** Backs into a last-visit date that puts the recall due date a fixed number of days from today, regardless of month-length quirks — used only to seed demo rows into a specific bucket. */
function lastVisitForDueInDays(days: number, recallIntervalMonths: number): string {
  const due = new Date()
  due.setDate(due.getDate() + days)
  due.setMonth(due.getMonth() - recallIntervalMonths)
  return due.toISOString().slice(0, 10)
}

const STATUS_COLOR: Record<Status, string> = { overdue: '#B8433A', upcoming: '#3A5B8C', ok: '#4C7A5B' }

let patientSeq = 100

/**
 * Recallo — an overdue-recall list for dental practices. Weekend-build
 * prototype: mocked interactive preview only, no real persistence or
 * backend attached. Full app (Vite/React + Node/Express + node:sqlite)
 * lives in the standalone repo — this is the dashboard-facing
 * representation. No automated patient messaging — deliberately, per the
 * product's own scope note.
 */
export function RecalloPage({ open, onClose }: RecalloPageProps) {
  const [practiceName, setPracticeName] = useState('Harborview Dental')
  const [patients, setPatients] = useState<Patient[]>(() => [
    { id: 1, name: 'Ellis Roan', phone: '(555) 340-1187', lastVisitDate: lastVisitForDueInDays(-30, 6), recallIntervalMonths: 6 },
    { id: 2, name: 'Priya Nair', phone: '(555) 762-9043', lastVisitDate: lastVisitForDueInDays(15, 6), recallIntervalMonths: 6 },
    { id: 3, name: 'Tom Okafor', phone: '(555) 118-6620', lastVisitDate: lastVisitForDueInDays(150, 6), recallIntervalMonths: 6 },
  ])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', lastVisitDate: today(), recallIntervalMonths: '6' })

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const addPatient = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.lastVisitDate) return
    patientSeq += 1
    setPatients((prev) => [
      ...prev,
      {
        id: patientSeq,
        name: form.name.trim(),
        phone: form.phone.trim(),
        lastVisitDate: form.lastVisitDate,
        recallIntervalMonths: parseInt(form.recallIntervalMonths, 10) || 6,
      },
    ])
    setForm({ name: '', phone: '', lastVisitDate: today(), recallIntervalMonths: '6' })
    setShowForm(false)
  }

  const markVisited = (id: number) =>
    setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, lastVisitDate: today() } : p)))

  const removePatient = (id: number) => setPatients((prev) => prev.filter((p) => p.id !== id))

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#F5F1E8] font-mono text-[#24303A]">
      <header className="flex items-center justify-between border-b border-[#D8CFAF] bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Stethoscope size={18} className="text-[#3A5B8C]" />
          <h1 className="font-display text-lg uppercase tracking-wider text-[#24303A]">Recallo</h1>
          <span
            className="flex items-center gap-1.5 border px-2 py-0.5 text-[10px] uppercase tracking-wider"
            style={{ color: '#8A8370', borderColor: '#D8CFAF', backgroundColor: '#F5F1E8' }}
          >
            <StatusDot color="#8A8370" size={6} /> weekend build · prototype
          </span>
        </div>
        <button onClick={onClose} className="text-[#8A8370] transition-colors hover:text-[#24303A]">
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="mb-4 text-xs text-[#8A8370]">
          Mock data only — full app lives in the standalone repo. No automated patient messaging, by design.
        </p>
        <div className="grid gap-4 sm:grid-cols-[240px_1fr]">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-[#8A8370]">Practice name</label>
              <input
                value={practiceName}
                onChange={(e) => setPracticeName(e.target.value)}
                className="w-full rounded border border-[#D8CFAF] bg-white px-2 py-1.5 text-sm text-[#24303A] focus:outline-none focus:ring-1 focus:ring-[#3A5B8C]"
              />
            </div>

            <div>
              <button
                onClick={() => setShowForm((s) => !s)}
                className="w-full rounded bg-[#24303A] py-1.5 text-xs text-[#F5F1E8] transition hover:opacity-90"
              >
                {showForm ? 'Cancel' : '+ Add patient'}
              </button>
              {showForm && (
                <form onSubmit={addPatient} className="mt-2 space-y-2 rounded-lg border border-[#D8CFAF] bg-white p-3">
                  <input
                    placeholder="Patient name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded border border-[#D8CFAF] bg-[#F5F1E8] px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#3A5B8C]"
                  />
                  <input
                    placeholder="Phone (optional)"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded border border-[#D8CFAF] bg-[#F5F1E8] px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#3A5B8C]"
                  />
                  <div>
                    <label className="mb-1 block text-[10px] text-[#8A8370]">Last visit date</label>
                    <input
                      type="date"
                      required
                      value={form.lastVisitDate}
                      onChange={(e) => setForm({ ...form, lastVisitDate: e.target.value })}
                      className="w-full rounded border border-[#D8CFAF] bg-[#F5F1E8] px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#3A5B8C]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-[#8A8370]">Recall (months)</label>
                    <input
                      type="number"
                      min="1"
                      value={form.recallIntervalMonths}
                      onChange={(e) => setForm({ ...form, recallIntervalMonths: e.target.value })}
                      className="w-full rounded border border-[#D8CFAF] bg-[#F5F1E8] px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#3A5B8C]"
                    />
                  </div>
                  <button type="submit" className="w-full rounded bg-[#3A5B8C] py-1.5 text-xs text-white hover:brightness-110">
                    Add patient
                  </button>
                </form>
              )}
            </div>

            <p className="border-t border-[#D8CFAF] pt-2 text-[10px] leading-relaxed text-[#8A8370]">
              No public-facing page — this is the internal front-desk list, worked by phone.
            </p>
          </div>

          <RecallBoard practiceName={practiceName} patients={patients} onMarkVisited={markVisited} onRemove={removePatient} />
        </div>
      </div>
    </div>
  )
}

function RecallBoard({
  practiceName,
  patients,
  onMarkVisited,
  onRemove,
}: {
  practiceName: string
  patients: Patient[]
  onMarkVisited: (id: number) => void
  onRemove: (id: number) => void
}) {
  const rows = useMemo(() => patients.map((p) => ({ patient: p, ...statusOf(p) })), [patients])
  const overdue = rows.filter((r) => r.status === 'overdue')
  const upcoming = rows.filter((r) => r.status === 'upcoming')
  const ok = rows.filter((r) => r.status === 'ok')

  return (
    <div className="overflow-hidden rounded-lg border border-[#D8CFAF] bg-white text-[#24303A]">
      <PerfEdge />
      <div className="border-b border-[#D8CFAF] px-6 py-4">
        <h3 className="font-display text-xl font-bold">{practiceName || 'Your practice'}</h3>
        <p className="text-sm text-[#8A8370]">Recall list</p>
      </div>

      <div className="max-h-[440px] space-y-6 overflow-y-auto p-6">
        <Section title="Overdue" color={STATUS_COLOR.overdue} rows={overdue} empty="No overdue recalls. Nice work." onMarkVisited={onMarkVisited} onRemove={onRemove} />
        <Section title="Due soon" color={STATUS_COLOR.upcoming} rows={upcoming} empty="Nothing due in the next 30 days." onMarkVisited={onMarkVisited} onRemove={onRemove} />
        {ok.length > 0 && (
          <Section title="Not due yet" color={STATUS_COLOR.ok} rows={ok} empty="" onMarkVisited={onMarkVisited} onRemove={onRemove} />
        )}
      </div>

      <PerfEdge />
    </div>
  )
}

function Section({
  title,
  color,
  rows,
  empty,
  onMarkVisited,
  onRemove,
}: {
  title: string
  color: string
  rows: { patient: Patient; status: Status; daysUntilDue: number }[]
  empty: string
  onMarkVisited: (id: number) => void
  onRemove: (id: number) => void
}) {
  return (
    <section>
      <h4 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color }}>
        {title} ({rows.length})
      </h4>
      {rows.length === 0 ? (
        <p className="text-sm text-[#8A8370]">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ patient, status, daysUntilDue }) => (
            <li key={patient.id} className="rounded-lg border border-[#D8CFAF] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{patient.name}</p>
                  {patient.phone && <p className="font-display text-xs text-[#8A8370]">{patient.phone}</p>}
                  <span
                    className="mt-1 inline-flex items-center rounded border-[1.5px] border-dashed px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: STATUS_COLOR[status], borderColor: STATUS_COLOR[status] }}
                  >
                    {status === 'overdue' ? `${Math.abs(daysUntilDue)} days overdue` : `due in ${daysUntilDue} days`}
                  </span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => onMarkVisited(patient.id)}
                    className="whitespace-nowrap rounded bg-[#4C7A5B] px-3 py-1.5 text-xs text-white transition hover:brightness-110"
                  >
                    Mark visited
                  </button>
                  <button onClick={() => onRemove(patient.id)} className="text-xs text-[#8A8370] hover:text-[#B8433A]">
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PerfEdge() {
  return (
    <div
      className="h-2"
      style={{
        backgroundImage: 'radial-gradient(circle, #F5F1E8 2.5px, transparent 2.6px)',
        backgroundSize: '14px 8px',
        backgroundRepeat: 'repeat-x',
        backgroundPosition: 'center',
        backgroundColor: '#D8CFAF',
      }}
    />
  )
}
