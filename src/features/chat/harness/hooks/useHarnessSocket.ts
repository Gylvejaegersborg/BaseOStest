// useHarnessSocket — the WebSocket client half of the Harness protocol
// (see ../protocol.ts for the wire contract this speaks, and
// agent-os's src/harness/gateway.ts for the server this connects to).
//
// Drafted initially by a local Qwen3:14b model (via Ollama) as a test of
// offloading mechanical/repetitive implementation work, then reviewed and
// fixed here — the draft had three real bugs that would have broken
// reconnection entirely:
//   1. connect() guarded on `if (wsRef.current) return`, but wsRef.current
//      was never cleared when a socket closed from a network error (only
//      disconnect() cleared it) — so every automatic reconnect attempt
//      after the first failure would silently no-op forever.
//   2. connect() unconditionally reset the backoff delay to its initial
//      value on every call, including automatic reconnect retries —
//      defeating exponential backoff entirely (it could never grow past
//      the first interval).
//   3. send() checked only `!wsRef.current`, not readyState — could throw
//      if called while the socket was still CONNECTING.
// Fixed below by splitting connect() into a public entry point (resets
// backoff, used for manual connect()/reconnect-button calls) and an
// internal opener (does NOT reset backoff, used by both the public entry
// point and the automatic reconnect timer), always allowing a fresh
// WebSocket to be created regardless of what wsRef.current still points
// to, and checking readyState === OPEN before sending.

import { useCallback, useEffect, useRef, useState } from 'react'
import { HARNESS_PROTOCOL_VERSION } from '../protocol'
import type { HarnessClientEvent, HarnessServerEvent } from '../protocol'

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error'

const INITIAL_BACKOFF_MS = 500
const MAX_BACKOFF_MS = 10_000

export interface UseHarnessSocketResult {
  connectionState: ConnectionState
  connect: () => void
  disconnect: () => void
  send: (command: HarnessClientEvent) => void
  subscribe: (handler: (event: HarnessServerEvent) => void) => () => void
}

