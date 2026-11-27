import { createAgent } from '@ui-sdk/react/agent'
import { subscribeToSessionEvents, respondUiRequest, type SessionEvent } from './sessionClient'

export interface UiRequestPayload {
  requestId: string
  sessionId: string
  turnId: string
  operation: 'snapshot' | 'query' | 'act'
  timeoutMs: number
  source: 'agent' | 'user'
  input: Record<string, unknown>
}

export function startUiBridge(sessionId: string): () => void {
  let approvedAct = false
  const agent = createAgent({
    allow: async () => approvedAct,
  })

  return subscribeToSessionEvents(sessionId, (event: SessionEvent) => {
    if (event.type !== 'ui.request') return
    const envelope = event.payload as unknown as UiRequestPayload
    if (envelope.sessionId !== sessionId) return
    void (async () => {
      try {
        if (envelope.operation === 'snapshot') {
          await respondUiRequest(envelope.requestId, { ok: true, result: agent.snapshot() })
          return
        }
        if (envelope.operation === 'query') {
          const input = envelope.input
          await respondUiRequest(envelope.requestId, {
            ok: true,
            result: await agent.query({
              text: typeof input.text === 'string' ? input.text : undefined,
              within: typeof input.within === 'string' ? input.within : undefined,
              kind: typeof input.kind === 'string' ? input.kind : undefined,
              closed: input.closed === true,
              from: typeof input.from === 'number' ? input.from : undefined,
            }),
          })
          return
        }

        const token = typeof envelope.input._approvalToken === 'string'
          ? envelope.input._approvalToken
          : typeof envelope.input._approvalId === 'string'
            ? envelope.input._approvalId
            : undefined
        approvedAct = Boolean(token)
        const steps = Array.isArray(envelope.input.steps)
          ? envelope.input.steps as { ref: string; action: string; args?: unknown[] }[]
          : []
        const result = await agent.act({ steps }, { signal: AbortSignal.timeout(envelope.timeoutMs) })
        if (result.ok) {
          await respondUiRequest(envelope.requestId, { ok: true, result })
        } else {
          await respondUiRequest(envelope.requestId, {
            ok: false,
            outcome: 'rejected',
            error: result.error?.message ?? 'UI SDK action was not approved',
          })
        }
        approvedAct = false
      } catch (error) {
        await respondUiRequest(envelope.requestId, {
          ok: false,
          outcome: 'cancelled',
          error: error instanceof Error ? error.message : 'UI SDK action cancelled',
        })
      }
    })()
  })
}
