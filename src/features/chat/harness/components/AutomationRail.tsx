import { StatusDot } from '@/components/ui/StatusDot'
import { useHarness } from '../state/harnessStore'
import type { Automation } from '../protocol'

function triggerLabel(automation: Automation): string {
  if (automation.trigger.kind === 'cron') return automation.trigger.expr
  if (automation.trigger.kind === 'event') return `on ${automation.trigger.eventType}`
  return `webhook ${automation.trigger.path}`
}

export function AutomationRail() {
  const { state } = useHarness()
  return (
    <div className="space-y-2 p-3">
      <div className="text-[10px] uppercase tracking-wider text-dim">Automations</div>
      <div className="space-y-1.5">
        {state.automations.map((automation) => (
          <div key={automation.id} className="rounded border border-line bg-panel-2 px-2.5 py-2 text-[10px]">
            <div className="flex items-center gap-1.5">
              <StatusDot color={automation.enabled ? '#46d369' : '#6b7785'} size={6} />
              <span className="truncate text-text">{automation.promptTemplate}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-dim">
              <span>{automation.agentId}</span>
              <span className="font-mono">{triggerLabel(automation)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