export function useHarnessSocket(url: string, options?: { autoConnect?: boolean }): UseHarnessSocketResult {
  const autoConnect = options?.autoConnect ?? true

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')

  // None of this belongs in React state — it's connection plumbing, not
  // render input. useRef throughout so re-renders never reset it.
  const wsRef = useRef<WebSocket | null>(null)
  const pendingCommandsRef = useRef<HarnessClientEvent[]>([])
  const subscribersRef = useRef<Set<(event: HarnessServerEvent) => void>>(new Set())
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const backoffDelayRef = useRef<number>(INITIAL_BACKOFF_MS)
  // True only when disconnect() was called explicitly (or the owning
  // component unmounted) — this is what distinguishes "stop trying to
  // reconnect" from "a network hiccup closed the socket, keep retrying."
  const explicitlyDisconnectedRef = useRef<boolean>(false)

  function flushPendingCommands(ws: WebSocket): void {
    if (pendingCommandsRef.current.length === 0) return
    const queued = pendingCommandsRef.current
    pendingCommandsRef.current = []
    for (const command of queued) {
      ws.send(JSON.stringify(command))
    }
  }

  function clearReconnectTimer(): void {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }

  /** Opens a fresh WebSocket and wires its lifecycle handlers. Does NOT
   *  touch backoffDelayRef — callers (openConnection for a fresh manual
   *  connect, scheduleReconnect for an automatic retry) decide whether
   *  the backoff should reset. Always creates a new WebSocket regardless
   *  of what wsRef.current currently holds — a stale reference to an
   *  already-closed socket must never block opening a new one (this was
   *  the bug that broke reconnection in the first draft). */
  function openSocket(): void {
    explicitlyDisconnectedRef.current = false
    setConnectionState('connecting')

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnectionState('connected')
      // Successful connection resets the backoff for the NEXT failure,
      // so a brief blip doesn't leave a stale long delay armed from a
      // previous, unrelated outage.
      backoffDelayRef.current = INITIAL_BACKOFF_MS
      ws.send(JSON.stringify({ type: 'hello', client: 'baseos', version: HARNESS_PROTOCOL_VERSION } satisfies HarnessClientEvent))
      flushPendingCommands(ws)
    }

    ws.onmessage = (event) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(event.data)
      } catch (err) {
        console.warn('[useHarnessSocket] received a message that was not valid JSON, skipping:', err)
        return
      }
      const serverEvent = parsed as HarnessServerEvent
      // Snapshot the subscriber set before iterating: a handler that
      // subscribes/unsubscribes another handler mid-dispatch must not
      // corrupt this iteration.
      for (const handler of [...subscribersRef.current]) {
        try {
          handler(serverEvent)
        } catch (err) {
          // One broken subscriber must not prevent others from receiving
          // the event or crash the socket's message loop.
          console.error('[useHarnessSocket] a subscriber threw while handling an event:', err)
        }
      }
    }

    ws.onclose = () => {
      wsRef.current = null
      if (explicitlyDisconnectedRef.current) {
        setConnectionState('disconnected')
        return
      }
      setConnectionState('reconnecting')
      scheduleReconnect()
    }

    ws.onerror = () => {
      // A WebSocket error event is normally followed by a close event
      // (per the spec), so onclose's reconnect scheduling still applies
      // right after this fires — this handler only needs to reflect the
      // error in state, not drive reconnection itself.
      setConnectionState('error')
    }
  }

  /** Schedules ONE automatic reconnect attempt after the current backoff
   *  delay, then doubles the delay (capped) for the NEXT attempt if this
   *  one also fails. Deliberately does not reset backoffDelayRef — that
   *  only happens on a genuine fresh connect() call or a successful
   *  ws.onopen, never here. */
  function scheduleReconnect(): void {
    clearReconnectTimer()
    const delay = backoffDelayRef.current
    reconnectTimerRef.current = setTimeout(() => {
      backoffDelayRef.current = Math.min(backoffDelayRef.current * 2, MAX_BACKOFF_MS)
      openSocket()
    }, delay)
  }

  /** Public entry point for both the initial auto-connect and any
   *  user-triggered "Reconnect" action. Resets the backoff to its
   *  initial value — a deliberate fresh attempt should not inherit a
   *  long delay left over from a previous, unrelated failure sequence —
   *  and cancels any pending automatic-retry timer so it can't race this
   *  explicit call. */
  const connect = useCallback(() => {
    clearReconnectTimer()
    backoffDelayRef.current = INITIAL_BACKOFF_MS
    openSocket()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  const disconnect = useCallback(() => {
    explicitlyDisconnectedRef.current = true
    clearReconnectTimer()
    if (wsRef.current) {
      // Prevent the close handler from firing a reconnect for a socket
      // we are deliberately tearing down (harmless since
      // explicitlyDisconnectedRef is already set, but avoids a
      // transient 'reconnecting' state flash before 'disconnected').
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }
    setConnectionState('disconnected')
  }, [])

  const send = useCallback((command: HarnessClientEvent) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // Not connected yet (or mid-reconnect) — queue rather than drop,
      // so a message typed while briefly offline still gets delivered
      // once the connection comes back.
      pendingCommandsRef.current.push(command)
      return
    }
    ws.send(JSON.stringify(command))
  }, [])

  const subscribe = useCallback((handler: (event: HarnessServerEvent) => void) => {
    subscribersRef.current.add(handler)
    return () => {
      subscribersRef.current.delete(handler)
    }
  }, [])

  useEffect(() => {
    if (autoConnect) {
      connect()
    }
    // Unmounting behaves exactly like an explicit disconnect() — no
    // reconnect attempts should survive the component that owns this
    // hook going away.
    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  return { connectionState, connect, disconnect, send, subscribe }
}
