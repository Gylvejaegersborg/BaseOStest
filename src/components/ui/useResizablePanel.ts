import { useCallback, useEffect, useRef, useState } from 'react'

interface Options {
  /** A number, or a function when it depends on the screen (e.g. half of it). */
  defaultWidth: number | (() => number)
  min: number
  max: number | (() => number)
  /** Which edge carries the drag handle — determines whether dragging
   *  right grows or shrinks the panel (a left-rail's handle is on its
   *  right edge; a right-panel's handle is on its left edge, so the same
   *  rightward drag means the opposite size change). */
  edge: 'left' | 'right'
  /** Persisted per-viewer in localStorage — not shared state, just a
   *  remembered layout preference, same posture as every other
   *  localStorage use in this codebase. */
  storageKey: string
}

/** A plain mouse-drag resize handle — width only, no library. Returns the
 *  current width and the onMouseDown to put on the drag handle element;
 *  the rest (mousemove/mouseup while dragging) is handled here via
 *  window-level listeners so the drag keeps tracking even if the cursor
 *  leaves the handle itself.
 *
 *  System-wide primitive (design-system workspace model) — any resizable
 *  structural or summoned panel uses this, not just Workbench's rail. */
export function useResizablePanel({ defaultWidth: defaultSize, min, max: maxSize, edge, storageKey }: Options) {
  const resolve = (v: number | (() => number)) => (typeof v === 'function' ? v() : v)
  const max = resolve(maxSize)
  const [width, setWidth] = useState(() => {
    const fallback = Math.min(max, Math.max(min, resolve(defaultSize)))
    try {
      const saved = Number(window.localStorage.getItem(storageKey))
      return saved >= min && saved <= max ? saved : fallback
    } catch {
      return fallback
    }
  })
  const widthRef = useRef(width)
  widthRef.current = width
  const dragging = useRef<{ startX: number; startWidth: number } | null>(null)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = { startX: e.clientX, startWidth: widthRef.current }
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = e.clientX - dragging.current.startX
      const signed = edge === 'left' ? -delta : delta
      setWidth(Math.min(resolve(maxSize), Math.max(min, dragging.current.startWidth + signed)))
    }
    const onUp = () => {
      if (!dragging.current) return
      dragging.current = null
      try {
        window.localStorage.setItem(storageKey, String(widthRef.current))
      } catch {
        /* private window / storage disabled — resizing still works, just doesn't persist */
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edge, max, min, storageKey])

  return { width, onMouseDown }
}
