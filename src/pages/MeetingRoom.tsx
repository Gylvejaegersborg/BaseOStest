import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Cpu, MessageSquare, Timer, CheckCircle2 } from 'lucide-react'
import { AGENTS, type Agent } from '@/data/agents'
import { Panel } from '@/components/ui/Panel'
import { StatusDot } from '@/components/ui/StatusDot'
import { useTeamState } from '@/features/team/useTeamState'
import { cn } from '@/lib/cn'

interface Mover {
  x: number
  y: number
  vx: number
  vy: number
  bubble: string | null
  bubbleUntil: number
}
interface FeedLine {
  id: string
  agent: Agent
  text: string
  time: string
}

const STATUS_COLOR: Record<Agent['status'], string> = {
  working: '#46d369',
  thinking: '#f0a020',
  idle: '#6b7785',
  offline: '#ff5566',
}

export function MeetingRoom() {
  const [movers, setMovers] = useState<Mover[]>(() =>
    AGENTS.map((_, i) => ({
      x: 15 + (i * 70) / AGENTS.length + Math.random() * 10,
      y: 25 + Math.random() * 50,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      bubble: null,
      bubbleUntil: 0,
    })),
  )
  const [selected, setSelected] = useState<string>(AGENTS[0].id)
  const [feed, setFeed] = useState<FeedLine[]>([])
  const moversRef = useRef(movers)
  moversRef.current = movers

  // Live team state committed by the workflows: real statuses/tasks override the
  // mock roster, and the latest meeting transcript replaces the random chatter.
  const team = useTeamState()
  const live = team.connection === 'live'
  const agents = useMemo<Agent[]>(
    () =>
      AGENTS.map((a) => {
        const l = live ? team.agents.find((x) => x.id === a.id) : undefined
        return l ? { ...a, role: l.role, status: l.status, task: l.task } : a
      }),
    [live, team.agents],
  )
  const agentsRef = useRef(agents)
  agentsRef.current = agents
  const turnsRef = useRef<{ agent: Agent; text: string }[] | null>(null)
  const turnIdxRef = useRef(0)
  useEffect(() => {
    if (live && team.meeting?.turns.length) {
      const mapped = team.meeting.turns
        .map((t) => ({ agent: agents.find((a) => a.id === t.agent), text: t.text }))
        .filter((t): t is { agent: Agent; text: string } => !!t.agent)
      turnsRef.current = mapped.length ? mapped : null
    } else {
      turnsRef.current = null
    }
    turnIdxRef.current = 0
  }, [live, team.meeting, agents])

  // wander loop
  useEffect(() => {
    const id = window.setInterval(() => {
      setMovers((prev) =>
        prev.map((m) => {
          let { x, y, vx, vy } = m
          // gentle random steering
          vx += (Math.random() - 0.5) * 0.08
          vy += (Math.random() - 0.5) * 0.08
          vx = Math.max(-0.7, Math.min(0.7, vx))
          vy = Math.max(-0.7, Math.min(0.7, vy))
          x += vx
          y += vy
          if (x < 8 || x > 92) vx *= -1
          if (y < 12 || y > 88) vy *= -1
          x = Math.max(8, Math.min(92, x))
          y = Math.max(12, Math.min(88, y))
          const bubble = m.bubbleUntil > Date.now() ? m.bubble : null
          return { ...m, x, y, vx, vy, bubble }
        }),
      )
    }, 60)
    return () => window.clearInterval(id)
  }, [])

  // feed loop: replays the live meeting transcript when present, random mock
  // chatter otherwise (refs keep the interval stable across state changes)
  useEffect(() => {
    const id = window.setInterval(() => {
      const list = agentsRef.current
      const turns = turnsRef.current
      let agent: Agent
      let text: string
      if (turns) {
        const t = turns[turnIdxRef.current % turns.length]
        turnIdxRef.current += 1
        agent = t.agent
        text = t.text
      } else {
        agent = list[Math.floor(Math.random() * list.length)]
        if (agent.status === 'offline') return
        text = agent.chatter[Math.floor(Math.random() * agent.chatter.length)]
      }
      const idx = list.indexOf(agent)
      setFeed((f) => [
        { id: crypto.randomUUID(), agent, text, time: new Date().toLocaleTimeString('en-GB', { hour12: false }) },
        ...f,
      ].slice(0, 24))
      // show a speech bubble over that agent
      setMovers((prev) =>
        prev.map((m, i) => (i === idx ? { ...m, bubble: text, bubbleUntil: Date.now() + 4000 } : m)),
      )
    }, 2600)
    return () => window.clearInterval(id)
  }, [])

  const agent = agents.find((a) => a.id === selected)!

  return (
    <div className="flex h-full flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      {/* Room */}
      <div className="flex h-[46vh] min-w-0 flex-col lg:h-auto lg:flex-1">
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <h1 className="font-display text-lg tracking-wider text-text">MEETING ROOM</h1>
          <span className="text-xs text-dim">
            {agents.filter((a) => a.status !== 'offline').length} agents present
            {live && team.meeting && <span className="text-accent"> · replaying {team.meeting.date} standup</span>}
          </span>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden grid-bg">
          {/* room floor vignette */}
          <div className="pointer-events-none absolute inset-6 border border-line/40" />
          {agents.map((a, i) => (
            <AgentAvatar
              key={a.id}
              agent={a}
              mover={movers[i]}
              selected={a.id === selected}
              onClick={() => setSelected(a.id)}
            />
          ))}
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] tracking-widest text-dim">
            OPEN ROOM · CLICK AN AGENT TO INSPECT
          </div>
        </div>
      </div>

      {/* Side: selected agent + feed */}
      <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto border-t border-line bg-panel/30 p-3 lg:w-[320px] lg:border-l lg:border-t-0">
        <Panel title={agent.name} code={agent.model} accent={agent.color}>
          <div className="mb-3 flex items-center gap-2 text-xs">
            <StatusDot color={STATUS_COLOR[agent.status]} pulse={agent.status === 'working'} size={7} />
            <span style={{ color: STATUS_COLOR[agent.status] }} className="uppercase tracking-wider">
              {agent.status}
            </span>
            <span className="text-dim">· {agent.role}</span>
          </div>
          <div className="mb-3 border border-line bg-bg/40 p-2 text-xs text-text/85">
            <span className="label mb-1 block">CURRENT TASK</span>
            {agent.task}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat icon={CheckCircle2} label="tasks" value={String(agent.stats.tasksDone)} />
            <Stat icon={Cpu} label="tokens" value={agent.stats.tokens} />
            <Stat icon={Timer} label="uptime" value={agent.stats.uptime} />
            <Stat icon={Activity} label="load" value={`${Math.round(agent.stats.load * 100)}%`} />
          </div>
        </Panel>

        <Panel title="Room Feed" code="LIVE" accent="#36e0c8" className="flex-1" bodyClassName="p-2">
          <div className="flex items-center gap-1.5 px-1 pb-2 text-[10px] text-dim">
            <MessageSquare size={11} /> agents posting in real time
          </div>
          <div className="space-y-2">
            {feed.map((f) => (
              <div key={f.id} className="animate-fade-in border-l-2 pl-2" style={{ borderColor: f.agent.color }}>
                <div className="flex items-center gap-2 text-[10px]">
                  <span style={{ color: f.agent.color }}>{f.agent.name}</span>
                  <span className="text-dim tabular-nums">{f.time}</span>
                </div>
                <div className="text-xs text-text/85">{f.text}</div>
              </div>
            ))}
            {!feed.length && <div className="px-1 text-xs text-dim">listening…</div>}
          </div>
        </Panel>
      </aside>
    </div>
  )
}

