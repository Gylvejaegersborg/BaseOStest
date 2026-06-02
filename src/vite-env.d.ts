/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the Discord bridge bot service (Node + discord.js).
   * When unset, the dashboard runs on built-in mock data.
   * e.g. "http://homeserver.local:8787" or "https://bridge.isark.dev"
   */
  readonly VITE_DISCORD_BRIDGE_URL?: string
  /**
   * Optional explicit WebSocket URL for live message streaming.
   * When unset, it is derived from VITE_DISCORD_BRIDGE_URL
   * (http→ws, https→wss) with a `/gateway` path.
   */
  readonly VITE_DISCORD_BRIDGE_WS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
