import { useCallback, useEffect, useRef, useState } from 'react'
import * as bridge from './bridgeClient'
import { MOCK_CHANNELS, MOCK_MESSAGES } from './mockData'
import type { BridgeMessage, Channel, ConnectionState } from './types'

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function mergeById(prev: BridgeMessage[], incoming: BridgeMessage[]): BridgeMessage[] {
  const seen = new Set(prev.map((m) => m.id))
  return [...prev, ...incoming.filter((m) => !seen.has(m.id))]
}

/**
 * Owns channels, messages and connection state for one guild. Talks to the
 * bridge service when VITE_DISCORD_BRIDGE_URL is configured and reachable,
 * otherwise falls back to the bundled mock data so the dashboard stays usable
 * standalone. `activeChannelId` drives live message fetching and unread counts.
 */
export function useDiscordBridge(guildId: string, activeChannelId: string) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [messages, setMessages] = useState<BridgeMessage[]>([])
  const [connection, setConnection] = useState<ConnectionState>('connecting')

  // Keep the active channel in a ref so the gateway subscription can read the
  // current value without re-subscribing on every channel switch.
  const activeRef = useRef(activeChannelId)
  activeRef.current = activeChannelId

  const live = connection === 'live'

  // Load channels (+ seed messages) whenever the guild changes.
  useEffect(() => {
    let cancelled = false

    const useMock = () => {
      if (cancelled) return
      setChannels(MOCK_CHANNELS[guildId] ?? [])
      setMessages(MOCK_MESSAGES[guildId] ?? [])
    }

    if (!bridge.bridgeConfigured()) {
      setConnection('mock')
      useMock()
      return () => {
        cancelled = true
      }
    }

    setConnection('connecting')
    setMessages([])
    bridge
      .fetchChannels(guildId)
      .then((chs) => {
        if (cancelled) return
        setChannels(chs)
        setConnection('live')
      })
      .catch(() => {
        if (cancelled) return
        // Service configured but unreachable — degrade to mock, flagged.
        setConnection('error')
        useMock()
      })

    return () => {
      cancelled = true
    }
  }, [guildId])

  // In live mode, fetch the active channel's history on selection.
  useEffect(() => {
    if (!live) return
    let cancelled = false
    bridge
      .fetchMessages(guildId, activeChannelId)
      .then((msgs) => {
        if (!cancelled) setMessages((prev) => mergeById(prev, msgs))
      })
      .catch(() => {
        /* keep whatever we have */
      })
    return () => {
      cancelled = true
    }
  }, [live, guildId, activeChannelId])

  // Live gateway: stream new messages and bump unread on inactive channels.
  useEffect(() => {
    if (!bridge.bridgeConfigured()) return
    const dispose = bridge.openGateway(
      guildId,
      (event) => {
        if (event.type !== 'message') return
        const msg = event.message
        setMessages((prev) => mergeById(prev, [msg]))
        if (msg.channelId !== activeRef.current && !msg.isSelf) {
          setChannels((prev) =>
            prev.map((c) => (c.id === msg.channelId ? { ...c, unread: c.unread + 1 } : c)),
          )
        }
      },
      (open) => setConnection((c) => (open ? 'live' : c === 'live' ? 'error' : c)),
    )
    return dispose
  }, [guildId])

  // Clear a channel's unread badge.
  const markRead = useCallback((channelId: string) => {
    setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, unread: 0 } : c)))
  }, [])

  // Send a message: real POST when live, optimistic local append otherwise.
  const send = useCallback(
    async (channelId: string, text: string) => {
      const optimistic: BridgeMessage = {
        id: `local-${Date.now()}`,
        channelId,
        authorId: 'you',
        authorName: 'You',
        authorColor: '#c8d2dc',
        isSelf: true,
        time: nowHHMM(),
        text,
      }
      if (!live) {
        setMessages((prev) => [...prev, optimistic])
        return
      }
      // Show immediately, then reconcile with the server's echoed message.
      setMessages((prev) => [...prev, optimistic])
      try {
        const saved = await bridge.sendMessage(guildId, channelId, text)
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)))
      } catch {
        /* leave the optimistic message in place */
      }
    },
    [live, guildId],
  )

  return { channels, messages, connection, markRead, send }
}
