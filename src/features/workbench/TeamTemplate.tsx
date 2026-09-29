import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { exportTeamTemplate, importTeamTemplate, type AgentOsTeamImportPlan } from '@/features/agentos/client'
import { useAgentOsContext } from '@/features/agentos/AgentOsProvider'

/**
 * The team as files (agent-os's team-template.ts): Export downloads one
 * markdown bundle — TEAM.md, a file per agent (persona, manager, model,
 * budget) and the skills, secrets stripped. Import shows exactly what would
 * change first; applying makes the listed agents match (each change is a
 * config revision, so it can be undone per agent) and deletes nothing.
 */
export function TeamTemplate() {
  const { refreshAgents } = useAgentOsContext()
  const fileRef = useRef<HTMLInputElement>(null)
  const [bundle, setBundle] = useState<string | null>(null)
  const [plan, setPlan] = useState<AgentOsTeamImportPlan | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const download = async () => {
    setError('')
    try {
      const { bundle } = await exportTeamTemplate()
      const url = URL.createObjectURL(new Blob([bundle], { type: 'text/markdown' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `isark-team-${new Date().toISOString().slice(0, 10)}.md`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const pick = async (file: File) => {
    setError('')
    setBusy(true)
    try {
      const text = await file.text()
      setBundle(text)
      setPlan(await importTeamTemplate(text, false))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const apply = async () => {
    if (!bundle) return
    setBusy(true)
    try {
      const done = await importTeamTemplate(bundle, true)
      setPlan(done)
      if (done.applied) refreshAgents()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const changes = plan ? plan.create.length + plan.update.length + plan.skills.add.length + plan.skills.update.length : 0
  return (
    <div className="border-b border-line px-3 py-2.5 text-[11px]">
      <div className="flex items-center gap-2">
        <span className="label flex-1">Team as files</span>
        <button onClick={() => void download()} className="flex items-center gap-1 border border-line px-2 py-0.5 text-dim hover:text-text">
          <Download size={11} /> Export
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={busy} className="flex items-center gap-1 border border-line px-2 py-0.5 text-dim hover:text-text disabled:opacity-50">
          <Upload size={11} /> Import…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".md,text/markdown"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void pick(f)
            e.target.value = ''
          }}
        />
      </div>
      {error && <p className="mt-1.5 text-danger">{error}</p>}
      {plan && (
        <div className="mt-2 space-y-1 border-l-2 border-accent/40 pl-2">
          {plan.applied && <p className="text-[#46d369]">Applied. Each agent's changes are in its History, restorable.</p>}
          {plan.problems.map((p) => (
            <p key={p} className="text-danger">{p}</p>
          ))}
          {plan.create.length > 0 && <p className="text-text/85">New agents: {plan.create.join(', ')}</p>}
          {plan.update.map((u) => (
            <p key={u.id} className="text-text/85">
              {u.id}: {u.fields.join(', ')}
            </p>
          ))}
          {(plan.skills.add.length > 0 || plan.skills.update.length > 0) && (
            <p className="text-text/85">Skills: {[...plan.skills.add.map((s) => `+${s}`), ...plan.skills.update].join(', ')}</p>
          )}
          {plan.unchanged.length > 0 && <p className="text-dim">Unchanged: {plan.unchanged.join(', ')}</p>}
          {!plan.applied && !plan.problems.length && (
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => void apply()} disabled={busy || !changes} className="border border-accent/40 bg-accent/10 px-2 py-0.5 uppercase tracking-wider text-accent hover:bg-accent/20 disabled:opacity-40">
                {changes ? `Apply ${changes} change${changes === 1 ? '' : 's'}` : 'Nothing to change'}
              </button>
              <button onClick={() => setPlan(null)} className="text-dim hover:text-text">
                Cancel
              </button>
            </div>
          )}
          {!plan.applied && plan.problems.length > 0 && <p className="text-dim">Nothing was changed. Fix the file and import it again.</p>}
        </div>
      )}
    </div>
  )
}
