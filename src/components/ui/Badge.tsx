import type { ReactNode } from 'react'

export function Badge({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] uppercase tracking-wider"
      style={{
        color: color ?? '#6b7785',
        borderColor: `${color ?? '#6b7785'}55`,
        backgroundColor: `${color ?? '#6b7785'}11`,
      }}
    >
      {children}
    </span>
  )
}
