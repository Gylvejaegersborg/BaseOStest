import { useEffect, useState } from 'react'
import { Film, X } from 'lucide-react'
import { StatusDot } from '@/components/ui/StatusDot'

interface ReelroomPageProps {
  open: boolean
  onClose: () => void
}

interface Video {
  id: number
  name: string
}

const MOCK_VIDEOS: Video[] = [
  { id: 1, name: 'Ceremony_Highlights.mp4' },
  { id: 2, name: 'Reception_FullCut.mp4' },
  { id: 3, name: 'Drone_Establishing.mp4' },
]

/**
 * Reelroom — branded video-gallery wrapper for freelance videographers.
 * Weekend-build prototype: mocked interactive preview only, no real video
 * or backend attached. Full app (Vite/React + Node/Express + SQLite) lives
 * in the standalone repo — this is the dashboard-facing representation.
 */
export function ReelroomPage({ open, onClose }: ReelroomPageProps) {
  const [brandName, setBrandName] = useState('Northwind Films')
  const [brandColor, setBrandColor] = useState('#E8A33D')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#14120F] font-mono text-[#F2EDE4]">
      <header className="flex items-center justify-between border-b border-[#3A3229] bg-[#1F1B16] px-4 py-3">
        <div className="flex items-center gap-3">
          <Film size={18} style={{ color: brandColor }} />
          <h1 className="font-display text-lg uppercase tracking-wider text-[#F2EDE4]">Reelroom</h1>
          <span
            className="flex items-center gap-1.5 border px-2 py-0.5 text-[10px] uppercase tracking-wider"
            style={{ color: '#8B8478', borderColor: '#3A3229', backgroundColor: '#28221B' }}
          >
            <StatusDot color="#8B8478" size={6} /> weekend build · prototype
          </span>
        </div>
        <button onClick={onClose} className="text-[#8B8478] transition-colors hover:text-[#F2EDE4]">
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="mb-4 text-xs text-[#8B8478]">
          Mock data only — full app lives in the standalone repo.
        </p>
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-[#8B8478]">Studio name</label>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full rounded border border-[#3A3229] bg-[#14120F] px-2 py-1.5 text-sm text-[#F2EDE4] focus:outline-none focus:ring-1 focus:ring-[#E8A33D]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-[#8B8478]">Brand color</label>
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-9 w-full cursor-pointer rounded border border-[#3A3229] bg-[#14120F]"
              />
            </div>
            <p className="border-t border-[#3A3229] pt-2 text-[10px] leading-relaxed text-[#8B8478]">
              This is the client-facing gallery view a videographer would share after wrapping their delivery.
            </p>
          </div>

          <GalleryPreview brandName={brandName} brandColor={brandColor} />
        </div>
      </div>
    </div>
  )
}

function GalleryPreview({ brandName, brandColor }: { brandName: string; brandColor: string }) {
  const [active, setActive] = useState(MOCK_VIDEOS[0])

  return (
    <div className="overflow-hidden rounded-lg border border-[#3A3229] bg-[#14120F] text-[#F2EDE4]">
      <div
        className="h-1.5"
        style={{
          backgroundImage: `radial-gradient(circle, ${brandColor} 1.5px, transparent 1.6px)`,
          backgroundSize: '14px 100%',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'center',
          opacity: 0.85,
        }}
      />
      <div className="border-b border-[#3A3229] bg-[#1F1B16] px-5 py-5 text-center">
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-[#8B8478]">{brandName} presents</p>
        <h3 className="italic" style={{ color: brandColor, fontFamily: 'Georgia, serif', fontSize: '1.25rem' }}>
          Chen Wedding — Final Cut
        </h3>
      </div>
      <div
        className="h-1.5"
        style={{
          backgroundImage: `radial-gradient(circle, ${brandColor} 1.5px, transparent 1.6px)`,
          backgroundSize: '14px 100%',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'center',
          opacity: 0.85,
        }}
      />

      <div className="p-4">
        <div className="mb-3 flex aspect-video items-center justify-center rounded bg-black text-xs text-[#8B8478]">
          ▶ {active.name} (preview only — no real video attached)
        </div>
        <ul className="space-y-1.5">
          {MOCK_VIDEOS.map((v, i) => (
            <li key={v.id}>
              <button
                onClick={() => setActive(v)}
                className={`w-full rounded border px-3 py-2 text-left text-sm transition ${
                  active.id === v.id
                    ? 'border-current bg-[#28221B]'
                    : 'border-[#3A3229] hover:border-[#3A3229]/70'
                }`}
                style={active.id === v.id ? { color: brandColor, borderColor: brandColor } : {}}
              >
                <span className="mr-2 font-mono text-xs text-[#8B8478]">{String(i + 1).padStart(2, '0')}</span>
                {v.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
