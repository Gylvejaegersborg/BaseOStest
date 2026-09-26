import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

export type MenuItem =
  | { kind: 'separator' }
  | { kind: 'header'; label: string; mono?: boolean }
  | {
      kind?: 'item'
      label: string
      icon?: ReactNode
      hint?: string
      danger?: boolean
      disabled?: boolean
      checked?: boolean
      onSelect?: () => void
      submenu?: MenuItem[]
    }

export interface MenuState {
  x: number
  y: number
  items: MenuItem[]
}

/** Right-click / "more" menu with nested submenus, rendered in a portal
 *  and clamped to the viewport. Closes on outside click, Escape, scroll,
 *  resize or selecting an item. */
export function ContextMenu({ menu, onClose }: { menu: MenuState | null; onClose: () => void }) {
  useEffect(() => {
    if (!menu) return
    const close = () => onClose()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-context-menu]')) onClose()
    }
    window.addEventListener('mousedown', onDown, true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    window.addEventListener('blur', close)
    document.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('mousedown', onDown, true)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
      window.removeEventListener('blur', close)
      document.removeEventListener('scroll', close, true)
    }
  }, [menu, onClose])

  if (!menu) return null
  return createPortal(<MenuPanel x={menu.x} y={menu.y} items={menu.items} onClose={onClose} />, document.body)
}

function MenuPanel({
  x,
  y,
  items,
  onClose,
  anchor,
}: {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
  /** For submenus: the parent row's rect, so it can flip to the left. */
  anchor?: DOMRect
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })
  const [open, setOpen] = useState<number | null>(null)
  const [openRect, setOpenRect] = useState<DOMRect | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    let nx = x
    let ny = y
    if (nx + r.width > window.innerWidth - 8) nx = anchor ? anchor.left - r.width + 4 : window.innerWidth - r.width - 8
    if (ny + r.height > window.innerHeight - 8) ny = Math.max(8, window.innerHeight - r.height - 8)
    setPos({ x: Math.max(8, nx), y: ny })
  }, [x, y, anchor])

  return (
    <>
      <div
        ref={ref}
        data-context-menu
        role="menu"
        onContextMenu={(e) => e.preventDefault()}
        style={{ left: pos.x, top: pos.y }}
        className="fixed z-[100] min-w-[190px] max-w-[300px] rounded-panel border border-line-2 bg-panel py-1 font-read text-[13px] text-text shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
      >
        {items.map((item, i) => {
          if (item.kind === 'separator') return <div key={i} className="my-1 border-t border-line" />
          if (item.kind === 'header') {
            return (
              <div
                key={i}
                className={cn('select-text truncate px-3 py-1 text-[11px] text-dim', item.mono && 'font-mono')}
                title={item.label}
              >
                {item.label}
              </div>
            )
          }
          const hasSub = !!item.submenu?.length
          return (
            <button
              key={i}
              role="menuitem"
              disabled={item.disabled}
              onMouseEnter={(e) => {
                setOpen(hasSub ? i : null)
                setOpenRect(hasSub ? e.currentTarget.getBoundingClientRect() : null)
              }}
              onClick={(e) => {
                if (hasSub) {
                  setOpen(i)
                  setOpenRect(e.currentTarget.getBoundingClientRect())
                  return
                }
                item.onSelect?.()
                onClose()
              }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors disabled:cursor-default disabled:opacity-40',
                item.danger ? 'text-danger hover:bg-danger/10' : 'hover:bg-panel-2',
                open === i && 'bg-panel-2',
              )}
            >
              <span className="flex w-4 shrink-0 justify-center text-dim">
                {item.checked ? <Check size={13} className="text-accent" /> : item.icon}
              </span>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.hint && <span className="shrink-0 font-mono text-[10px] text-dim">{item.hint}</span>}
              {hasSub && <ChevronRight size={13} className="shrink-0 text-dim" />}
            </button>
          )
        })}
      </div>
      {open != null && openRect && (items[open] as { submenu?: MenuItem[] }).submenu && (
        <MenuPanel
          x={openRect.right - 4}
          y={openRect.top - 5}
          anchor={openRect}
          items={(items[open] as { submenu: MenuItem[] }).submenu}
          onClose={onClose}
        />
      )}
    </>
  )
}
