import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import os from 'node:os'
import { readFileSync } from 'node:fs'

// The Agent-OS gateway is reached THROUGH this server at /agent-os/* instead
// of on its own port. One origin means no CORS, no second forwarded port to
// make public in a Codespace, and it works from any device that can open
// BaseSpace itself (a private Codespaces port answers cross-origin requests
// with a GitHub login redirect, which is why phones couldn't connect).
//
// The gateway needs its token on every request (agent-os's README, "Gateway auth"). The proxy adds it, so the
// browser never holds it: AGENT_OS_GATEWAY_TOKEN, else AGENT_OS_GATEWAY_TOKEN_FILE, else the file the gateway
// writes in agent-os/data — beside this checkout (the always-on machine) or in the home folder (Codespace).
// Read per request, so a new token works without restarting Vite.
const tokenFiles = [
  process.env.AGENT_OS_GATEWAY_TOKEN_FILE,
  path.resolve(__dirname, '../agent-os/data/gateway-token'),
  path.join(os.homedir(), 'agent-os/data/gateway-token'),
].filter((f): f is string => !!f)

function gatewayToken(): string | undefined {
  const fromEnv = process.env.AGENT_OS_GATEWAY_TOKEN?.trim()
  if (fromEnv) return fromEnv
  for (const file of tokenFiles) {
    try {
      const token = readFileSync(file, 'utf8').trim()
      if (token) return token
    } catch {
      // not there: try the next place
    }
  }
  return undefined
}

const agentOs: Record<string, ProxyOptions> = {
  '/agent-os': {
    target: process.env.AGENT_OS_GATEWAY_TARGET ?? 'http://127.0.0.1:8787',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/agent-os/, ''),
    // Server-Sent Events (/events) must stream, not buffer.
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        const token = gatewayToken()
        if (token) proxyReq.setHeader('authorization', `Bearer ${token}`)
      })
      proxy.on('proxyRes', (res) => {
        if (String(res.headers['content-type'] ?? '').includes('text/event-stream')) res.headers['cache-control'] = 'no-cache'
      })
    },
  },
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: agentOs,
    // Hot reload is for development (a Codespace). On the always-on machine nobody edits live, and it once got stuck in an
    // endless update loop (~60 updates a second, a 500 MB log, the page unreachable from every device). So there it is off:
    // after a change, reload the page. BASESPACE_HMR=1 turns it on anywhere.
    hmr: process.env.CODESPACES === 'true' || process.env.BASESPACE_HMR === '1',
  },
  preview: {
    proxy: agentOs,
  },
})
