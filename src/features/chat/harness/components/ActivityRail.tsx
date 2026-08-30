import { useHarness } from '../state/harnessStore'

export function ActivityRail() {
  const { state } = useHarness()
  const succeeded = state.tasks.filter((t) => t.status === 'succeeded').length
  const total = state.tasks.length

  return (
    <div className="space-y-2 p-3">
      <div className="text-[10px] uppercase tracking-wider text-dim">Activity</div>
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="rounded border border-line bg-panel-2 px-2 py-1.5">
          <div className="text-dim">Tasks done</div>
          <div className="text-sm text-text">
            {succeeded}/{total}
          </div>
        </div>
        <div className="rounded border border-line bg-panel-2 px-2 py-1.5">
          <div className="text-dim">Automations</div>
          <div className="text-sm text-text">{state.automations.filter((a) => a.enabled).length} active</div>
        </div>
      </div>
      <div className="text-[9px] italic text-dim">Live tokens/latency wire up once the Gateway is connected (Phase 6).</div>
    </div>
  )
}
