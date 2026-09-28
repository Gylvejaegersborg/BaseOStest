import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import {
  attachTerminal,
  closeTerminal,
  createTerminal,
  fetchTerminals,
  resizeTerminal,
  sendTerminalInput,
  type TerminalInfo,
  type TerminalProfile,
  type TerminalsState,
} from '@/features/agentos/terminalClient'
import { cn } from '@/lib/cn'

// Matches tailwind.config.ts's tokens — xterm needs literal colors.
const THEME = {
  background: '#0a0b0d',
  foreground: '#c8d2dc',
  cursor: '#c77591',
  cursorAccent: '#0a0b0d',
  selectionBackground: '#c7759155',
}

/**
 * Terminals inside the OS — Claude Code (your own subscription login) or a
 * shell, run by the agent-os gateway (gateway/terminal.ts) and shown here
 * with xterm.js. The gateway owns the processes, so closing this panel or
 * reloading leaves them running; reopening re-attaches with the scrollback.
 * Claude Code starts in BaseOStest's checkout, so it can work on the OS
 * itself.
 */
export function TerminalTab() {
  const [state, setState] = useState<TerminalsState | null>(null)
  const [error, setError] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const s = await fetchTerminals()
      setState(s)
      setError('')
      setActiveId((cur) => (cur && s.terminals.some((t) => t.id === cur) ? cur : (s.terminals[s.terminals.length - 1]?.id ?? null)))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const open = async (profile: TerminalProfile) => {
    setBusy(true)
    try {
      const t = await createTerminal(profile, 100, 30)
      setState((s) => (s ? { ...s, terminals: [...s.terminals, t] } : s))
      setActiveId(t.id)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const close = async (id: string) => {
    await closeTerminal(id).catch(() => {})
    await refresh()
  }

  const markExited = useCallback((id: string, code: number) => {
    setState((s) => (s ? { ...s, terminals: s.terminals.map((t) => (t.id === id ? { ...t, exitCode: code } : t)) } : s))
  }, [])

  if (error && !state) {
    return <p className="p-3 text-xs text-dim">Can&apos;t reach the Agent-OS gateway ({error}).</p>
  }
  if (!state) return <p className="p-3 text-xs text-dim">Loading…</p>
  if (!state.enabled) {
    return (
      <div className="space-y-2 p-3 text-xs text-dim">
        <p>Terminals are off on this gateway.</p>
        <p>
          Start it with <code className="text-text">AGENT_OS_TERMINAL=1</code> (a Codespace does this automatically). A
          terminal is a full shell as the gateway&apos;s user, so only turn it on where the gateway is reachable by you
          alone.
        </p>
      </div>
    )
  }

  const active = state.terminals.find((t) => t.id === activeId) ?? null

  return (
    <div className="flex h-full min-h-[60vh] flex-col lg:min-h-0">
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1.5">
        {state.terminals.map((t) => (
          <span
            key={t.id}
            className={cn(
              'flex items-center gap-1 border px-2 py-0.5 text-[11px]',
              t.id === activeId ? 'border-accent/50 bg-accent/10 text-text' : 'border-line text-dim hover:text-text',
            )}
          >
            <button onClick={() => setActiveId(t.id)} title={t.cwd}>
              {t.title}
              {t.exitCode !== undefined && ' (exited)'}
            </button>
            <button onClick={() => void close(t.id)} className="text-dim hover:text-danger" title="Close (ends the process)">
              <X size={11} />
            </button>
          </span>
        ))}
        <button
          onClick={() => void open('claude')}
          disabled={busy}
          className="flex items-center gap-1 border border-line px-2 py-0.5 text-[11px] text-dim hover:border-accent/50 hover:text-text disabled:opacity-40"
        >
          <Plus size={11} /> Claude Code
        </button>
        <button
          onClick={() => void open('shell')}
          disabled={busy}
          className="flex items-center gap-1 border border-line px-2 py-0.5 text-[11px] text-dim hover:border-accent/50 hover:text-text disabled:opacity-40"
        >
          <Plus size={11} /> Shell
        </button>
      </div>
      {error && <p className="border-b border-danger/40 bg-danger/10 px-2 py-1 text-[11px] text-danger">{error}</p>}
      {active ? (
        <TerminalView key={active.id} terminal={active} resizable={state.backend === 'node-pty'} onExit={markExited} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 p-4 text-center text-xs text-dim">
          <p>Start Claude Code or a shell above.</p>
          <p>
            Claude Code uses its own login — the first time, pick a theme and run <code className="text-text">/login</code>.
            After that, agents set to &ldquo;Claude — your subscription&rdquo; can use it too.
          </p>
        </div>
      )}
    </div>
  )
}

function TerminalView({
  terminal,
  resizable,
  onExit,
}: {
  terminal: TerminalInfo
  resizable: boolean
  onExit: (id: string, code: number) => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const term = new Terminal({
      theme: THEME,
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      fontSize: 12,
      cursorBlink: true,
      scrollback: 5000,
      // Without live resizing (the gateway's `script` fallback), keep the
      // size the process was started with.
      ...(resizable ? {} : { cols: terminal.cols, rows: terminal.rows }),
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(host)

    // Keystrokes are batched briefly and sent in order — one POST per
    // keystroke would reorder under load.
    let pending = ''
    let flushTimer: ReturnType<typeof setTimeout> | undefined
    let chain = Promise.resolve()
    const flush = () => {
      const data = pending
      pending = ''
      if (!data) return
      chain = chain.then(() => sendTerminalInput(terminal.id, data).then(() => undefined, () => undefined))
    }
    const inputSub = term.onData((d) => {
      pending += d
      clearTimeout(flushTimer)
      flushTimer = setTimeout(flush, 12)
    })

    let resizeTimer: ReturnType<typeof setTimeout> | undefined
    let disposed = false
    const doFit = () => {
      if (disposed || !resizable || !host.clientWidth || !host.clientHeight) return
      try {
        fit.fit()
      } catch {
        // xterm's renderer isn't measurable yet (or is mid-teardown) — the
        // next ResizeObserver tick fits it.
        return
      }
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => void resizeTerminal(terminal.id, term.cols, term.rows).catch(() => {}), 150)
    }
    // First fit on the next frame: right after open() the renderer has no
    // measured cell size yet.
    const firstFit = requestAnimationFrame(doFit)
    const observer = new ResizeObserver(doFit)
    observer.observe(host)

    const detach = attachTerminal(
      terminal.id,
      (data, replay) => {
        if (replay) term.reset()
        term.write(data)
      },
      (code) => {
        term.write(`\r\n\x1b[2m[process exited with code ${code}]\x1b[0m\r\n`)
        onExit(terminal.id, code)
      },
    )
    term.focus()

    return () => {
      disposed = true
      cancelAnimationFrame(firstFit)
      detach()
      observer.disconnect()
      clearTimeout(flushTimer)
      clearTimeout(resizeTimer)
      flush()
      inputSub.dispose()
      term.dispose()
    }
  }, [terminal.id, terminal.cols, terminal.rows, resizable, onExit])

  return <div ref={hostRef} className="min-h-0 flex-1 overflow-hidden bg-bg p-1" />
}
