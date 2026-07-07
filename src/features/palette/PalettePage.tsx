import { useEffect, useState, type FormEvent } from 'react'
import { Scissors, X } from 'lucide-react'
import { StatusDot } from '@/components/ui/StatusDot'

interface PalettePageProps {
  open: boolean
  onClose: () => void
}

interface Visit {
  id: number
  date: string
  service: string
  formula: string
  notes: string
}

interface Client {
  id: number
  name: string
  phone: string
  generalNotes: string
  visits: Visit[]
}

const INITIAL_CLIENTS: Client[] = [
  {
    id: 1,
    name: 'Mara Chen',
    phone: '(555) 214-7788',
    generalNotes: 'Sensitive scalp — patch test every visit.',
    visits: [
      {
        id: 1,
        date: '2026-05-02',
        service: 'Full balayage + trim',
        formula: 'Wella 8N + 20 vol, foils 3in bleach',
        notes: 'Loved the money-piece placement — repeat next time.',
      },
      { id: 2, date: '2026-02-14', service: 'Root touch-up', formula: 'Wella 6N', notes: '' },
    ],
  },
  {
    id: 2,
    name: 'Jordan Ruiz',
    phone: '(555) 908-2231',
    generalNotes: 'Allergic to ammonia — always use demi-permanent.',
    visits: [
      {
        id: 3,
        date: '2026-06-20',
        service: 'Demi gloss + cut',
        formula: 'Redken Shades EQ 7NB',
        notes: 'Wants to go one shade lighter next time.',
      },
    ],
  },
]

/**
 * Palette — client preference and visit history tracking for independent
 * stylists. Weekend-build prototype: mocked interactive preview only, no
 * real persistence or backend attached. Full app (Vite/React + Node/Express
 * + node:sqlite) lives in the standalone repo — this is the
 * dashboard-facing representation.
 */
