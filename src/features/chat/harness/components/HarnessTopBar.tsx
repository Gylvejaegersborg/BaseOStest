import { HardDrive, Mic, Radio } from 'lucide-react'
import { StatusDot } from '@/components/ui/StatusDot'
import { useHarness } from '../state/harnessStore'

const CONNECTION_LABEL: Record<string, string> = {
  connecting: 'CONNECTING',
  connected: 'CONNECTED',
  reconnecting: 'RECONNECTING',
  disconnected: 'DISCONNECTED',
  error: 'ERROR',
}

const CONNECTION_COLOR: Record<string, string> = {
  connecting: '#f0a020',
  connected: '#46d369',
  reconnecting: '#f0a020',
  disconnected: '#6b7785',
  error: '#ff5566',
}

export function HarnessTopBar() {
  const { state } = useHarness()
  const activeAgent = state.agents.find((a) => a.id === state.activeAgentId)
  const runningTasks = state.tasks.filter((t) => t.status === 'running' || t.status === 'queued').length
  const activeAgents = state.agents.filter((a) => a.status !== 'idle').length

  return (
    <div className="flex h-9 shrink-0 items-center justify-between border-b border-line bg-panel/60 px-3 text-[11px]">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-dim">
          <StatusDot color={CONNECTION_COLOR[state.connection]} pulse={state.connection === 'reconnecting'} size={6} />
          {CONNECTION_LABEL[state.connection]}
        </span>
        {activeAgent && (
          <span className="flex items-center gap-1.5">
            <span className="text-dim">Agent</span>
            <span className="font-medium" style={{ color: activeAgent.color }}>
              {activeAgent.name}
            </span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-dim">
        <span className="flex items-center gap-1">
          <span className="text-text">{runningTasks}</span> tasks
        </span>
        <span className="flex items-center gap-1">
          <span className="text-text">{activeAgents}</span> agents
        </span>
        <button
          type="button"
          title="Voice (not wired yet — Phase 15)"
          disabled
          className="flex items-center gap-1 rounded px-1.5 py-0.5 opacity-40"
        >
          <Mic size={13} />
        </button>
        <button
          type="button"
          title="HUD (desktop-only — Phase 16)"
          disabled
          className="flex items-center gap-1 rounded px-1.5 py-0.5 opacity-40"
        >
          <Radio size={13} />
        </button>
        <button
          type="button"
          title="Terminal PTY not wired yet — Phase 9"
          disabled
          className="flex items-center gap-1 rounded px-1.5 py-0.5 opacity-40"
        >
          <HardDrive size={13} />
        </button>
      </div>
    </div>
  )
}
