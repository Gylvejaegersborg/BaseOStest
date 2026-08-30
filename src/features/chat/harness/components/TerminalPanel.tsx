import { TerminalSquare } from 'lucide-react'

/** Placeholder panel — real PTY (xterm.js + node-pty) lands in Phase 9.
 *  Per plan §43-46: this must be a genuine PTY, not a fake terminal — so
 *  rather than fake an interactive shell here, this honestly states what
 *  it is. */
export function TerminalPanel() {
  return (
    <div className="flex h-full flex-col bg-bg font-mono text-xs text-dim">
      <div className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-[10px] uppercase tracking-wider">
        <TerminalSquare size={12} />
        Terminal
      </div>
      <div className="flex flex-1 items-center justify-center">
        <span className="italic">Real PTY (xterm.js + node-pty) — not wired yet. Lands in Phase 9.</span>
      </div>
    </div>
  )
}
