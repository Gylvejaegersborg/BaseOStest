import { useEffect, useState } from 'react'

/** TEMPORARY — measures the exact gap between Day view's agenda region and
 *  the aside panels below it, plus the wrapper's own sizing, since the
 *  general overflow debugger already did its job and this needs something
 *  more targeted. Gate: `?debug=gap` in the URL. Remove once resolved. */
export function GapDebugger() {
  const [report, setReport] = useState<string | null>(null)

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('debug')) return

    const measure = () => {
      const wrapper = document.querySelector('[data-cal-grid-wrapper]')
      const dayViewRoot = document.querySelector('[data-cal-dayview-root]')
      const aside = document.querySelector('[data-cal-aside]')
      const wr = wrapper?.getBoundingClientRect()
      const dr = dayViewRoot?.getBoundingClientRect()
      const ar = aside?.getBoundingClientRect()
      const lines = [
        `wrapper: h=${wr ? Math.round(wr.height) : '?'} bottom=${wr ? Math.round(wr.bottom) : '?'}`,
        `  computed height=${wrapper ? getComputedStyle(wrapper).height : '?'} maxHeight=${wrapper ? getComputedStyle(wrapper).maxHeight : '?'}`,
        `dayViewRoot: h=${dr ? Math.round(dr.height) : '?'} bottom=${dr ? Math.round(dr.bottom) : '?'} scrollH=${dayViewRoot ? (dayViewRoot as HTMLElement).scrollHeight : '?'}`,
        `aside: top=${ar ? Math.round(ar.top) : '?'}`,
        `GAP (aside.top - wrapper.bottom) = ${ar && wr ? Math.round(ar.top - wr.bottom) : '?'}`,
        `window: h=${window.innerHeight} w=${window.innerWidth}`,
      ]
      setReport(lines.join('\n'))
    }

    measure()
    const id = window.setInterval(measure, 1000)
    return () => window.clearInterval(id)
  }, [])

  if (!report) return null

  return (
    <pre className="fixed inset-x-2 bottom-16 z-[999] whitespace-pre-wrap border border-danger bg-black/95 p-2 text-[10px] leading-tight text-neon-green">
      {report}
    </pre>
  )
}
