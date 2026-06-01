import { lazy, Suspense, useState } from 'react'
import { ExternalLink, Play, TerminalSquare, Hammer, Rocket, Activity, Store, Database, Bot, Smartphone } from 'lucide-react'
import { LAB_MODULES, type LabModule } from '@/data/labs'
import { Panel } from '@/components/ui/Panel'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { StatusDot } from '@/components/ui/StatusDot'
import { useIsDesktop } from '@/lib/useMediaQuery'
import { cn } from '@/lib/cn'

const BeatStorePage = lazy(() =>
  import('@/features/beatstore/BeatStorePage').then((m) => ({ default: m.BeatStorePage })),
)
const BeatDBPage = lazy(() =>
  import('@/features/beatdb/BeatDBPage').then((m) => ({ default: m.BeatDBPage })),
)
const DiscordDashPage = lazy(() =>
  import('@/features/discorddash/DiscordDashPage').then((m) => ({ default: m.DiscordDashPage })),
)
const SudokuPage = lazy(() =>
  import('@/pages/Sudoku').then((m) => ({ default: m.Sudoku })),
)
const ShortcutsLabPage = lazy(() =>
  import('@/features/shortcutslab/ShortcutsLabPage').then((m) => ({ default: m.ShortcutsLabPage })),
)

const STATUS_COLOR = { live: '#46d369', staging: '#f0a020', local: '#36e0c8' } as const

