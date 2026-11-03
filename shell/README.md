# BaseSpace HUD shell (Tauri)

The desktop around the launcher/HUD (`src/features/hud/`): what a browser tab can't do.

- **Alt+B, from any app**, shows the launcher over everything, on the monitor the cursor is on; it hides when
  you click elsewhere. Ctrl+Alt+M switches Search / Chat inside it.
- **The dot** (launcher → Dot, or the tray): a small click-through window kept beside the cursor across the
  desktop. Hold **Ctrl+Alt+B** (the voice service's key) and ask: it takes a screenshot of the monitor you're on
  for that one turn and sends it with your words to the HUD thread (Hemera by default).
- **`capture_screen`** returns JPEGs to the page (≤ 1568 px); nothing is written to disk, and agent-os never
  stores them either (a `[screenshot]` marker in history).
- Tray: Launcher, Dot on/off, Quit.

Both windows load `/hud?window=launcher|dot` from BaseSpace's dev server (`BASESPACE_URL`, default
`http://localhost:5173`), so the HUD itself is the web app. Only that origin may call the shell's commands
(`src-tauri/capabilities/hud.json`).

## Run

Needs Rust (`rustup`, stable, MSVC) and the Visual Studio C++ build tools, once. BaseSpace's dev server and the
agent-os gateway should be running; the voice service for push-to-talk.

```
cd shell
npm install
npm run dev        # or: cargo build in src-tauri, then run src-tauri/target/debug/basespace-hud.exe
```

Push-to-talk reaches exactly one page: each final has an id, and the page in front claims it (`POST /v1/claim`
on the voice service) — a visible shell window or the focused browser tab; pages behind wait 400 ms.

Not yet: an installer and autostart; pointing at things on screen.