function AgentAvatar({
  agent,
  mover,
  selected,
  onClick,
}: {
  agent: Agent
  mover: Mover
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-100"
      style={{ left: `${mover.x}%`, top: `${mover.y}%` }}
    >
      {mover.bubble && (
        <div
          className="absolute bottom-full left-1/2 mb-2 w-40 -translate-x-1/2 animate-fade-in border bg-panel/95 px-2 py-1 text-left text-[10px] text-text/90 backdrop-blur"
          style={{ borderColor: `${agent.color}66` }}
        >
          {mover.bubble}
          <span
            className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r bg-panel"
            style={{ borderColor: `${agent.color}66` }}
          />
        </div>
      )}
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full border-2 font-display text-sm transition-all',
          selected && 'scale-125',
        )}
        style={{
          borderColor: agent.color,
          color: agent.color,
          backgroundColor: '#0a0c10',
          boxShadow: `0 0 ${selected ? 16 : 8}px ${agent.color}`,
        }}
      >
        {agent.name[0]}
      </div>
      <div className="mt-1 flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider text-dim">
        <StatusDot color={STATUS_COLOR[agent.status]} size={5} />
        {agent.name}
      </div>
    </button>
  )
}

function Stat({ icon: Icon, label, value }: { icon: typeof Cpu; label: string; value: string }) {
  return (
    <div className="border border-line bg-bg/40 p-2">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-dim">
        <Icon size={10} /> {label}
      </div>
      <div className="font-display text-base text-text">{value}</div>
    </div>
  )
}
