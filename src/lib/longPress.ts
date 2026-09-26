// Touch long-press acts as right-click everywhere in BaseSpace: holding a
// finger still for ~500ms dispatches a `contextmenu` event at that spot, so
// every existing right-click menu (explorer, canvas, tables, projects…)
// works on phones. Android already fires a native contextmenu on long-press;
// when it does, ours is skipped so the menu never opens twice.

const HOLD_MS = 500
const MOVE_TOLERANCE = 10

let installed = false

export function installLongPress() {
  if (installed || typeof window === 'undefined') return
  installed = true

  let timer: number | null = null
  let start: { x: number; y: number; target: EventTarget | null } | null = null
  let nativeFired = false
  let suppressClick = false

  const cancel = () => {
    if (timer != null) window.clearTimeout(timer)
    timer = null
    start = null
  }

  window.addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType !== 'touch' || !e.isPrimary) return
      cancel()
      nativeFired = false
      start = { x: e.clientX, y: e.clientY, target: e.target }
      timer = window.setTimeout(() => {
        timer = null
        if (nativeFired || !start?.target) return
        const el = start.target as Element
        suppressClick = true
        window.setTimeout(() => (suppressClick = false), 800)
        el.dispatchEvent(
          new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: start.x, clientY: start.y, button: 2 }),
        )
        navigator.vibrate?.(10)
      }, HOLD_MS)
    },
    { capture: true, passive: true },
  )
  window.addEventListener(
    'pointermove',
    (e) => {
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_TOLERANCE) cancel()
    },
    { capture: true, passive: true },
  )
  window.addEventListener('pointerup', cancel, { capture: true, passive: true })
  window.addEventListener('pointercancel', cancel, { capture: true, passive: true })
  window.addEventListener(
    'contextmenu',
    (e) => {
      if (e.isTrusted) {
        nativeFired = true
        if (timer != null) cancel()
      }
    },
    { capture: true },
  )
  // The finger lifting after a long-press shouldn't also "click" the item.
  window.addEventListener(
    'click',
    (e) => {
      if (!suppressClick) return
      suppressClick = false
      e.stopPropagation()
      e.preventDefault()
    },
    { capture: true },
  )
}
