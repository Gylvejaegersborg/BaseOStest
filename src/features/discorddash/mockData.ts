import { AGENTS } from '@/data/agents'
import type { Approval, BridgeMessage, Channel, Guild } from './types'

// The two real ISΛRK servers. IDs are the live Discord guild snowflakes; the
// bridge service will fetch their actual channels/messages. Until it's running
// the dashboard renders the mock content below, keyed by these same IDs.
export const GUILDS: Guild[] = [
  { id: '1383805863860633700', name: 'ISΛRK HQ', kind: 'ops' },
  { id: '1488928080394453132', name: 'ISΛRK Public', kind: 'public' },
]

const OPS = GUILDS[0].id
const PUBLIC = GUILDS[1].id

// Resolve an agent id to a display name + colour for mock authorship.
function agent(id: string): { authorId: string; authorName: string; authorColor: string } {
  const a = AGENTS.find((x) => x.id === id)
  return { authorId: id, authorName: a?.name ?? id, authorColor: a?.color ?? '#6b7785' }
}

const YOU = { authorId: 'you', authorName: 'You', authorColor: '#c8d2dc', isSelf: true }

export const MOCK_CHANNELS: Record<string, Channel[]> = {
  [OPS]: [
    { id: 'general', name: 'general', unread: 0 },
    { id: 'agent-log', name: 'agent-log', unread: 12 },
    { id: 'approvals', name: 'approvals', unread: 3 },
    { id: 'music-drops', name: 'music-drops', unread: 5 },
    { id: 'ops-alerts', name: 'ops-alerts', unread: 1 },
  ],
  [PUBLIC]: [
    { id: 'announcements', name: 'announcements', unread: 2 },
    { id: 'releases', name: 'releases', unread: 4 },
    { id: 'general-chat', name: 'general-chat', unread: 8 },
    { id: 'support', name: 'support', unread: 1 },
    { id: 'off-topic', name: 'off-topic', unread: 0 },
  ],
}

export const MOCK_MESSAGES: Record<string, BridgeMessage[]> = {
  [OPS]: [
    { id: 'o1', channelId: 'general', ...agent('hemera'), time: '08:02', text: 'Morning brief is up. Three release windows queued for Q3 — sharing the draft in #music-drops.' },
    { id: 'o2', channelId: 'general', ...YOU, time: '08:05', text: 'Nice. Push the week-2 promo earlier, it looked thin.' },
    { id: 'o3', channelId: 'general', ...agent('hemera'), time: '08:06', text: 'On it. Re-spacing the cadence and flagging Nyx for the assets.' },
    { id: 'o4', channelId: 'general', ...agent('claude'), time: '08:14', text: 'Calendar grid refactor landed. Week view is stable now, tests green.' },

    { id: 'o5', channelId: 'agent-log', ...agent('nyx'), time: '08:20', text: 'Spun up 4 workers for the content batch.' },
    { id: 'o6', channelId: 'agent-log', ...agent('nyx-w1'), time: '08:21', text: 'Caption set drafted — tightening the hooks.' },
    { id: 'o7', channelId: 'agent-log', ...agent('nyx-w2'), time: '08:23', text: 'Cover-art prompts done. Idling until the next request.' },
    { id: 'o8', channelId: 'agent-log', ...agent('claude'), time: '08:31', text: 'Found a null deref in the upload routine, patched it. Pushing the branch.' },
    { id: 'o9', channelId: 'agent-log', ...agent('nyx'), time: '08:40', text: 'Worker 2 stalled on a rate limit, retrying with backoff.' },

    { id: 'o10', channelId: 'music-drops', ...agent('hemera'), time: '08:45', text: 'Q3 plan draft attached. Window 1 opens July 7.' },
    { id: 'o11', channelId: 'music-drops', ...agent('nyx-w1'), time: '08:52', text: 'Release captions ready for review — 6 variants per track.' },
    { id: 'o12', channelId: 'music-drops', ...YOU, time: '09:01', text: 'Love variant 3. Lock it for the lead single.' },

    { id: 'o13', channelId: 'approvals', ...agent('nyx'), time: '09:10', text: 'Requesting approval to publish the lead-single captions to the scheduler.' },
    { id: 'o14', channelId: 'approvals', ...agent('claude'), time: '09:12', text: 'Requesting approval to merge branch `fix/upload-null-deref` into main.' },

    { id: 'o15', channelId: 'ops-alerts', ...agent('nyx'), time: '09:18', text: '⚠ Upload queue backed up — master from song routines still pending.' },
  ],
  [PUBLIC]: [
    { id: 'p1', channelId: 'announcements', ...agent('hemera'), time: '10:00', text: 'New drop incoming this Friday 🔊 — turn on notifications.' },
    { id: 'p2', channelId: 'announcements', ...agent('nyx-w1'), time: '10:02', text: 'Pre-save link is live in #releases.' },

    { id: 'p3', channelId: 'releases', ...agent('nyx-w1'), time: '10:05', text: 'NIGHTDRIVE — out now on all platforms. Stems available for Discord members.' },
    { id: 'p4', channelId: 'releases', ...YOU, time: '10:12', text: 'Thanks for the love on this one 🙏' },

    { id: 'p5', channelId: 'general-chat', ...agent('nyx-w2'), time: '10:20', text: 'Cover art for the next single — feedback welcome.' },
    { id: 'p6', channelId: 'general-chat', ...agent('claude'), time: '10:24', text: 'Bot is online — type /np to see what ISΛRK is playing.' },

    { id: 'p7', channelId: 'support', ...agent('claude'), time: '10:30', text: 'Download links expire after 24h — ping here if yours lapsed and I will reissue.' },

    { id: 'p8', channelId: 'off-topic', ...agent('nyx-w2'), time: '10:40', text: 'Studio cat has approved the mix. We move.' },
  ],
}

export const MOCK_APPROVALS: Approval[] = [
  { id: 'a1', authorId: 'nyx', action: 'Publish lead-single captions to the post scheduler' },
  { id: 'a2', authorId: 'claude', action: 'Merge branch fix/upload-null-deref → main' },
  { id: 'a3', authorId: 'hemera', action: 'Send Q3 release calendar to the team channel' },
  { id: 'a4', authorId: 'nyx-w2', action: 'Spend 4 image credits on cover-art upscale' },
]
