import { useSyncExternalStore } from 'react'

/**
 * Teams and agent folders. Agent identities live in Agent-OS; how they're
 * grouped is a BaseSpace concern, so it's kept here (localStorage). An
 * agent can sit in any number of teams, and in exactly one folder in the
 * agent list (a folder is "what kind of work does this agent do").
 */
export interface Team {
  id: string
  name: string
  color: string
  description?: string
  /** Agent ids. Order is display order; the first is the team lead. */
  members: string[]
}

interface TeamsState {
  teams: Team[]
  /** agentId → folder name. Unlisted agents fall back to DEFAULT_FOLDER. */
  folders: Record<string, string>
  /** Folders the user collapsed in the agent list. */
  collapsed: string[]
  /** The team the agent list is filtered to (null = everyone). */
  activeTeam: string | null
}

const KEY = 'os:workbench:teams'

export const TEAM_COLORS = ['#f0a020', '#36e0c8', '#c77591', '#9b7bff', '#46d369', '#e05c67', '#4aa8ff']

const SEED: TeamsState = {
  teams: [
    {
      id: 'isark',
      name: 'ISΛRK artist team',
      color: '#f0a020',
      description: 'Release strategy, content, A&R, bookings, research and the daily standup.',
      members: ['hemera', 'nyx', 'aether', 'hermes', 'theia', 'mnemosyne', 'argus'],
    },
    {
      id: 'builders',
      name: 'Builders',
      color: '#c77591',
      description: 'Keeps BaseSpace and the Agent-OS harness running.',
      members: ['claude', 'argus'],
    },
  ],
  folders: {},
  collapsed: [],
  activeTeam: null,
}

// Default folders by the kind of work each seeded agent does.
const DEFAULT_FOLDER: Record<string, string> = {
  claude: 'Engineering',
  hemera: 'Strategy & oversight',
  argus: 'Strategy & oversight',
  nyx: 'Creative',
  aether: 'Creative',
  hermes: 'Outreach & research',
  theia: 'Outreach & research',
  mnemosyne: 'Operations',
}

function load(): TeamsState {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...SEED, ...(JSON.parse(raw) as Partial<TeamsState>) } : SEED
  } catch {
    return SEED
  }
}

let state = load()
const listeners = new Set<() => void>()

function commit(patch: Partial<TeamsState>) {
  state = { ...state, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* in memory only */
  }
  listeners.forEach((l) => l())
}

export function useTeams(): TeamsState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

export function folderOf(agentId: string, role?: string): string {
  return state.folders[agentId] ?? DEFAULT_FOLDER[agentId] ?? role?.split('·')[1]?.trim() ?? 'Other'
}

export function teamsOf(agentId: string): Team[] {
  return state.teams.filter((t) => t.members.includes(agentId))
}

export function setActiveTeam(id: string | null) {
  commit({ activeTeam: id })
}

export function setFolder(agentId: string, folder: string) {
  commit({ folders: { ...state.folders, [agentId]: folder.trim() || 'Other' } })
}

export function toggleCollapsed(folder: string) {
  const c = new Set(state.collapsed)
  if (c.has(folder)) c.delete(folder)
  else c.add(folder)
  commit({ collapsed: [...c] })
}

export function toggleMember(teamId: string, agentId: string) {
  commit({
    teams: state.teams.map((t) =>
      t.id !== teamId ? t : { ...t, members: t.members.includes(agentId) ? t.members.filter((m) => m !== agentId) : [...t.members, agentId] },
    ),
  })
}

export function saveTeam(team: Team) {
  commit({ teams: state.teams.some((t) => t.id === team.id) ? state.teams.map((t) => (t.id === team.id ? team : t)) : [...state.teams, team] })
}

export function deleteTeam(id: string) {
  commit({ teams: state.teams.filter((t) => t.id !== id), activeTeam: state.activeTeam === id ? null : state.activeTeam })
}

export function newTeam(): Team {
  return { id: `team-${Date.now().toString(36)}`, name: 'New team', color: TEAM_COLORS[state.teams.length % TEAM_COLORS.length], members: [] }
}
