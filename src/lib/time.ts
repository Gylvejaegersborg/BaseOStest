export function clock(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour12: false })
}

export function shortDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function relTime(from: Date, to = new Date()): string {
  const s = Math.round((to.getTime() - from.getTime()) / 1000)
  const abs = Math.abs(s)
  if (abs < 60) return `${s}s ago`
  if (abs < 3600) return `${Math.round(s / 60)}m ago`
  if (abs < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}
