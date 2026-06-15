import { useCallback, useEffect, useRef, useState } from 'react'

export interface WikiSummary {
  title: string
  extract: string
  description?: string
  thumbnail?: string
  url: string
}

const CACHE_KEY = 'os:calendar:wiki'
// REST v1 summary endpoint — sends permissive CORS headers, so it works from the browser.
const ENDPOINT = 'https://en.wikipedia.org/api/rest_v1/page/random/summary'
export const RANDOM_FALLBACK = 'https://en.wikipedia.org/wiki/Special:Random'

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

async function fetchRandom(signal: AbortSignal): Promise<WikiSummary> {
  // Skip disambiguation / empty pages — retry a few times for a "real" article.
  for (let i = 0; i < 4; i++) {
    const res = await fetch(ENDPOINT, { headers: { accept: 'application/json' }, signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const j = await res.json()
    if (j.type === 'disambiguation' || !j.extract) continue
    return {
      title: j.title,
      extract: j.extract,
      description: j.description,
      thumbnail: j.thumbnail?.source,
      url: j.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(j.title)}`,
    }
  }
  throw new Error('no article')
}

/**
 * A random Wikipedia article that stays stable through the day (cached per date
 * in localStorage), with a manual reroll. Falls back gracefully when offline.
 */
export function useDailyWikipedia() {
  const [data, setData] = useState<WikiSummary | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const acRef = useRef<AbortController | null>(null)

  const load = useCallback(async (force: boolean) => {
    if (!force) {
      try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (raw) {
          const c = JSON.parse(raw)
          if (c.date === todayKey() && c.data) {
            setData(c.data)
            setStatus('ready')
            return
          }
        }
      } catch {
        /* ignore */
      }
    }
    acRef.current?.abort()
    const ac = new AbortController()
    acRef.current = ac
    setStatus('loading')
    try {
      const d = await fetchRandom(ac.signal)
      setData(d)
      setStatus('ready')
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayKey(), data: d }))
      } catch {
        /* ignore quota */
      }
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    load(false)
    return () => acRef.current?.abort()
  }, [load])

  const reroll = useCallback(() => load(true), [load])
  return { data, status, reroll }
}
