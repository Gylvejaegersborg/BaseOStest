import http from 'node:http'
import { randomUUID } from 'node:crypto'

/**
 * iOS Shortcuts Lab — local bridge.
 *
 * A tiny zero-dependency server that sits between the iOS Shortcuts app and
 * the Personal OS dashboard:
 *
 *   iPhone  ──POST /trigger/note──▶  bridge  ──SSE /events──▶  dashboard
 *
 * Run it on your always-on box (homeserver) and expose it with a tunnel
 * (Cloudflare Tunnel / Tailscale / ngrok). See README.md.
 *
 *   BRIDGE_TOKEN=secret PORT=7842 node server.mjs
 */

const PORT = Number(process.env.PORT) || 7842
const TOKEN = process.env.BRIDGE_TOKEN || 'changeme'
const MAX_BODY = 1_000_000 // 1 MB

/** Connected dashboard SSE streams. */
const clients = new Set()
let queueLen = 0

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
}

function authorized(req, url) {
  const auth = req.headers['authorization'] || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  return bearer === TOKEN || url.searchParams.get('token') === TOKEN
}

function broadcast(event) {
  const frame = `data: ${JSON.stringify(event)}\n\n`
  for (const res of clients) res.write(frame)
}

/** Mock responses — swap these out for real integrations (Obsidian, queue, agent…). */
function buildResponse(action, request) {
  switch (action) {
    case 'note':
      return {
        ok: true,
        noteId: `n_${Math.random().toString(36).slice(2, 8)}`,
        vault: 'Personal OS',
        chars: String(request?.text ?? '').length,
        savedAt: new Date().toISOString(),
      }
    case 'queue-track':
      return { ok: true, queued: request?.title ?? 'Untitled', position: request?.position ?? 'end', queueLength: (queueLen += 1) }
    case 'ask':
      return { ok: true, answer: '3 events today — next up "Mix review" at 15:00.', agent: 'os-bridge', tookMs: Math.floor(Math.random() * 700 + 120) }
    case 'status':
      return { ok: true, bridge: 'online', services: { notes: 'up', queue: 'up', agent: 'up' }, clients: clients.size, uptime: Math.round(process.uptime()) }
    default:
      return { ok: true, action, received: true }
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  cors(res)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  // Health probe — no auth, handy for the tunnel + uptime checks.
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    return res.end(JSON.stringify({ ok: true, clients: clients.size, uptime: Math.round(process.uptime()) }))
  }

  // SSE stream the dashboard subscribes to.
  if (url.pathname === '/events') {
    if (!authorized(req, url)) {
      res.writeHead(401)
      return res.end('unauthorized')
    }
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    })
    res.write('retry: 3000\n\n')
    res.write(`event: hello\ndata: ${JSON.stringify({ ok: true, clients: clients.size + 1 })}\n\n`)
    clients.add(res)
    // Comment pings keep the connection alive through proxies/tunnels.
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000)
    req.on('close', () => {
      clearInterval(ping)
      clients.delete(res)
    })
    return
  }

  // Incoming trigger from the iOS Shortcuts app (or the dashboard test buttons).
  const match = url.pathname.match(/^\/trigger\/([\w-]+)$/)
  if (match) {
    if (!authorized(req, url)) {
      res.writeHead(401, { 'content-type': 'application/json' })
      return res.end(JSON.stringify({ ok: false, error: 'unauthorized' }))
    }
    const action = match[1]
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > MAX_BODY) req.destroy()
    })
    req.on('end', () => {
      let request = null
      if (body) {
        try {
          request = JSON.parse(body)
        } catch {
          request = { raw: body }
        }
      }
      // Fold non-token query params in (lets GET shortcuts pass data too).
      for (const [k, v] of url.searchParams) {
        if (k === 'token' || k === 'source') continue
        request = request || {}
        request[k] = v
      }
      const response = buildResponse(action, request)
      broadcast({
        id: randomUUID(),
        action,
        method: req.method,
        at: new Date().toISOString(),
        request,
        response,
        source: url.searchParams.get('source') || 'phone',
        ip: req.socket.remoteAddress,
      })
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(response))
    })
    return
  }

  res.writeHead(404, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ ok: false, error: 'not found' }))
})

server.listen(PORT, () => {
  console.log(`[shortcuts-bridge] listening on :${PORT}`)
  if (TOKEN === 'changeme') console.warn('[shortcuts-bridge] WARNING: using default token — set BRIDGE_TOKEN')
})
