export interface ServiceStatus {
  id: string
  name: string
  state: 'up' | 'degraded' | 'down'
  latency: number
  spark: number[]
  endpoint: string
  uptime: string
  errorRate: string
}

export interface DeviceConn {
  id: string
  name: string
  kind: string
  online: boolean
  detail: string
  ip: string
  lastSeen: string
}

export interface OpsError {
  id: string
  severity: 'error' | 'warn' | 'info'
  source: string
  message: string
  ago: string
  context: string
}

const spark = (seed: number) =>
  Array.from({ length: 16 }, (_, i) => 30 + Math.round(40 * Math.abs(Math.sin(seed + i * 0.7))))

export const SERVICES: ServiceStatus[] = [
  { id: 's1', name: 'homeserver', state: 'up', latency: 4, spark: spark(1), endpoint: 'homeserver.local:8080', uptime: '6d 04h', errorRate: '0.0%' },
  { id: 's2', name: 'copyparty', state: 'up', latency: 11, spark: spark(2), endpoint: 'copyparty.local:3923', uptime: '6d 04h', errorRate: '0.0%' },
  { id: 's3', name: 'artist-web', state: 'up', latency: 87, spark: spark(3), endpoint: 'isark.site', uptime: '4d 11h', errorRate: '0.1%' },
  { id: 's4', name: 'vault-api', state: 'degraded', latency: 240, spark: spark(4), endpoint: 'vault.local/api', uptime: '2d 02h', errorRate: '2.4%' },
  { id: 's5', name: 'beat-db', state: 'up', latency: 33, spark: spark(5), endpoint: 'beat-db.local:5432', uptime: '6d 04h', errorRate: '0.0%' },
  { id: 's6', name: 'discord-bridge', state: 'down', latency: 0, spark: spark(6), endpoint: 'discord-bridge.local:4411', uptime: '—', errorRate: '100%' },
]

export const DEVICES: DeviceConn[] = [
  { id: 'd1', name: 'iPhone', kind: 'mobile', online: true, detail: 'Shortcuts bridge · last ping 2m ago', ip: '192.168.1.42', lastSeen: '2m ago' },
  { id: 'd2', name: 'Homeserver', kind: 'server', online: true, detail: 'CPU 38% · RAM 61% · 6d uptime', ip: '192.168.1.10', lastSeen: 'now' },
  { id: 'd3', name: 'Studio Mac', kind: 'workstation', online: true, detail: 'DAW session open', ip: '192.168.1.23', lastSeen: 'now' },
  { id: 'd4', name: 'NAS', kind: 'storage', online: true, detail: '2.1TB / 4TB used', ip: '192.168.1.5', lastSeen: 'now' },
  { id: 'd5', name: 'Pi-monitor', kind: 'sensor', online: false, detail: 'No heartbeat · 1h 12m', ip: '192.168.1.77', lastSeen: '1h 12m ago' },
]

export const OPS_ERRORS: OpsError[] = [
  { id: 'e1', severity: 'error', source: 'discord-bridge', message: 'WebSocket closed (1006) — reconnect failing', ago: '3m ago', context: '4 reconnect attempts, backoff capped at 30s. Last error: ECONNRESET.' },
  { id: 'e2', severity: 'warn', source: 'vault-api', message: 'p95 latency above 200ms threshold', ago: '12m ago', context: 'p95 240ms over the last 15m window, up from a 90ms baseline.' },
  { id: 'e3', severity: 'warn', source: 'nyx-w2', message: 'Rate limit hit, backing off 30s', ago: '18m ago', context: 'Upstream image API returned 429. Retry scheduled automatically.' },
  { id: 'e4', severity: 'info', source: 'song-routines', message: 'Master complete: track_0427 (-10.1 LUFS)', ago: '41m ago', context: 'Rendered to /vault/masters/track_0427.wav, 24-bit/48kHz.' },
  { id: 'e5', severity: 'error', source: 'beat-db', message: 'Import failed: unsupported sample rate 96kHz', ago: '1h ago', context: 'Source file needs resampling to 44.1/48kHz before import — no auto-convert configured.' },
  { id: 'e6', severity: 'info', source: 'homeserver', message: 'Container watchtower: 0 updates applied', ago: '2h ago', context: 'Checked 9 containers against upstream tags, all current.' },
]

const LOG_SOURCES = ['claude', 'hemera', 'nyx', 'cron', 'vault-api', 'copyparty', 'homeserver', 'discord']
const LOG_VERBS = [
  'task accepted',
  'task complete',
  'commit pushed',
  'upload queued',
  'cache warmed',
  'heartbeat ok',
  'token refreshed',
  'render finished',
  'retry scheduled',
  'sync ok',
]

export function makeLogLine(seed: number): { time: string; source: string; text: string } {
  const src = LOG_SOURCES[seed % LOG_SOURCES.length]
  const verb = LOG_VERBS[(seed * 7) % LOG_VERBS.length]
  return {
    time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
    source: src,
    text: `${verb} #${1000 + (seed % 9000)}`,
  }
}
