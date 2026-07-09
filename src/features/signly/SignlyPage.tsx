import { useEffect, useState, type FormEvent } from 'react'
import { Signature, X } from 'lucide-react'
import { StatusDot } from '@/components/ui/StatusDot'

interface SignlyPageProps {
  open: boolean
  onClose: () => void
}

interface Member {
  id: number
  name: string
  title: string
  email: string
  phone: string
}

interface Brand {
  companyName: string
  companyWebsite: string
  brandColor: string
}

const INITIAL_MEMBERS: Member[] = [
  { id: 1, name: 'Dana Whitfield', title: 'Office Manager', email: 'dana@northfieldco.com', phone: '(555) 402-1187' },
  { id: 2, name: 'Marcus Ito', title: 'Account Lead', email: 'marcus@northfieldco.com', phone: '(555) 402-1190' },
]

/** Ports the standalone repo's table-based signature HTML generator — kept email-client-compatible (no flexbox). */
function generateSignatureHtml(member: Member, brand: Brand): string {
  const color = brand.brandColor || '#2563EB'
  const website = brand.companyWebsite.replace(/^https?:\/\//, '')
  const websiteLine = website
    ? `<div style="margin-top:2px;"><a href="https://${website}" style="color:${color}; text-decoration:none;">${website}</a></div>`
    : ''
  return `<table cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; font-size: 13px; color: #333333;">
  <tr>
    <td style="vertical-align:top;">
      <div style="font-weight:bold; font-size:14px; color:#1a1a1a;">${member.name}</div>
      ${member.title ? `<div style="color:#555555;">${member.title}</div>` : ''}
      ${brand.companyName ? `<div style="color:${color}; font-weight:bold; margin-top:4px;">${brand.companyName}</div>` : ''}
      <div style="margin-top:4px; color:#555555;">
        ${member.phone}${member.phone && member.email ? ' &nbsp;|&nbsp; ' : ''}${member.email ? `<a href="mailto:${member.email}" style="color:#555555; text-decoration:none;">${member.email}</a>` : ''}
      </div>
      ${websiteLine}
    </td>
  </tr>
</table>`
}

/**
 * Signly — a deliberately simple, no-frills branded email signature
 * generator for small teams. Weekend-build prototype: mocked interactive
 * preview only, no real persistence or backend attached. Full app
 * (Vite/React + Node/Express + node:sqlite) lives in the standalone repo
 * — this is the dashboard-facing representation. Copy button here writes
 * the real generated HTML to the clipboard, same as the full app.
 */
export function SignlyPage({ open, onClose }: SignlyPageProps) {
  const [brand, setBrand] = useState<Brand>({ companyName: 'Northfield & Co', companyWebsite: 'northfieldco.com', brandColor: '#2563EB' })
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS)
  const [activeId, setActiveId] = useState(INITIAL_MEMBERS[0].id)
  const [showForm, setShowForm] = useState(false)
  const [newMember, setNewMember] = useState({ name: '', title: '', email: '', phone: '' })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const active = members.find((m) => m.id === activeId) ?? members[0]

  const addMember = (e: FormEvent) => {
    e.preventDefault()
    if (!newMember.name.trim()) return
    const id = Date.now()
    setMembers((prev) => [...prev, { id, ...newMember }])
    setActiveId(id)
    setNewMember({ name: '', title: '', email: '', phone: '' })
    setShowForm(false)
  }

  const removeMember = (id: number) => {
    setMembers((prev) => prev.filter((m) => m.id !== id))
    if (activeId === id) setActiveId(members.find((m) => m.id !== id)?.id ?? 0)
  }

  const copySignature = async () => {
    if (!active) return
    const html = generateSignatureHtml(active, brand)
    try {
      await navigator.clipboard.writeText(html)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#FAFAFA] font-sans text-[#1A1A1A]">
      <header className="flex items-center justify-between border-b border-[#E5E5E5] px-4 py-3">
        <div className="flex items-center gap-3">
          <Signature size={18} style={{ color: brand.brandColor }} />
          <h1 className="font-display text-lg font-semibold text-[#1A1A1A]">Signly</h1>
          <span
            className="flex items-center gap-1.5 border px-2 py-0.5 text-[10px] uppercase tracking-wider"
            style={{ color: '#737373', borderColor: '#E5E5E5', backgroundColor: '#FAFAFA' }}
          >
            <StatusDot color="#737373" size={6} /> weekend build · prototype
          </span>
        </div>
        <button onClick={onClose} className="text-[#737373] transition-colors hover:text-[#1A1A1A]">
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="mb-4 font-mono text-xs text-[#737373]">
          Mock data only — full app lives in the standalone repo. No banners, no analytics, by design.
        </p>
        <div className="mx-auto grid max-w-3xl gap-10 sm:grid-cols-[240px_1fr]">
          <div className="space-y-6">
            <section>
              <h2 className="mb-2 text-xs uppercase tracking-wide text-[#737373]">Brand</h2>
              <div className="space-y-2">
                <input
                  value={brand.companyName}
                  onChange={(e) => setBrand({ ...brand, companyName: e.target.value })}
                  placeholder="Company name"
                  className="w-full rounded border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/30"
                />
                <input
                  value={brand.companyWebsite}
                  onChange={(e) => setBrand({ ...brand, companyWebsite: e.target.value })}
                  placeholder="Website"
                  className="w-full rounded border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/30"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brand.brandColor}
                    onChange={(e) => setBrand({ ...brand, brandColor: e.target.value })}
                    className="h-8 w-10 cursor-pointer rounded border border-[#E5E5E5]"
                  />
                  <span className="text-xs text-[#737373]">Brand color</span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-xs uppercase tracking-wide text-[#737373]">Team</h2>
              <ul className="space-y-1.5">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveId(m.id)}
                      className={`flex-1 rounded border px-2.5 py-1.5 text-left text-xs transition ${
                        m.id === activeId ? 'border-[#1A1A1A] bg-white' : 'border-[#E5E5E5] hover:border-[#1A1A1A]/40'
                      }`}
                    >
                      {m.name}
                    </button>
                    <button onClick={() => removeMember(m.id)} className="text-[#737373] hover:text-red-600">
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>

              {showForm ? (
                <form onSubmit={addMember} className="mt-2 space-y-1.5 rounded border border-[#E5E5E5] bg-white p-2.5">
                  <input
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                    placeholder="Name"
                    className="w-full rounded border border-[#E5E5E5] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/30"
                  />
                  <input
                    value={newMember.title}
                    onChange={(e) => setNewMember({ ...newMember, title: e.target.value })}
                    placeholder="Title"
                    className="w-full rounded border border-[#E5E5E5] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/30"
                  />
                  <input
                    value={newMember.email}
                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                    placeholder="Email"
                    className="w-full rounded border border-[#E5E5E5] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/30"
                  />
                  <input
                    value={newMember.phone}
                    onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                    placeholder="Phone"
                    className="w-full rounded border border-[#E5E5E5] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/30"
                  />
                  <div className="flex gap-2 pt-1">
                    <button type="submit" className="rounded bg-[#1A1A1A] px-3 py-1 text-xs text-white hover:opacity-90">
                      Add
                    </button>
                    <button type="button" onClick={() => setShowForm(false)} className="text-xs text-[#737373] hover:text-[#1A1A1A]">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-2 w-full rounded border border-dashed border-[#E5E5E5] py-1.5 text-xs text-[#737373] hover:border-[#1A1A1A]/40 hover:text-[#1A1A1A]"
                >
                  + Add team member
                </button>
              )}
            </section>
          </div>

          {active ? (
            <div className="space-y-3">
              <h2 className="text-xs uppercase tracking-wide text-[#737373]">Signature preview</h2>
              <div
                className="rounded-lg border border-[#E5E5E5] bg-white p-6"
                dangerouslySetInnerHTML={{ __html: generateSignatureHtml(active, brand) }}
              />
              <button
                onClick={copySignature}
                className="rounded border border-[#1A1A1A] px-4 py-1.5 text-xs font-medium transition hover:bg-[#1A1A1A] hover:text-white"
              >
                {copied ? 'Copied ✓' : 'Copy signature'}
              </button>
              <p className="font-mono text-[10px] text-[#737373]">
                Paste into Gmail/Outlook signature settings. Table-based HTML — no flexbox, broad email-client compatibility.
              </p>
            </div>
          ) : (
            <p className="text-sm text-[#737373]">Add a team member to preview a signature.</p>
          )}
        </div>
      </div>
    </div>
  )
}
