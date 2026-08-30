// Fake data for Phase 5 — the BaseOS Harness shell is built against this
// BEFORE any WebSocket client exists (Phase 6). Every shape here matches
// the real protocol/types exactly, so swapping this module out for a live
// useHarnessSocket()-backed store in Phase 6 changes the DATA SOURCE, not
// what any component expects to receive.

import type { AgentRuntime, HarnessState } from './types'
import type { ConversationItem, Task, Automation } from './protocol'

export const FAKE_AGENTS: AgentRuntime[] = [
  { id: 'claude', name: 'Claude', persona: 'Builder · Code', color: '#36e0c8', status: 'working', currentTask: 'Wiring the Harness Right Rail' },
  { id: 'hemera', name: 'Hemera', persona: 'Manager · Strategy', color: '#f0a020', status: 'thinking' },
  { id: 'nyx', name: 'Nyx', persona: 'Execution · Content', color: '#e0408a', status: 'waiting', currentTask: 'Waiting on asset approval' },
]

export const FAKE_MESSAGES: ConversationItem[] = [
  {
    id: 'msg_1',
    kind: 'user-message',
    timestamp: new Date(Date.now() - 5 * 60_000).toISOString(),
    sessionId: 'sess_fake',
    text: 'Build the login page.',
  },
  {
    id: 'msg_2',
    kind: 'agent-message',
    timestamp: new Date(Date.now() - 4 * 60_000).toISOString(),
    sessionId: 'sess_fake',
    agentId: 'claude',
    text: "I'll inspect the current auth implementation first.",
  },
  {
    id: 'msg_3',
    kind: 'tool-call',
    timestamp: new Date(Date.now() - 4 * 60_000 + 15_000).toISOString(),
    sessionId: 'sess_fake',
    agentId: 'claude',
    tool: 'filesystem.read',
    args: { path: 'src/auth.ts' },
  },
  {
    id: 'msg_4',
    kind: 'agent-message',
    timestamp: new Date(Date.now() - 3 * 60_000).toISOString(),
    sessionId: 'sess_fake',
    agentId: 'claude',
    text: 'Found the existing session model — reusing it rather than writing a new one.',
  },
  {
    id: 'msg_5',
    kind: 'permission-request',
    timestamp: new Date(Date.now() - 2 * 60_000).toISOString(),
    sessionId: 'sess_fake',
    agentId: 'claude',
    request: {
      requestId: 'perm_fake_1',
      tool: 'filesystem.write',
      payload: { path: 'src/pages/Login.tsx' },
      risk: 'medium',
      options: ['once', 'always', 'deny'],
    },
  },
  {
    id: 'msg_6',
    kind: 'agent-message',
    timestamp: new Date(Date.now() - 90_000).toISOString(),
    sessionId: 'sess_fake',
    agentId: 'nyx',
    text: 'Meanwhile, asset generation has completed — 4 variants ready for review.',
  },
]

export const FAKE_TASKS: Task[] = [
  {
    id: 'task_1',
    type: 'user-request',
    agentId: 'claude',
    status: 'running',
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    startedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    input: { goal: 'Build login page' },
    notifyPolicy: 'immediate',
  },
  {
    id: 'task_2',
    type: 'subagent',
    agentId: 'nyx',
    parentTaskId: 'task_1',
    status: 'succeeded',
    createdAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    startedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    completedAt: new Date(Date.now() - 90_000).toISOString(),
    input: { goal: 'Generate login page assets' },
    notifyPolicy: 'immediate',
  },
  {
    id: 'task_3',
    type: 'cron',
    agentId: 'hemera',
    status: 'queued',
    createdAt: new Date(Date.now() - 30_000).toISOString(),
    input: { automationId: 'auto_1' },
    notifyPolicy: 'silent',
  },
]

export const FAKE_AUTOMATIONS: Automation[] = [
  {
    id: 'auto_1',
    trigger: { kind: 'cron', expr: '0 8 * * *' },
    agentId: 'hemera',
    promptTemplate: 'Draft the morning brief.',
    enabled: true,
  },
  {
    id: 'auto_2',
    trigger: { kind: 'event', eventType: 'git.push' },
    agentId: 'claude',
    promptTemplate: 'Back up the repository state.',
    enabled: true,
  },
  {
    id: 'auto_3',
    trigger: { kind: 'cron', expr: '0 9 * * 1' },
    agentId: 'hemera',
    promptTemplate: 'Compile the weekly review.',
    enabled: false,
  },
]

export function buildFakeHarnessState(): HarnessState {
  return {
    connection: 'disconnected', // honest: no WebSocket client exists until Phase 6
    activeSessionId: 'sess_fake',
    activeAgentId: 'claude',
    activeView: 'chat',
    agents: FAKE_AGENTS,
    messages: FAKE_MESSAGES,
    tasks: FAKE_TASKS,
    pendingPermissions: FAKE_MESSAGES.filter((m) => m.kind === 'permission-request').map((m) => m.request),
    automations: FAKE_AUTOMATIONS,
    rightRail: 'expanded',
    bottomRail: 'expanded',
  }
}
