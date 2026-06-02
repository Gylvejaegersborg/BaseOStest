# iOS Shortcuts Lab — local bridge

A tiny, zero-dependency Node server that connects the **iOS Shortcuts app** on
your phone to the **Shortcuts Lab** dashboard in the Personal OS.

```
 iPhone  ──POST /trigger/note──▶  bridge (homeserver)  ──SSE /events──▶  dashboard
```

The dashboard runs in a browser and can't receive inbound webhooks itself, so
this bridge is the piece that listens for your phone and live-streams every
request into the Payload Inspector.

---

## 1. Run the bridge (homeserver)

No `npm install` needed — it only uses Node built-ins (Node ≥ 18).

```bash
cd bridge
BRIDGE_TOKEN="pick-a-long-random-secret" PORT=7842 npm start
```

You should see:

```
[shortcuts-bridge] listening on :7842
```

Keep it running. To run it as a persistent service, use `pm2`, a `systemd`
unit, or a `docker run` — anything that keeps `node server.mjs` alive.

| Env var        | Default     | Notes                                  |
| -------------- | ----------- | -------------------------------------- |
| `PORT`         | `7842`      | Port the bridge listens on             |
| `BRIDGE_TOKEN` | `changeme`  | Shared secret — **set this**           |

### Endpoints

| Method     | Path                | Who calls it        | Purpose                          |
| ---------- | ------------------- | ------------------- | -------------------------------- |
| `POST/GET` | `/trigger/:action`  | iOS Shortcuts       | Fire an action (note, ask, …)    |
| `GET`      | `/events`           | dashboard           | SSE stream of incoming requests  |
| `GET`      | `/health`           | you / uptime checks | `{ ok, clients, uptime }`        |

Auth: send the token as `?token=…` **or** an `Authorization: Bearer …` header.

---

## 2. Expose it with a tunnel

Your phone needs to reach the bridge from anywhere (cellular included). Pick one:

**Cloudflare Tunnel** (recommended — stable hostname, free):

```bash
cloudflared tunnel --url http://localhost:7842
# → https://something-random.trycloudflare.com
# (for a permanent hostname, set up a named tunnel on your domain)
```

**Tailscale** (private, no public exposure): install on the homeserver and your
phone, then use the homeserver's tailnet IP, e.g. `http://100.x.y.z:7842`.

**ngrok**: `ngrok http 7842` → use the `https://…ngrok-free.app` URL.

> On the same Wi-Fi you can skip the tunnel and just use the homeserver's LAN IP
> (`http://192.168.x.x:7842`).

---

## 3. Connect the dashboard

1. Open **Lab → Open Shortcuts Lab**.
2. In the **Connect** bar, paste the tunnel URL (e.g.
   `https://something.trycloudflare.com`) and your `BRIDGE_TOKEN`.
3. Hit **Connect** — the badge turns green (`live`). URL + token are saved
   locally for next time.

Now the Run / Simulate / Fire buttons round-trip through the real bridge, and
anything your phone sends appears live.

---

## 4. Build the iOS Shortcut

On your iPhone, in the **Shortcuts** app:

1. **+** → new shortcut → add action **Get Contents of URL**.
2. URL: `https://YOUR-TUNNEL/trigger/note`
3. Tap **Show More**:
   - **Method:** `POST`
   - **Headers:** add `Authorization` = `Bearer YOUR_TOKEN`
     *(or just append `?token=YOUR_TOKEN` to the URL)*
   - **Request Body:** `JSON`, e.g.
     ```json
     { "text": "Remember to master the new track", "tags": ["vault", "mobile"] }
     ```
     Tip: use an **Ask for Input** / **Dictate Text** action and drop the
     variable into `text` to capture a note by voice.
4. Name it "Quick Note to Vault". Add it to your Home Screen, an Action Button,
   or a "Hey Siri" phrase.

Other actions are just different paths/bodies:

| Shortcut            | Method | URL                       | Body                          |
| ------------------- | ------ | ------------------------- | ----------------------------- |
| Quick Note to Vault | POST   | `/trigger/note`           | `{ "text": "…" }`             |
| Queue a Track       | POST   | `/trigger/queue-track`    | `{ "title": "…" }`            |
| Ask Agent           | POST   | `/trigger/ask`            | `{ "prompt": "…" }`           |
| Status Check        | GET    | `/trigger/status`         | —                             |

---

## 5. Make it do real things

`buildResponse()` in `server.mjs` currently returns mock JSON. Swap each case
for a real integration — write the note to your Obsidian vault, push the track
to your queue, call your agent, etc. The dashboard will show whatever the
bridge returns.
