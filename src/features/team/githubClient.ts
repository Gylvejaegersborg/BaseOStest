// Thin client for the GitHub contents + workflow-dispatch APIs. The team's state
// lives as files committed by the team-* workflows; the dashboard reads them here.
// Auth: a fine-grained PAT (this repo only; Contents: read, Actions: read+write)
// stored in localStorage — same pattern as the Anthropic key in Chat.tsx.

const REPO = 'Gylvejaegersborg/BaseOStest'
// Scheduled workflows run (and commit) on the repo's default branch.
const DEFAULT_REF = 'claude/personal-os-dashboard-hKKNC'

export const TOKEN_KEY = 'os:team:ghToken'
export const REF_KEY = 'os:team:ghRef'

export const getToken = () => localStorage.getItem(TOKEN_KEY) ?? ''
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t)
export const getRef = () => localStorage.getItem(REF_KEY) || DEFAULT_REF

const api = `https://api.github.com/repos/${REPO}`

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const token = getToken()
  return {
    Accept: 'application/vnd.github+json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

/** Fetch a repo file as raw text. Falls back to raw.githubusercontent.com when no
 *  token is set (works only if the repo is public). Throws on any failure. */
export async function fetchFile(path: string): Promise<string> {
  const ref = getRef()
  if (getToken()) {
    const res = await fetch(`${api}/contents/${path}?ref=${encodeURIComponent(ref)}`, {
      headers: headers({ Accept: 'application/vnd.github.raw+json' }),
    })
    if (!res.ok) throw new Error(`GET ${path}: HTTP ${res.status}`)
    return res.text()
  }
  const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${ref}/${path}`)
  if (!res.ok) throw new Error(`GET ${path}: HTTP ${res.status}`)
  return res.text()
}

export async function fetchJson<T>(path: string): Promise<T> {
  return JSON.parse(await fetchFile(path)) as T
}

export interface DirEntry {
  name: string
  path: string
  type: 'file' | 'dir'
}

/** List a repo directory (contents API; needs a token for private repos). */
export async function listDir(path: string): Promise<DirEntry[]> {
  const res = await fetch(`${api}/contents/${path}?ref=${encodeURIComponent(getRef())}`, {
    headers: headers(),
  })
  if (!res.ok) throw new Error(`LIST ${path}: HTTP ${res.status}`)
  const entries = (await res.json()) as DirEntry[]
  return Array.isArray(entries) ? entries : []
}

/** Dispatch a workflow (e.g. team-publish.yml with {action_id, decision}). */
export async function dispatchWorkflow(
  workflowFile: string,
  inputs: Record<string, string>,
): Promise<void> {
  if (!getToken()) throw new Error('A GitHub token is required to dispatch workflows.')
  const res = await fetch(`${api}/actions/workflows/${workflowFile}/dispatches`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ref: getRef(), inputs }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Dispatch failed: HTTP ${res.status}`)
  }
}
