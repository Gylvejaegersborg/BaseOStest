import { StatusDot } from '@/components/ui/StatusDot'
import { useAgentOsContext } from '@/features/agentos/AgentOsProvider'

const CONNECTION_LABEL: Record<string, string> = {
  live: 'AGENT-OS LIVE',
  connecting: 'CONNECTING TO AGENT-OS…',
  error: 'AGENT-OS UNREACHABLE · MOCK DATA',
  mock: 'MOCK DATA · NO BACKEND',
}

export function StatusBar() {
  const { agents, connection } = useAgentOsContext()
  const names = agents
    .slice(0, 3)
    .map((a) => a.name.toLowerCase())
    .join(' · ')

  return (
    <footer className="flex h-6 items-center justify-between border-t border-line bg-panel/60 px-4 text-[10px] tracking-wider text-dim">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <StatusDot color={connection === 'live' ? '#46d369' : '#c77591'} size={6} /> SYSTEM NOMINAL
        </span>
        <span className="hidden sm:inline">{CONNECTION_LABEL[connection] ?? CONNECTION_LABEL.mock}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden md:inline">{names}</span>
        <span>PERSONAL.OS</span>
      </div>
    </footer>
  )
}
