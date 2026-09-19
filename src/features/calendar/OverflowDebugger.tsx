import { useEffect, useState } from 'react'

interface OffscreenEl {
  tag: string
  cls: string
  left: number
  right: number
  width: number
  position: string
  text: string
}

/** TEMPORARY diagnostic — not part of the feature, remove once the real-device
 *  horizontal-overflow report is tracked down. A headless-browser width sweep
 *  found nothing, so this runs the same "what's rendered past the viewport
 *  edge" scan live on the reporter's own device instead, as plain on-screen
 *  text they can screenshot back. Gate: append `?debug=overflow` to the URL. */
export function OverflowDebugger() {
  const [report, setReport] = useState<{ vw: number; els: OffscreenEl[] } | null>(null)

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('debug')) return

    const scan = () => {
      const vw = window.innerWidth
      const els = Array.from(document.querySelectorAll<HTMLElement>('*'))
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && (r.right > vw + 2 || r.left < -2))
        .map(({ el, r }) => ({
          tag: el.tagName,
          cls: (typeof el.className === 'string' ? el.className : '').slice(0, 80),
          left: Math.round(r.left),
          right: Math.round(r.right),
          width: Math.round(r.width),
          position: getComputedStyle(el).position,
          text: (el.textContent || '').trim().slice(0, 30),
        }))
        .sort((a, b) => b.right - a.right)
        .slice(0, 8)
      setReport({ vw, els })
    }

    scan()
    const id = window.setInterval(scan, 1000)
    return () => window.clearInterval(id)
  }, [])

  if (!report) return null

  return (
    <div className="fixed inset-x-2 bottom-16 z-[999] max-h-[60vh] overflow-y-auto border border-danger bg-black/95 p-2 text-[9px] leading-tight text-neon-green">
      <div className="mb-1 text-danger">viewport width: {report.vw}px · {report.els.length} offscreen</div>
      {report.els.length === 0 ? (
        <div>nothing offscreen right now</div>
      ) : (
        report.els.map((e, i) => (
          <div key={i} className="mb-1 border-b border-line/40 pb-1">
            {e.tag} [{e.position}] left={e.left} right={e.right} w={e.width}
            <br />
            class: {e.cls || '(none)'}
            <br />
            text: {e.text}
          </div>
        ))
      )}
    </div>
  )
}
