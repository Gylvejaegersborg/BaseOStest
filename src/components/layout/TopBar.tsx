import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { SECTIONS } from '@/data/sections'
import { isRealAgent } from '@/data/agents'
import { useAgentOsContext } from '@/features/agentos/AgentOsProvider'
import { StatusDot } from '@/components/ui/StatusDot'
import { clock, shortDate } from '@/lib/time'
import { NotificationBell } from './NotificationBell'

export function TopBar() {
  const [now, setNow] = useState(new Date())
  const location = useLocation()
  const { agents } = useAgentOsContext()

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const section =
    SECTIONS.find((s) => (s.route === '/' ? location.pathname === '/' : location.pathname.startsWith(s.route))) ??
    SECTIONS[0]
  const online = agents.filter((a) => isRealAgent(a) && a.status !== 'offline').length

  return (
    <header className="flex h-11 items-center justify-between border-b border-line bg-panel/60 px-4 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-[10px] tracking-widest text-dim">{section.code}</span>
        <span className="font-display uppercase tracking-wider" style={{ color: section.accent }}>
          {section.label}
        </span>
        <span className="text-dim">/ {section.blurb}</span>
      </div>
      <div className="flex items-center gap-5 text-dim">
        <span className="flex items-center gap-1.5">
          <StatusDot color="#46d369" pulse size={7} />
          {online} agents online
        </span>
        <span className="hidden sm:inline">{shortDate(now)}</span>
        <span className="flex items-center gap-2">
          <NotificationBell />
          <span className="tabular-nums text-text">{clock(now)}</span>
        </span>
      </div>
    </header>
  )
}
