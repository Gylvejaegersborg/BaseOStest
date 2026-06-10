import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  code?: string
  accent?: string
  children: ReactNode
  width?: number
}

export function Modal({ open, onClose, title, code, accent, children, width = 560 }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full border border-line-2 bg-panel shadow-glow max-h-[85dvh] flex flex-col"
        style={{ maxWidth: width, borderColor: accent ? `${accent}55` : undefined }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-baseline gap-2">
            {code && <span className="text-[10px] tracking-widest text-dim">{code}</span>}
            <h3 className="font-display uppercase tracking-wider" style={{ color: accent ?? '#c8d2dc' }}>
              {title}
            </h3>
          </div>
          <button onClick={onClose} className="text-dim hover:text-text transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}
