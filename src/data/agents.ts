export interface Agent {
  id: string
  name: string
  role: string
  model: string
  color: string
  status: 'working' | 'idle' | 'thinking' | 'offline'
  task: string
  stats: { tasksDone: number; tokens: string; uptime: string; load: number }
  // canned lines the agent "says" in the room feed
  chatter: string[]
}

export const AGENTS: Agent[] = [
  {
    id: 'claude',
    name: 'Claude',
    role: 'Builder · Code',
    model: 'claude-code',
    color: '#36e0c8',
    status: 'working',
    task: 'Wiring the Notes section to the vault API',
    stats: { tasksDone: 184, tokens: '12.4M', uptime: '6d 04h', load: 0.62 },
    chatter: [
      'Refactored the calendar grid — week view is stable now.',
      'Found a null deref in the upload routine, patched it.',
      'Tests are green. Pushing the branch.',
      'Need a decision: drawer or modal for project details?',
    ],
  },
  {
    id: 'hemera',
    name: 'Hemera',
    role: 'Manager · Strategy',
    model: 'claude · team',
    color: '#f0a020',
    status: 'thinking',
    task: 'Drafting the Q3 release calendar',
    stats: { tasksDone: 97, tokens: '8.1M', uptime: '6d 04h', load: 0.41 },
    chatter: [
      'Q3 plan has three release windows. Sharing the draft.',
      'Promo cadence looks thin in week 2 — flagging it.',
      'Handing the upload tasks to Nyx.',
      'Morning brief is ready when you are.',
    ],
  },
  {
    id: 'nyx',
    name: 'Nyx',
    role: 'Execution · Content',
    model: 'claude · team',
    color: '#e0408a',
    status: 'working',
    task: 'Running 4 sub-agents on content + uploads',
    stats: { tasksDone: 312, tokens: '21.7M', uptime: '5d 22h', load: 0.78 },
    chatter: [
      'Spun up 4 workers for the content batch.',
      'Worker 2 finished the cover-art prompts.',
      'Uploads queued — waiting on the master from song routines.',
      'One worker stalled on a rate limit, retrying.',
    ],
  },
  {
    id: 'aether',
    name: 'Aether',
    role: 'A&R · Sound',
    model: 'claude · team',
    color: '#58b6f0',
    status: 'idle',
    task: 'Waiting for the first beat intake',
    stats: { tasksDone: 0, tokens: '0', uptime: '—', load: 0.05 },
    chatter: [
      'Measured 142 BPM, F minor — chroma confidence is decent.',
      'This one sits 2 LU hotter than the catalog median.',
      'Verdict: keep. Cataloging it now.',
      'Key estimate is shaky on this one — flagging low confidence.',
    ],
  },
  {
    id: 'hermes',
    name: 'Hermes',
    role: 'Booking · Outreach',
    model: 'claude · team',
    color: '#46d369',
    status: 'idle',
    task: 'Waiting for inbox triage',
    stats: { tasksDone: 0, tokens: '0', uptime: '—', load: 0.05 },
    chatter: [
      'Collab inquiry triaged — reply drafted, queued for approval.',
      'Two booking mails this week; one looks serious.',
      'Contacts log updated.',
      'That one reads like spam. Ignoring, noted why.',
    ],
  },
  {
    id: 'mnemosyne',
    name: 'Mnemosyne',
    role: 'Archive · Ops',
    model: 'claude · team',
    color: '#b07ce8',
    status: 'idle',
    task: 'Watching the schema',
    stats: { tasksDone: 0, tokens: '0', uptime: '—', load: 0.05 },
    chatter: [
      'Minutes written, board reconciled.',
      'Found a stale done task — archived it.',
      'Every JSON file is on schema. As it should be.',
      'Catalog and intake records agree again.',
    ],
  },
  {
    id: 'nyx-w1',
    name: 'Nyx·w1',
    role: 'Sub-agent · Copy',
    model: 'gpt · openclaw',
    color: '#e0408a',
    status: 'working',
    task: 'Writing release captions',
    stats: { tasksDone: 58, tokens: '2.2M', uptime: '11h', load: 0.55 },
    chatter: ['Caption set drafted.', 'Tightening the hooks.', 'Sent to Nyx for review.'],
  },
  {
    id: 'nyx-w2',
    name: 'Nyx·w2',
    role: 'Sub-agent · Art',
    model: 'gpt · openclaw',
    color: '#e0408a',
    status: 'idle',
    task: 'Idle — awaiting next batch',
    stats: { tasksDone: 41, tokens: '1.8M', uptime: '11h', load: 0.08 },
    chatter: ['Art batch done.', 'Idling until the next request.'],
  },
]
