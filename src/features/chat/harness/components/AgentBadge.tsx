import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/lib/cn'
import type { AgentRuntime } from '../types'

const STATUS_LABEL: Record<AgentRuntime['status'], string> = {
  idle: 'IDLE',
  thinking: 'THINKING',
  working: 'WORKING',
  waiting: 'WAITING',
  blocked: 'BLOCKED',
  completed: 'DONE',
  error: 'ERROR',
}

const STATUS_COLOR: Record<AgentRuntime['status'], string> = {
  idle: '#6b7785',
  thinking: '#f0a020',
  working: '#46d369',
  waiting: '#e0408a',
  blocked: '#ff5566',
  completed: '#36e0c8',
  error: '#ff5566',
}

export function AgentBadge({ agent, compact = false }: { agent: AgentRuntime; compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2', compact ? 'text-[10px]' : 'text-xs')}>
      <StatusDot color={agent.color} pulse={agent.status === 'working' || agent.status === 'thinking'} size={compact ? 6 : 7} />
      <span className="font-medium" style={{ color: agent.color }}>
        {agent.name}
      </span>
      {!compact && (
        <span className="flex items-center gap-1 text-dim">
          <StatusDot color={STATUS_COLOR[agent.status]} size={5} />
          {STATUS_LABEL[agent.status]}
        </span>
      )}
    </div>
  )
}
