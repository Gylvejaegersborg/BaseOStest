import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { CalendarClock, Download, FileText, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { StatusDot } from '@/components/ui/StatusDot'
import { useAgentOsContext } from '@/features/agentos/AgentOsProvider'
import { isRealAgent } from '@/data/agents'
import type { CronJob } from '@/data/calendar'
import { useCalendar } from '@/features/calendar/CalendarContext'
import { CronEditModal } from '@/features/calendar/CronEditModal'
import { cronNextRunMs, cronScheduleLabel, CRON_STATUS_COLOR } from '@/features/calendar/cron'
import { cn } from '@/lib/cn'
import { downloadSnapshot, syncSnapshotNow, useSnapshot, useSnapshotStatus } from '@/features/agentos/snapshot'
import { TEAM_COLORS, deleteTeam, newTeam, saveTeam, setActiveTeam, toggleMember, useTeams, type Team } from './teams'

/**
 * Teams — who works together. An agent can be on any number of teams;
 * each team can have its own scheduled standup (a cron job tagged with the
 * team, so it also shows up in the Calendar and the Crons tab). The team's
 * written output (briefs, meeting minutes, reports) lives in Notes → Team.
 */
export function TeamsTab() {
  const { agents } = useAgentOsContext()
  const { crons, saveCron, deleteCron } = useCalendar()
  const teams = useTeams()
  const navigate = useNavigate()
  const snap = useSnapshot()
  const sync = useSnapshotStatus()
  const [selected, setSelected] = useState<string | null>(teams.activeTeam ?? teams.teams[0]?.id ?? null)
  const [editingCron, setEditingCron] = useState<CronJob | null>(null)
  const team = teams.teams.find((t) => t.id === selected) ?? teams.teams[0] ?? null
  const real = agents.filter(isRealAgent)

  const patch = (p: Partial<Team>) => team && saveTeam({ ...team, ...p })
  const addTeam = () => {
    const t = newTeam()
    saveTeam(t)
    setSelected(t.id)
  }

  const teamCrons = team ? crons.filter((c) => c.team === team.id) : []
  const lead = team ? real.find((a) => a.id === team.members[0]) : undefined
  const scheduleStandup = () =>
    team &&
    setEditingCron({
      id: `c-${Date.now().toString(36)}`,
      name: `${team.name} standup`,
      owner: lead?.name ?? 'Hemera',
      team: team.id,
      schedule: { type: 'daily', hour: 7.5 },
      showInCalendar: true,
      lastRun: 'never',
      status: 'ok',
      description: `Daily standup for ${team.name}: ${team.members.join(', ') || 'no members yet'}. The lead chairs, each member reports, the minutes go to Notes → Team.`,
    })

  return (
    <div className="space-y-3 p-3 text-xs">
      <div className="flex items-center gap-2">
        <select
          value={team?.id ?? ''}
          onChange={(e) => setSelected(e.target.value)}
          className="min-w-0 flex-1 border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
        >
          {teams.teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.members.length})
            </option>
          ))}
        </select>
        <button onClick={addTeam} title="New team" className="border border-line p-1.5 text-dim hover:text-text">
          <Plus size={13} />
        </button>
      </div>

      {team ? (
        <>
          <div className="space-y-2 border border-line bg-bg/30 p-2" style={{ borderColor: `${team.color}55` }}>
            <input
              value={team.name}
              onChange={(e) => patch({ name: e.target.value })}
              className="w-full border-b border-transparent bg-transparent font-display text-sm tracking-wide focus:border-line focus:outline-none"
              style={{ color: team.color }}
            />
            <textarea
              value={team.description ?? ''}
              onChange={(e) => patch({ description: e.target.value })}
              rows={2}
              placeholder="What this team is for…"
              className="w-full resize-none bg-transparent text-[11px] text-dim focus:text-text focus:outline-none"
            />
            <div className="flex items-center gap-1.5">
              {TEAM_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => patch({ color: c })}
                  className={cn('h-3.5 w-3.5 border', team.color === c ? 'border-text' : 'border-transparent')}
                  style={{ backgroundColor: c }}
                  aria-label={`Colour ${c}`}
                />
              ))}
              <span className="flex-1" />
              <button
                onClick={() => setActiveTeam(teams.activeTeam === team.id ? null : team.id)}
                className={cn(
                  'border px-1.5 py-0.5 text-[10px] uppercase tracking-wider',
                  teams.activeTeam === team.id ? 'border-accent/50 text-accent' : 'border-line text-dim hover:text-text',
                )}
                title="Filter the agent list to this team"
              >
                {teams.activeTeam === team.id ? 'Showing in list' : 'Show in list'}
              </button>
            </div>
          </div>

          <section>
            <div className="label mb-1">Members — first is the lead</div>
            <div className="space-y-0.5">
              {[...real].sort((a, b) => rank(team, a.id) - rank(team, b.id)).map((a) => {
                const member = team.members.includes(a.id)
                return (
                  <label key={a.id} className="flex cursor-pointer items-center gap-2 px-1 py-1 hover:bg-panel-2/50">
                    <input type="checkbox" checked={member} onChange={() => toggleMember(team.id, a.id)} className="size-3.5" style={{ accentColor: team.color }} />
                    <StatusDot color={a.color} pulse={a.status === 'working'} size={6} />
                    <span className={cn('min-w-0 flex-1 truncate', member ? 'text-text' : 'text-dim')}>{a.name}</span>
                    <span className="truncate text-[10px] text-dim">{a.role}</span>
                    {team.members[0] === a.id && <span className="text-[9px] uppercase tracking-wider" style={{ color: team.color }}>lead</span>}
                  </label>
                )
              })}
            </div>
          </section>

          <section>
            <div className="mb-1 flex items-center justify-between">
              <span className="label">Meetings</span>
              <button onClick={scheduleStandup} className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-dim hover:text-text">
                <CalendarClock size={11} /> Schedule standup
              </button>
            </div>
            {teamCrons.length ? (
              <div className="space-y-1">
                {teamCrons.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setEditingCron(c)}
                    className="flex w-full items-center gap-2 border border-line bg-bg/30 px-2 py-1.5 text-left hover:bg-panel-2/60"
                  >
                    <StatusDot color={CRON_STATUS_COLOR[c.status]} size={6} />
                    <span className="min-w-0 flex-1 truncate text-text">{c.name}</span>
                    <span className="text-[10px] text-dim">{cronScheduleLabel(c.schedule)}</span>
                    <span className="text-[10px] tabular-nums text-dim">next {format(cronNextRunMs(c.schedule), 'EEE HH:mm')}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-dim">No meetings scheduled. A standup is a daily cron job — it shows in the Calendar too.</p>
            )}
          </section>

          <section>
            <div className="label mb-1">Output</div>
            <button
              onClick={() => navigate('/notes?note=team-brief-latest')}
              className="flex w-full items-center gap-2 border border-line bg-bg/30 px-2 py-1.5 text-left hover:bg-panel-2/60"
            >
              <FileText size={12} className="text-dim" />
              <span className="flex-1 text-text">Latest brief</span>
              <span className="text-[10px] text-dim">Notes → Team</span>
            </button>
            <div className="mt-1 flex items-center gap-2 border border-line bg-bg/30 px-2 py-1.5">
              <span className="min-w-0 flex-1 text-[11px] text-dim">
                <span className="text-text">Snapshot for agents</span> ·{' '}
                {sync.state === 'ok' && sync.at
                  ? `synced ${format(new Date(sync.at), 'HH:mm')}${sync.bytes ? ` · ${Math.round(sync.bytes / 1024)} KB` : ''}`
                  : sync.state === 'pushing'
                    ? 'syncing…'
                    : sync.state === 'error'
                      ? `failed: ${sync.error}`
                      : 'waiting for Agent-OS'}
              </span>
              <button onClick={syncSnapshotNow} title="Sync now" className="text-dim hover:text-text">
                <RefreshCw size={12} />
              </button>
              <button onClick={() => downloadSnapshot(snap)} title="Download as JSON" className="text-dim hover:text-text">
                <Download size={12} />
              </button>
            </div>
            <p className="mt-1 text-[10px] leading-snug text-dim">
              Agents read notes, projects, todos, events, crons and teams from this snapshot; it re-syncs a few seconds after you change
              anything. Briefs, meeting minutes, reports and drafts from the old GitHub team live in Notes under the Team folder. Their open board
              items are in the Calendar's Todo list.
            </p>
          </section>

          <button
            onClick={() => {
              if (!confirm(`Delete team “${team.name}”? The agents stay; only the grouping goes.`)) return
              deleteTeam(team.id)
              setSelected(null)
            }}
            className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-dim hover:text-danger"
          >
            <Trash2 size={11} /> Delete team
          </button>
        </>
      ) : (
        <p className="text-dim">No teams yet.</p>
      )}

      <CronEditModal
        job={editingCron}
        onClose={() => setEditingCron(null)}
        onSave={(c) => {
          saveCron(c)
          setEditingCron(null)
        }}
        onDelete={(id) => {
          deleteCron(id)
          setEditingCron(null)
        }}
      />
    </div>
  )
}

function rank(team: Team, id: string): number {
  const i = team.members.indexOf(id)
  return i === -1 ? 999 : i
}
