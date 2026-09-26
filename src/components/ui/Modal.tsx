import type { ReactNode } from 'react'
import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { Panel } from './Panel'

// Open modals, innermost last — so Escape closes only the top one and a
// pop-up opened from inside another pop-up returns to its parent.
const openStack: string[] = []

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
  const id = useId()
  useEffect(() => {
    if (!open) return
    openStack.push(id)
    return () => {
      const i = openStack.lastIndexOf(id)
      if (i >= 0) openStack.splice(i, 1)
    }
  }, [open, id])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openStack[openStack.length - 1] === id) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, id])

  if (!open) return null

  // Portalled to <body> so a pop-up opened from inside another pop-up (whose
  // panel's backdrop-filter would otherwise trap position:fixed) stacks on top.
  return createPortal(
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
          className="max-h-[85dvh] rounded-docked border-line-2 bg-panel shadow-glow"
          bodyClassName="overflow-y-auto p-4"
          style={{ borderColor: accent ? `${accent}55` : undefined }}
        >
          {children}
        </Panel>
      </div>
    </div>,
    document.body,
  )
}