export function Lab() {
  const [selectedId, setSelectedId] = useState(LAB_MODULES[0].id)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [storeOpen, setStoreOpen] = useState(false)
  const [dbOpen, setDbOpen] = useState(false)
  const [discordOpen, setDiscordOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const isDesktop = useIsDesktop()
  const selected = LAB_MODULES.find((m) => m.id === selectedId)!

  const openModule = (id: string) => {
    setSelectedId(id)
    if (!isDesktop) setMobileOpen(true)
  }

  const isSudoku = selected.id === 'sudoku'

  return (
    <div className="flex h-full">
      {/* When Sudoku is open on desktop, shrink the grid to a sidebar */}
      <div className={cn('min-w-0 overflow-y-auto p-4 sm:p-6', isSudoku && isDesktop ? 'w-[260px] shrink-0 border-r border-line' : 'flex-1')}>
        <div className="mb-5">
          <h1 className="font-display text-2xl tracking-wider text-text">LAB</h1>
          <p className="text-xs text-dim">Pages and apps you have built. Preview, launch and poke them.</p>
        </div>
        <div className={cn('grid gap-3', isSudoku && isDesktop ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3')}>
          {LAB_MODULES.map((m) => (
            <ModuleCard key={m.id} mod={m} active={m.id === selectedId} onClick={() => openModule(m.id)} />
          ))}
        </div>
      </div>

      {/* Desktop: Sudoku fills remaining space */}
      {isSudoku && isDesktop && (
        <div className="flex min-w-0 flex-1 overflow-hidden">
          <Suspense fallback={<div className="flex h-full w-full items-center justify-center text-xs text-dim">Loading…</div>}>
            <SudokuPage />
          </Suspense>
        </div>
      )}

      {/* Desktop: persistent detail rail (non-Sudoku) */}
      {!isSudoku && (
        <aside className="hidden w-[380px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-line bg-panel/30 p-3 lg:flex">
          <ModuleDetail
            mod={selected}
            onOpenStore={() => setStoreOpen(true)}
            onOpenDB={() => setDbOpen(true)}
            onOpenDiscord={() => setDiscordOpen(true)}
            onOpenShortcuts={() => setShortcutsOpen(true)}
          />
        </aside>
      )}

      {/* Mobile: detail opens in a modal */}
      <Modal
        open={mobileOpen && !isDesktop}
        onClose={() => setMobileOpen(false)}
        title={selected.name}
        code={selected.kind}
        accent={STATUS_COLOR[selected.status]}
        width={isSudoku ? 800 : 520}
      >
        {isSudoku ? (
          <div className="h-[70vh] overflow-auto">
            <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-dim">Loading…</div>}>
              <SudokuPage />
            </Suspense>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <ModuleDetail
              mod={selected}
              embedded
              onOpenStore={() => setStoreOpen(true)}
              onOpenDB={() => setDbOpen(true)}
              onOpenDiscord={() => setDiscordOpen(true)}
              onOpenShortcuts={() => setShortcutsOpen(true)}
            />
          </div>
        )}
      </Modal>

      {storeOpen && (
        <Suspense fallback={null}>
          <BeatStorePage open onClose={() => setStoreOpen(false)} />
        </Suspense>
      )}

      {dbOpen && (
        <Suspense fallback={null}>
          <BeatDBPage open onClose={() => setDbOpen(false)} />
        </Suspense>
      )}

      {discordOpen && (
        <Suspense fallback={null}>
          <DiscordDashPage open onClose={() => setDiscordOpen(false)} />
        </Suspense>
      )}

      {shortcutsOpen && (
        <Suspense fallback={null}>
          <ShortcutsLabPage open onClose={() => setShortcutsOpen(false)} />
        </Suspense>
      )}
    </div>
  )
}

function ModuleDetail({
  mod,
  embedded,
  onOpenStore,
  onOpenDB,
  onOpenDiscord,
  onOpenShortcuts,
}: {
  mod: LabModule
  embedded?: boolean
  onOpenStore?: () => void
  onOpenDB?: () => void
  onOpenDiscord?: () => void
  onOpenShortcuts?: () => void
}) {
  return (
    <>
      <Panel title={embedded ? undefined : mod.name} code={embedded ? undefined : mod.kind} accent={STATUS_COLOR[mod.status]}>
        <PreviewFrame mod={mod} />
        <p className="mt-3 text-xs text-text/85">{mod.description}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {mod.stack.map((s) => (
            <Badge key={s} color="#6b7785">
              {s}
            </Badge>
          ))}
        </div>
        {mod.id === 'beat-store' && onOpenStore && (
          <button
            onClick={onOpenStore}
            className="mt-3 flex w-full items-center justify-center gap-2 border border-accent/50 bg-accent/10 py-2 text-xs uppercase tracking-wider text-accent transition-colors hover:bg-accent/20"
          >
            Open Beat Store <Store size={13} />
          </button>
        )}
        {mod.id === 'beat-db' && onOpenDB && (
          <button
            onClick={onOpenDB}
            className="mt-3 flex w-full items-center justify-center gap-2 border border-accent/50 bg-accent/10 py-2 text-xs uppercase tracking-wider text-accent transition-colors hover:bg-accent/20"
          >
            Open Beat DB <Database size={13} />
          </button>
        )}
        {mod.id === 'discord-dash' && onOpenDiscord && (
          <button
            onClick={onOpenDiscord}
            className="mt-3 flex w-full items-center justify-center gap-2 border border-accent/50 bg-accent/10 py-2 text-xs uppercase tracking-wider text-accent transition-colors hover:bg-accent/20"
          >
            Open Dashboard <Bot size={13} />
          </button>
        )}
        {mod.id === 'shortcuts-lab' && onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="mt-3 flex w-full items-center justify-center gap-2 border border-accent/50 bg-accent/10 py-2 text-xs uppercase tracking-wider text-accent transition-colors hover:bg-accent/20"
          >
            Open Shortcuts Lab <Smartphone size={13} />
          </button>
        )}
        {mod.url && (
          <a
            href={mod.url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center justify-center gap-2 border border-line py-2 text-xs uppercase tracking-wider text-accent hover:border-accent/60"
          >
            Launch <ExternalLink size={13} />
          </a>
        )}
      </Panel>

      <TestConsole key={mod.id} mod={mod} />
    </>
  )
}

function ModuleCard({ mod, active, onClick }: { mod: LabModule; active: boolean; onClick: () => void }) {
  const color = STATUS_COLOR[mod.status]
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex flex-col border bg-panel/70 text-left transition-all hover:-translate-y-0.5',
        active ? 'border-accent/60' : 'border-line hover:border-line-2',
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden border-b border-line bg-bg/60">
        <MiniPreview mod={mod} />
        <span
          className="absolute right-2 top-2 flex items-center gap-1 border bg-bg/80 px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
          style={{ color, borderColor: `${color}55` }}
        >
          <StatusDot color={color} size={5} /> {mod.status}
        </span>
      </div>
      <div className="p-3">
        <h3 className="font-display text-sm text-text transition-colors group-hover:text-accent">{mod.name}</h3>
        <p className="line-clamp-1 text-[11px] text-dim">{mod.kind}</p>
      </div>
    </button>
  )
}

function MiniPreview({ mod }: { mod: LabModule }) {
  return (
    <div className="grid-bg absolute inset-0 flex items-center justify-center opacity-70">
      <span className="font-display text-[10px] tracking-widest text-dim">{mod.name.toUpperCase()}</span>
    </div>
  )
}

function PreviewFrame({ mod }: { mod: LabModule }) {
  return (
    <div className="border border-line bg-bg/60">
      <div className="flex items-center gap-1.5 border-b border-line px-2 py-1.5">
        <span className="h-2 w-2 rounded-full bg-danger/70" />
        <span className="h-2 w-2 rounded-full bg-amber/70" />
        <span className="h-2 w-2 rounded-full bg-neon-green/70" />
        <span className="ml-2 truncate text-[10px] text-dim">{mod.url ?? `local://${mod.id}`}</span>
      </div>
      {mod.url ? (
        <iframe
          src={mod.url}
          title={mod.name}
          sandbox="allow-scripts allow-same-origin allow-forms"
          className="aspect-video w-full border-0 bg-white"
          loading="lazy"
        />
      ) : (
        <div className="grid-bg flex aspect-video items-center justify-center">
          <span className="font-display text-xs tracking-widest text-dim">PREVIEW · {mod.kind.toUpperCase()}</span>
        </div>
      )}
    </div>
  )
}

interface Line {
  text: string
  kind: 'in' | 'out' | 'ok' | 'err'
}

function TestConsole({ mod }: { mod: LabModule }) {
  const [lines, setLines] = useState<Line[]>([{ text: `connected to ${mod.id}`, kind: 'ok' }])
  const [cmd, setCmd] = useState('')

  const push = (l: Line[]) => setLines((prev) => [...prev, ...l].slice(-40))

  const run = (input: string) => {
    if (!input.trim()) return
    push([{ text: `$ ${input}`, kind: 'in' }])
    const out: Line[] = (() => {
      if (input.startsWith('ping')) return [{ text: `${mod.id} responded in ${(Math.random() * 40 + 5).toFixed(0)}ms`, kind: 'ok' }]
      if (input.startsWith('build')) return [{ text: 'building…', kind: 'out' }, { text: 'build ok · 1.2s', kind: 'ok' }]
      if (input.startsWith('deploy')) return [{ text: 'deploying to ' + mod.status + '…', kind: 'out' }, { text: 'deployed ✓', kind: 'ok' }]
      if (input.startsWith('status')) return [{ text: `state=${mod.status} stack=${mod.stack.join(',')}`, kind: 'out' }]
      return [{ text: `unknown command: ${input.split(' ')[0]} (try ping/build/deploy/status)`, kind: 'err' }]
    })()
    push(out)
    setCmd('')
  }

  const quick = (label: string, icon: typeof Play, c: string) => ({ label, icon, c })
  const actions = [quick('Ping', Activity, 'ping'), quick('Build', Hammer, 'build'), quick('Deploy', Rocket, 'deploy')]

  const COLOR: Record<Line['kind'], string> = { in: '#c8d2dc', out: '#6b7785', ok: '#46d369', err: '#ff5566' }

  return (
    <Panel title="Test Console" code="SANDBOX" accent="#36e0c8" className="flex-1" bodyClassName="flex flex-col p-0">
      <div className="flex gap-1 border-b border-line p-2">
        {actions.map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.label}
              onClick={() => run(a.c)}
              className="flex items-center gap-1 border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-dim hover:border-accent/60 hover:text-accent"
            >
              <Icon size={11} /> {a.label}
            </button>
          )
        })}
      </div>
      <div className="min-h-[140px] flex-1 overflow-y-auto p-2 text-[11px] leading-relaxed">
        {lines.map((l, i) => (
          <div key={i} style={{ color: COLOR[l.kind] }}>
            {l.text}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-line p-2">
        <TerminalSquare size={14} className="text-dim" />
        <input
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run(cmd)}
          placeholder="ping · build · deploy · status"
          className="flex-1 bg-transparent text-[11px] text-text placeholder:text-dim focus:outline-none"
        />
        <button onClick={() => run(cmd)} className="text-dim hover:text-accent">
          <Play size={13} />
        </button>
      </div>
    </Panel>
  )
}
