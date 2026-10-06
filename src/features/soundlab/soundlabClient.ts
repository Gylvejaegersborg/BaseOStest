// Client for the Agent-OS Sound Lab (agent-os/src/gateway/soundlab-routes.ts): synthesized
// candidate sounds the operator listens to and judges. Operator routes: nothing here can be
// done by an agent.

const BASE = import.meta.env.VITE_AGENT_OS_GATEWAY_URL?.replace(/\/$/, '') ?? ''

export type SoundKind = '808' | 'kick' | 'snare' | 'clap' | 'perc' | 'hat-closed' | 'hat-open' | 'bell' | 'pluck' | 'keys' | 'pad' | 'strings' | 'lead'
export type Verdict = 'pending' | 'accepted' | 'maybe' | 'skipped'

export const KINDS: { id: SoundKind; label: string }[] = [
  { id: '808', label: '808' },
  { id: 'kick', label: 'Kick' },
  { id: 'snare', label: 'Snare' },
  { id: 'clap', label: 'Clap' },
  { id: 'perc', label: 'Perc' },
  { id: 'hat-closed', label: 'Closed hat' },
  { id: 'hat-open', label: 'Open hat' },
  { id: 'bell', label: 'Bell' },
  { id: 'pluck', label: 'Pluck' },
  { id: 'keys', label: 'Keys' },
  { id: 'pad', label: 'Pad' },
  { id: 'strings', label: 'Strings' },
  { id: 'lead', label: 'Lead' },
]

export interface Candidate {
  id: string
  kind: SoundKind
  label: string
  parentId?: string
  verdict: Verdict
  createdAt: string
}

export type Stats = Record<string, Record<Verdict, number>>

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}/soundlab${path}`, {
    method,
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error ?? `Sound Lab ${res.status}`)
  return json as T
}

export const soundUrl = (id: string) => `${BASE}/soundlab/candidates/${encodeURIComponent(id)}/audio`
export const listSounds = (kind: SoundKind, verdict: Verdict) =>
  call<{ candidates: Candidate[] }>('GET', `/candidates?kind=${kind}&verdict=${verdict}`).then((r) => r.candidates)
export const generateSounds = (kind: SoundKind, count: number) => call<{ candidates: Candidate[] }>('POST', '/batches', { kind, count }).then((r) => r.candidates)
export const judgeSound = (id: string, verdict: Verdict) => call<Candidate>('POST', `/candidates/${encodeURIComponent(id)}/judge`, { verdict })
export const soundStats = () => call<Stats>('GET', '/stats')

export interface PackSummary {
  id: string
  name: string
  createdAt: string
  counts: Record<string, number>
  sounds: { file: string; label: string; kind: string }[]
  zipBytes: number
  licenseNote: string
}

/** Everything the operator has kept, across all kinds. */
export const listKept = () => call<{ candidates: Candidate[] }>('GET', '/candidates?verdict=accepted').then((r) => r.candidates)
export const buildPack = (name: string, ids: string[]) => call<PackSummary>('POST', '/packs', { name, ids })
export const listPacks = () => call<{ packs: PackSummary[] }>('GET', '/packs').then((r) => r.packs)
export const packDownloadUrl = (id: string) => `${BASE}/soundlab/packs/${encodeURIComponent(id)}/download`
