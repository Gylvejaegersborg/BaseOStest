import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Panel } from './Panel'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  code?: string
  accent?: string
  children: ReactNode
  width?: number
}

/** Modal is Panel in its contained role (dismissible), sharing one header/
 *  dismiss implementation instead of duplicating it. Visual output is kept
 *  identical to before this merge (bg-panel, border-line-2, shadow-glow,
 *  square corners) rather than adopting Panel's elevation-4 look here —
 *  that system-wide visual shift belongs to the page-specific phase, applied
 *  deliberately per surface rather than defaulted onto every modal at once. */
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
        className="relative w-full max-h-[85dvh]"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <Panel
          title={title}
          code={code}
          accent={accent}
          dismissible
          onDismiss={onClose}
          className="max-h-[85dvh] border-line-2 bg-panel shadow-glow"
          bodyClassName="overflow-y-auto p-4"
          style={{ borderColor: accent ? `${accent}55` : undefined }}
        >
          {children}
        </Panel>
      </div>
    </div>
  )
}
