import { useCallback, useEffect, useState } from 'react'
import { agentOsConfigured, fetchOps } from './client'
import type { OpsReport } from './client'

export type { OpsReport, OpsProblem, TailDevice } from './client'

/**
 * The gateway's real Ops report (agent-os: GET /ops): the server and gateway, services, Tailscale devices, problems and the
 * tail of the real log files. Polled every 10 s while the page is open. Keeps the last good answer if one poll fails.
 */
export function useOps() {
  const [data, setData] = useState<OpsReport | null>(null)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setData(await fetchOps())
      setUpdatedAt(new Date().toISOString())
      setError('')
    } catch (err) {
      setError((err as Error)?.message ?? 'unreachable')
    }
  }, [])

  useEffect(() => {
    if (!agentOsConfigured()) {
      setError('no gateway is configured')
      return
    }
    void refresh()
    const id = window.setInterval(() => void refresh(), 10_000)
    return () => window.clearInterval(id)
  }, [refresh])

  return { data, error, updatedAt }
}
