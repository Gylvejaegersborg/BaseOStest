import { useCallback, useEffect, useState } from 'react'
import { AGENTS } from '@/data/agents'
import * as gh from './githubClient'
import type {
  ApprovalItem, IntakeRecord, Meeting, TeamAgentState, TeamConnection, TeamState, TeamTask,
} from './types'

/** Mock state derived from the bundled agent roster, so the Team page (and the
 *  MeetingRoom) stay usable before the workflows have committed real state. */
function mockState(): TeamState {
  return {
    agents: AGENTS.filter((a) => !a.id.includes('-w')).map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      status: a.status,
      task: a.task,
      lastActive: new Date().toISOString(),
    })),
    tasks: [],
    meeting: null,
    brief: '',
    approvals: [],
    intake: [],
  }
}

/**
 * Loads the team state the workflows commit under team/. Live when the GitHub
 * token (or a public repo) lets us read the files; falls back to mock otherwise —
 * same live-vs-mock contract as useDiscordBridge.
 */
export function useTeamState() {
  const [state, setState] = useState<TeamState>(mockState)
  const [connection, setConnection] = useState<TeamConnection>('connecting')
  const [hasToken, setHasToken] = useState(() => !!gh.getToken())

  const refresh = useCallback(async () => {
    setConnection('connecting')
    try {
      // Core files first — if these fail there is no live state at all.
      const [agentsFile, tasksFile, queueFile] = await Promise.all([
        gh.fetchJson<{ agents: TeamAgentState[] }>('team/state/agents.json'),
        gh.fetchJson<{ tasks: TeamTask[] }>('team/state/tasks.json'),
        gh.fetchJson<{ items: ApprovalItem[] }>('team/approvals/queue.json'),
      ])
      // Optional files — missing just means the team hasn't produced them yet.
      const [meeting, brief, intake] = await Promise.all([
        gh.fetchJson<Meeting>('team/meetings/latest.json').catch(() => null),
        gh.fetchFile('team/briefs/latest.md').catch(() => ''),
        loadIntake().catch(() => [] as IntakeRecord[]),
      ])
      setState({
        agents: agentsFile.agents,
        tasks: tasksFile.tasks,
        approvals: queueFile.items,
        meeting,
        brief,
        intake,
      })
      setConnection('live')
    } catch {
      setState(mockState())
      setConnection(gh.getToken() ? 'error' : 'mock')
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, hasToken])

  const saveToken = useCallback((token: string) => {
    gh.setToken(token)
    setHasToken(!!token)
  }, [])

  return { ...state, connection, hasToken, saveToken, refresh }
}

/** Newest intake records (directory listing needs the contents API). */
async function loadIntake(): Promise<IntakeRecord[]> {
  const entries = await gh.listDir('team/inbox')
  const files = entries
    .filter((e) => e.type === 'file' && e.name.endsWith('.json'))
    .sort((a, b) => b.name.localeCompare(a.name))
    .slice(0, 20)
  const records = await Promise.all(
    files.map((f) => gh.fetchJson<IntakeRecord>(f.path).catch(() => null)),
  )
  return records
    .filter((r): r is IntakeRecord => r !== null)
    .sort((a, b) => (b.receivedAt ?? '').localeCompare(a.receivedAt ?? ''))
}
