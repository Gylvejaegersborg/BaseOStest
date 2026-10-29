import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { fetchConnectors, setConnectorEnabled, type Connector } from '@/features/agentos/client'
import { cn } from '@/lib/cn'

const STATUS: Record<Connector['status'], { label: string; color: string }> = {
  connected: { label: 'connected', color: '#46d369' },
  'needs-auth': { label: 'needs sign-in', color: '#f0a020' },
  failed: { label: 'not reachable', color: '#ff5566' },
}

/** The MCP connectors your agents can reach through the Claude CLI: the ones on your Claude account and any local
 *  servers. The list follows your account (the gateway re-reads it every few minutes). Switch one off and agents
 *  can't use it. */
export function ConnectorsPanel() {
  const [connectors, setConnectors] = useState<Connector[] | null>(null)
  const [refreshedAt, setRefreshedAt] = useState<string | undefined>()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async (refresh = false) => {
    setBusy(refresh ? '*' : null)
    try {
      const r = await fetchConnectors(refresh)
      setConnectors(r.connectors)
      setRefreshedAt(r.refreshedAt)
      setError('')
    } catch (e) {
      setError((e as Error)?.message ?? 'Could not load connectors')
    } finally {
      setBusy(null)
    }
  }, [])

  useEffect(() => {
    void load(false)
  }, [load])

  const toggle = async (c: Connector) => {
    // Flip at once, and put it back if the gateway refuses.
    const next = !c.enabled
    const apply = (enabled: boolean) => setConnectors((list) => (list ?? []).map((x) => (x.name === c.name ? { ...x, enabled } : x)))
    apply(next)
    setBusy(c.name)
    try {
      await setConnectorEnabled(c.name, next)
      setError('')
    } catch (e) {
      apply(c.enabled)
      setError((e as Error)?.message ?? 'Could not change it')
    } finally {
      setBusy(null)
    }
  }

  const account = (connectors ?? []).filter((c) => c.kind === 'account')
  const local = (connectors ?? []).filter((c) => c.kind === 'local')

  const row = (c: Connector) => (
    <li key={c.name} className="flex items-center gap-3 px-3 py-2 text-xs">
      <input
        type="checkbox"
        checked={c.enabled}
        disabled={c.status !== 'connected'}
        onChange={() => void toggle(c)}
        aria-label={`Let agents use ${c.name}`}
        className="size-3.5 accent-accent disabled:opacity-40"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-text/90">{c.name.replace(/^claude\.ai /i, '')}</span>
        <span className="block truncate text-[10px] text-dim">{c.target}</span>
      </span>
      <span className="shrink-0 text-[10px] uppercase tracking-wider" style={{ color: STATUS[c.status].color }}>
        {STATUS[c.status].label}
      </span>
    </li>
  )

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-dim">
        Connectors your agents can use through the Claude CLI. The list follows your Claude account: add one there and it shows up here within a few
        minutes (or press Refresh). Tick one to let agents use it. Only connected ones can be ticked.
      </p>
      <p className="border border-line bg-panel-2/40 px-2.5 py-2 text-[11px] leading-relaxed text-dim">
        <span className="text-text/80">How agents use them:</span> through a <code>connector</code> tool. Each use is one short, separate request to that one
        connector, so it shows in the event log and the flow report, and the connector's tools are only loaded when it is used (not on every step of every run).
        Any agent can use them, Haiku included. What it can't do: tell a read from a write inside a connector, or hold a single call for your approval. Things
        that send messages as you (Discord, Telegram) are therefore <span className="text-text/80">off by default</span>. Turn one on only if you're fine with
        agents using it without asking.
      </p>
      {error && <p className="border border-danger/40 bg-danger/10 p-2 text-xs text-danger">{error}</p>}
      <div className="flex items-center justify-between">
        <span className="label">On your account</span>
        <button
          onClick={() => void load(true)}
          disabled={busy === '*'}
          className="flex items-center gap-1.5 border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-text/80 hover:bg-panel-2 disabled:opacity-50"
        >
          <RefreshCw size={11} className={cn(busy === '*' && 'animate-spin')} /> {busy === '*' ? 'Reading…' : 'Refresh'}
        </button>
      </div>
      {connectors === null ? (
        <p className="text-xs text-dim">Loading…</p>
      ) : (
        <>
          <ul className="divide-y divide-line border border-line">
            {account.length ? account.map(row) : <li className="px-3 py-2 text-[11px] text-dim">No connectors found on the account.</li>}
          </ul>
          {local.length > 0 && (
            <>
              <span className="label block">Local servers</span>
              <ul className="divide-y divide-line border border-line">{local.map(row)}</ul>
            </>
          )}
          <p className="text-[10px] text-dim">{refreshedAt ? `Last read ${new Date(refreshedAt).toLocaleTimeString()}.` : 'Not read yet.'}</p>
        </>
      )}
    </div>
  )
}