export function PalettePage({ open, onClose }: PalettePageProps) {
  const [studioName, setStudioName] = useState('Gilded Chair Studio')
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS)
  const [selectedId, setSelectedId] = useState(INITIAL_CLIENTS[0].id)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const selected = clients.find((c) => c.id === selectedId)!

  const updateClient = (id: number, patch: Partial<Client>) =>
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#F7F2EC] font-mono text-[#2B241D]">
      <header className="flex items-center justify-between border-b border-[#E8DFD3] bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Scissors size={18} className="text-[#B5657A]" />
          <h1 className="font-display text-lg uppercase tracking-wider text-[#2B241D]">Palette</h1>
          <span
            className="flex items-center gap-1.5 border px-2 py-0.5 text-[10px] uppercase tracking-wider"
            style={{ color: '#8A7F6E', borderColor: '#E8DFD3', backgroundColor: '#FBF7F1' }}
          >
            <StatusDot color="#8A7F6E" size={6} /> weekend build · prototype
          </span>
        </div>
        <button onClick={onClose} className="text-[#8A7F6E] transition-colors hover:text-[#2B241D]">
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="mb-4 text-xs text-[#8A7F6E]">
          Mock data only — full app lives in the standalone repo.
        </p>
        <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-[#8A7F6E]">Studio name</label>
              <input
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                className="w-full rounded border border-[#E8DFD3] bg-white px-2 py-1.5 text-sm text-[#2B241D] focus:outline-none focus:ring-1 focus:ring-[#B5657A]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-[#8A7F6E]">Clients</label>
              <ul className="space-y-1.5">
                {clients.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full rounded border px-2.5 py-1.5 text-left text-xs transition ${
                        c.id === selectedId ? 'bg-[#FBF7F1]' : 'border-[#E8DFD3] hover:border-[#8A7F6E]/50'
                      }`}
                      style={c.id === selectedId ? { color: '#B5657A', borderColor: '#B5657A' } : {}}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <p className="border-t border-[#E8DFD3] pt-2 text-[10px] leading-relaxed text-[#8A7F6E]">
              No client-facing page here — only the stylist ever sees this. Pick a client to view their history.
            </p>
          </div>

          <ClientProfile studioName={studioName} client={selected} onUpdate={(patch) => updateClient(selected.id, patch)} />
        </div>
      </div>
    </div>
  )
}

let visitSeq = 100

function ClientProfile({
  studioName,
  client,
  onUpdate,
}: {
  studioName: string
  client: Client
  onUpdate: (patch: Partial<Client>) => void
}) {
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesDraft, setNotesDraft] = useState(client.generalNotes)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: '', service: '', formula: '', notes: '' })

  useEffect(() => {
    setNotesDraft(client.generalNotes)
    setEditingNotes(false)
    setShowForm(false)
  }, [client.id, client.generalNotes])

  const saveNotes = () => {
    onUpdate({ generalNotes: notesDraft })
    setEditingNotes(false)
  }

  const addVisit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.date) return
    visitSeq += 1
    onUpdate({ visits: [{ id: visitSeq, ...form }, ...client.visits] })
    setForm({ date: '', service: '', formula: '', notes: '' })
    setShowForm(false)
  }

  const deleteVisit = (id: number) => onUpdate({ visits: client.visits.filter((v) => v.id !== id) })

  return (
    <div className="overflow-hidden rounded-lg border border-[#E8DFD3] bg-white text-[#2B241D]">
      <SwatchStrip />
      <div className="border-b border-[#E8DFD3] px-6 py-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#8A7F6E]">{studioName || 'Your studio'}</p>
        <h3 className="font-display text-2xl italic" style={{ fontFamily: "'Lora', serif" }}>
          {client.name}
        </h3>
        {client.phone && <p className="font-mono text-xs text-[#8A7F6E]">{client.phone}</p>}
      </div>

      <div className="max-h-[420px] space-y-6 overflow-y-auto p-6">
        <div className="rounded-lg border border-[#E8DFD3] bg-[#FBF7F1] p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wide text-[#8A7F6E]">Notes (allergies, preferences)</p>
            {!editingNotes && (
              <button onClick={() => setEditingNotes(true)} className="text-xs text-[#B5657A] hover:underline">
                Edit
              </button>
            )}
          </div>
          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={2}
                className="w-full rounded border border-[#E8DFD3] bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#B5657A]"
              />
              <div className="flex gap-2">
                <button onClick={saveNotes} className="rounded bg-[#B5657A] px-3 py-1 text-xs text-white hover:brightness-110">
                  Save
                </button>
                <button onClick={() => setEditingNotes(false)} className="text-xs text-[#8A7F6E] hover:text-[#2B241D]">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm">{client.generalNotes || <span className="italic text-[#8A7F6E]">No notes yet.</span>}</p>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-display text-lg italic">Visit history</h4>
            <button
              onClick={() => setShowForm((s) => !s)}
              className="rounded bg-[#B5657A] px-3 py-1 text-xs text-white transition hover:brightness-110"
            >
              {showForm ? 'Cancel' : '+ Add visit'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={addVisit} className="mb-3 space-y-2 rounded-lg border border-[#E8DFD3] bg-[#FBF7F1] p-3">
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="flex-1 rounded border border-[#E8DFD3] bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#B5657A]"
                />
                <input
                  placeholder="Service type"
                  value={form.service}
                  onChange={(e) => setForm({ ...form, service: e.target.value })}
                  className="flex-[2] rounded border border-[#E8DFD3] bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#B5657A]"
                />
              </div>
              <input
                placeholder="Formula / technique notes"
                value={form.formula}
                onChange={(e) => setForm({ ...form, formula: e.target.value })}
                className="w-full rounded border border-[#E8DFD3] bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#B5657A]"
              />
              <textarea
                placeholder="Notes for next time"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full rounded border border-[#E8DFD3] bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#B5657A]"
              />
              <button type="submit" className="rounded bg-[#C9A15A] px-3 py-1 text-xs text-white hover:brightness-110">
                Save visit
              </button>
            </form>
          )}

          {client.visits.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#8A7F6E]">No visits logged yet.</p>
          ) : (
            <ul className="space-y-2">
              {client.visits.map((v) => (
                <li key={v.id} className="rounded-lg border border-[#E8DFD3] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-medium">{v.date}</p>
                      {v.service && <p className="text-sm text-[#B5657A]">{v.service}</p>}
                    </div>
                    <button onClick={() => deleteVisit(v.id)} className="text-xs text-[#8A7F6E] hover:text-red-600">
                      Delete
                    </button>
                  </div>
                  {v.formula && <p className="mt-2 font-mono text-xs text-[#8A7F6E]">{v.formula}</p>}
                  {v.notes && <p className="mt-1 text-sm italic">{v.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <SwatchStrip />
    </div>
  )
}

function SwatchStrip() {
  return (
    <div
      className="h-1.5 opacity-50"
      style={{
        background:
          'linear-gradient(to right, #B5657A 0%, #B5657A 20%, #C9A15A 20%, #C9A15A 40%, #8A7F6E 40%, #8A7F6E 60%, #D9C7B8 60%, #D9C7B8 80%, #2B241D 80%, #2B241D 100%)',
      }}
    />
  )
}
