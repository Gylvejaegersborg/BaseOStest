// Client for the Agent-OS music library (agent-os/src/gateway/library-routes.ts):
// upload audio/cover files, create/edit/delete songs. These are operator actions —
// agents have no tool for them.

const BASE = import.meta.env.VITE_AGENT_OS_GATEWAY_URL?.replace(/\/$/, '')

export const AUDIO_ACCEPT = '.mp3,.wav,.flac,.m4a,.aac,.ogg,.oga,.opus,.aif,.aiff,audio/*'
export const IMAGE_ACCEPT = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp'

export interface StoredFile {
  id: string
  name: string
  size: number
  kind: 'audio' | 'image'
}

export interface SongFields {
  title?: string
  category?: 'beat' | 'song'
  bpm?: number | string | null
  musicalKey?: string
  tags?: string[]
  note?: string
  lyrics?: string
  collaborators?: { name: string; role?: string }[]
  durationSec?: number
  audioFileId?: string | null
  coverFileId?: string | null
}

export function libraryConfigured(): boolean {
  return Boolean(BASE)
}

/** URL of an uploaded file (works as an <audio>/<img> src; the gateway serves Range). */
export function libraryFileUrl(id: string): string {
  return `${BASE ?? ''}/library/files/${encodeURIComponent(id)}`
}

async function errorOf(res: Response, path: string): Promise<Error> {
  const body = await res.json().catch(() => null)
  return new Error(body?.error ?? `agent-os gateway ${res.status} on ${path}`)
}

/** Streams a file to the gateway with progress. XHR, because fetch can't report upload progress. */
export function uploadFile(file: File, onProgress?: (fraction: number) => void): Promise<StoredFile> {
  return new Promise((resolve, reject) => {
    if (!BASE) return reject(new Error('agent-os gateway not configured'))
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE}/library/files?name=${encodeURIComponent(file.name)}`)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
    xhr.onerror = () => reject(new Error('Upload failed: the OS server is unreachable.'))
    xhr.onload = () => {
      let body: any = null
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        /* not JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.id) resolve(body as StoredFile)
      else reject(new Error(body?.error ?? `Upload failed (${xhr.status}).`))
    }
    xhr.send(file)
  })
}

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!BASE) throw new Error('agent-os gateway not configured')
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw await errorOf(res, path)
  return res.json() as Promise<T>
}

export const createSong = (fields: SongFields & { title: string; audioFileId: string }) => send<{ id: string }>('POST', '/library/songs', fields)
export const updateSong = (id: string, fields: SongFields) => send<{ id: string }>('PUT', `/library/songs/${encodeURIComponent(id)}`, fields)
export const deleteSong = (id: string) => send<{ ok: true }>('DELETE', `/library/songs/${encodeURIComponent(id)}`)

/** Reads a WAV/MP3/etc.'s length in seconds from the browser, or undefined if it can't. */
export function probeDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    const done = (v?: number) => {
      URL.revokeObjectURL(url)
      resolve(v && Number.isFinite(v) ? Math.round(v) : undefined)
    }
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => done(audio.duration)
    audio.onerror = () => done()
    window.setTimeout(() => done(), 4000)
    audio.src = url
  })
}
