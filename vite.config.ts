import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// The Agent-OS gateway is reached THROUGH this server at /agent-os/* instead
// of on its own port. One origin means no CORS, no second forwarded port to
// make public in a Codespace, and it works from any device that can open
// BaseSpace itself (a private Codespaces port answers cross-origin requests
// with a GitHub login redirect, which is why phones couldn't connect).
const agentOs: Record<string, ProxyOptions> = {
  '/agent-os': {
    target: process.env.AGENT_OS_GATEWAY_TARGET ?? 'http://127.0.0.1:8787',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/agent-os/, ''),
    // Server-Sent Events (/events) must stream, not buffer.
    configure: (proxy) => {
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
