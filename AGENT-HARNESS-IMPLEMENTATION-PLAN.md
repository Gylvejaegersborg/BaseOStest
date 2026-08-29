# Agent Harness — komplett implementeringsplan

> Låst implementeringsplan for å erstatte `/chat` i BaseOS med en full Agent
> Harness-modul, drevet av `agent-os` som eneste agent-runtime over WebSocket.
> Bygger på faktisk BaseOS-struktur (`claude/personal-os-dashboard-hKKNC`) og
> faktisk agent-os-struktur (event-log, event bus, agent-loop, workers,
> tasks/flows, subagents, automations, memory, permissions, identity) — ikke
> en antatt arkitektur.

## 0. Fastsett målbildet

Dette er det vi bygger:

```
BaseOS
│
├── Home
├── Notes
├── Chat  ← HELT NY AGENT HARNESS-MODUL
├── Calendar
├── Projects
├── Lab
├── Meeting Room
├── Team
├── Ops
└── Weather
```

Kun `/chat` endres i denne implementasjonen.

Team, Meeting Room, Notes, Calendar osv. skal ikke konverteres til
Harness-paneler nå.

Chat blir derimot:

```
/chat
│
└── Agent Harness
    │
    ├── Workspace
    │   ├── Chat
    │   ├── Meeting
    │   ├── Files
    │   ├── Browser
    │   └── Tool Views
    │
    ├── Right Rail
    │   ├── Agents
    │   ├── Tasks
    │   ├── Automations
    │   └── Activity
    │
    ├── Bottom Rail
    │   └── Terminal
    │
    └── HUD
```

Det er én modul under Chat.

## 1. Baseline: dagens BaseOS

BaseOS er i dag en React 18/Vite/TypeScript-applikasjon med Tailwind,
react-router-dom, lucide-react og `@dnd-kit/core`. Det er allerede et godt
grunnlag for workspace-layouten.

AppShell har allerede:
- NavBar
- MobileNav
- TopBar
- main / Outlet
- StatusBar

så vi skal ikke bygge et nytt globalt shell. `/chat` skal bruke eksisterende
AppShell.

Dagens Chat er derimot en monolitt på rundt 600 linjer som:
- holder conversations lokalt
- holder API-key i localStorage
- kaller Anthropic direkte fra browseren
- streamer Anthropic SSE direkte
- har Claude/Hemera/Nyx som lokale mock-agenter
- lagrer historikk i localStorage
- har filvedlegg
- har en enkel mic-knapp

Dette skal bort som runtime-arkitektur.

## 2. Første Git-operasjon

Start med riktig branch.

```bash
git clone https://github.com/Gylvejaegersborg/BaseOStest.git
cd BaseOStest

git checkout claude/personal-os-dashboard-hKKNC
git pull

git checkout -b feature/agent-harness
```

Ikke arbeid direkte på eksisterende Claude-branch.

For agent-os:

```bash
git clone https://github.com/Gylvejaegersborg/agent-os.git
cd agent-os

git checkout main
git pull

git checkout -b feature/harness-runtime
```

## 3. Målarkitektur

Det skal ende slik:

```
┌─────────────────────────────────────────────────────────────┐
│                         BaseOS                               │
│                                                             │
│  NavBar │ Chat Harness                                     │
│         │                                                   │
│         │ ┌─────────────────────────────────────────────┐   │
│         │ │ Harness Top Bar                             │   │
│         │ ├─────────────────────────────────────────────┤   │
│         │ │                                             │   │
│         │ │          Workspace                          │   │
│         │ │                                             │   │
│         │ │     Chat / Meeting / Files / Tools          │   │
│         │ │                                             │   │
│         │ ├─────────────────────────────────────────────┤   │
│         │ │ Terminal                                    │   │
│         │ └─────────────────────────────────────────────┘   │
│         │                              │                    │
│         │                         Right Rail                │
│         │                                                   │
└─────────┴───────────────────────────────────────────────────┘
                              │
                              │ WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       agent-os                              │
│                                                             │
│ Event Log                                                   │
│ Event Bus                                                   │
│ Agent Loop                                                  │
│ Tasks / Flows                                               │
│ Workers                                                     │
│ Permissions                                                 │
│ Personas                                                    │
│ Memory                                                      │
│ Subagents                                                   │
│ Automations                                                 │
│                                                             │
│ Harness Gateway                                             │
└─────────────────────────────────────────────────────────────┘
```

agent-os har allerede event-log, event bus, agent loop, worker, task/flow,
subagents, scheduler, memory, permissions og identity.

Det betyr at vi ikke lager en ny agentmotor i BaseOS.

## 4. Del ansvaret nøyaktig

### BaseOS

BaseOS skal eie:
- UI
- routing
- workspace layout
- paneler
- drag/drop
- HUD renderer
- terminal renderer
- chat renderer
- Meeting renderer
- agent status
- task status
- approval cards
- voice controls
- layout persistence
- WebSocket client

### agent-os

agent-os skal eie:
- sessions
- agent loop
- models
- workers
- tools
- permissions
- tasks
- flows
- subagents
- automations
- memory
- identities/personas
- event log
- event bus
- terminal PTY
- shared workspace state
- Harness WebSocket gateway

Dette skillet skal holdes konsekvent.

## 5. Ikke behold Anthropic-kallet i BaseOS

Dagens Chat gjør:

```
Browser
  ↓
api.anthropic.com
```

Det skal erstattes med:

```
Browser
  ↓
Harness WebSocket
  ↓
agent-os
  ↓
ModelAdapter
  ↓
Anthropic/OpenAI/Ollama
```

agent-os har allerede en modell-abstraksjon og `createModelForAgent()`, så
UI-et skal ikke vite hvilken provider som brukes.

API-nøkler skal derfor ikke lenger ligge i Chat-komponenten eller sendes
direkte fra browseren.

## 6. Lag Harness-protokollen først

Dette er det viktigste implementeringssteget.

Opprett i agent-os:

```
src/harness/
├── protocol.ts
├── gateway.ts
├── sessions.ts
├── agents.ts
├── tasks.ts
├── permissions.ts
├── workspace.ts
├── terminal.ts
└── index.ts
```

### protocol.ts

Definer én union av events.

```ts
export type HarnessServerEvent =
  | HarnessReadyEvent
  | SessionCreatedEvent
  | SessionStateEvent
  | AgentStatusEvent
  | MessageStartEvent
  | MessageDeltaEvent
  | MessageEndEvent
  | ToolStartEvent
  | ToolOutputEvent
  | ToolEndEvent
  | PermissionRequestEvent
  | TaskEvent
  | AutomationEvent
  | WorkspaceEvent
  | TerminalOutputEvent
  | ErrorEvent
```

Og klient-events:

```ts
export type HarnessClientEvent =
  | CreateSessionCommand
  | SendMessageCommand
  | CancelTurnCommand
  | ResolvePermissionCommand
  | SubscribeSessionCommand
  | CreateTaskCommand
  | TerminalInputCommand
  | TerminalResizeCommand
  | WorkspaceUpdateCommand
  | SetAgentCommand
```

## 7. Standardiser event-formatet

Alle events skal ha:

```ts
interface HarnessEventBase {
  id: string
  type: string
  timestamp: string
  sessionId?: string
  agentId?: string
  taskId?: string
}
```

Eksempel:

```json
{
  "id": "evt_123",
  "type": "agent.message.delta",
  "timestamp": "2026-08-30T10:20:00.000Z",
  "sessionId": "sess_123",
  "agentId": "claude",
  "payload": {
    "messageId": "msg_123",
    "delta": "Hello"
  }
}
```

Dette blir kontrakten mellom systemene.

## 8. Event Bus skal være sannheten

agent-os har allerede en in-process event bus som publiserer events og
skriver `bus.event.published` til event-loggen. Den er med vilje ikke en
distributed message broker.

Behold dette.

Ikke legg Redis inn nå.

Lag:

```
agent-os Event Bus
       │
       ├── Agent events
       ├── Task events
       ├── Permission events
       ├── Automation events
       ├── Workspace events
       └── Terminal events
                │
                ▼
Harness Gateway
                │
                ▼
             WebSocket
```

## 9. Harness Gateway

Lag en WebSocket-server i agent-os.

Den skal:
- akseptere klient
- autentisere lokal session
- subscribe til event bus
- filtrere events
- sende events til riktig WebSocket-klient
- motta commands
- dispatch'e commands til agent-os
- avslutte subscription når socket lukkes

Eksempel:

```
WS /harness
```

Handshake:

```json
{
  "type": "hello",
  "client": "baseos",
  "version": 1
}
```

Response:

```json
{
  "type": "harness.ready",
  "version": 1,
  "capabilities": [
    "sessions",
    "streaming",
    "tasks",
    "permissions",
    "terminal",
    "workspace"
  ]
}
```

## 10. Session API

Når Chat åpnes:

```
BaseOS
  ↓
createSession
  ↓
agent-os
  ↓
sessionId
```

Response:

```json
{
  "type": "session.created",
  "sessionId": "sess_123",
  "agentId": "claude"
}
```

Sessions skal ikke lagres i React state alene.

agent-os event-log skal være source of truth.

## 11. Message flow

Når brukeren skriver:

```
"Bygg login-siden"
```

skal dette skje:

```
Composer
   │
   ▼
send.message
   │
   ▼
Harness Gateway
   │
   ▼
runTurn()
   │
   ▼
Agent Loop
   │
   ├── model
   ├── tools
   ├── worker
   └── memory
   │
   ▼
Event Bus
   │
   ▼
WebSocket
   │
   ▼
Chat
```

Dagens `fetch('https://api.anthropic.com/v1/messages')` skal fjernes fra
Chat.tsx.

## 12. Streaming

Agent-loopens nåværende `runTurn()` returnerer først resultatet etter
modellen er ferdig. Den skriver events underveis, men dagens model
abstraction må utvides for ekte streaming.

Implementer:

```ts
interface ModelStream {
  onDelta(callback: (delta: string) => void): void
  onToolCall(callback: (tool: ToolCall) => void): void
  onComplete(callback: () => void): void
}
```

eller tilsvarende async iterator:

```ts
AsyncIterable<ModelEvent>
```

Anbefalt: async iterator.

```ts
for await (const event of model.stream(messages)) {
  ...
}
```

Gateway sender:

```
agent.message.start
agent.message.delta
agent.message.delta
agent.message.delta
agent.message.end
```

Dette gjør streaming naturlig for både WebSocket og fremtidig HUD.

## 13. Agent status

Agenten skal ha eksplisitt runtime-status:

```ts
type AgentRuntimeStatus =
  | 'idle'
  | 'thinking'
  | 'working'
  | 'waiting'
  | 'blocked'
  | 'completed'
  | 'error'
```

UI viser:

```
● Claude
  THINKING

● Nyx
  WORKING

● Hemera
  WAITING FOR APPROVAL
```

Dette skal komme fra events, ikke fra lokale timers.

## 14. Permissions / Inline Action Cards

Her må vi endre dagens agent-os permission-flow.

Nå fungerer `ask` som en hook som enten venter på `onAsk` eller
default-denier. Det er eksplisitt dokumentert at dagens scaffold ikke har
en live UI-mekanisme for async human approval.

Det skal bli:

```
tool.before
     │
     ▼
Permission Manager
     │
     ├── allow → execute
     │
     ├── deny → return denial
     │
     └── ask
           │
           ▼
       permission.request
           │
           ▼
        WebSocket
           │
           ▼
      Inline Action Card
```

Agent execution skal da kunne returnere til event loop uten å blokkere
hele harness-processen.

## 15. Permission request-format

Eksempel:

```json
{
  "type": "permission.request",
  "requestId": "perm_123",
  "sessionId": "sess_123",
  "agentId": "claude",
  "tool": "shell",
  "payload": {
    "command": "npm install"
  },
  "risk": "medium",
  "options": [
    "once",
    "always",
    "deny"
  ]
}
```

UI:

```
┌─────────────────────────────────────────┐
│ PERMISSION REQUIRED                     │
│                                         │
│ Claude wants to run                     │
│                                         │
│   npm install                            │
│                                         │
│ [ Allow once ] [ Always ] [ Deny ]      │
└─────────────────────────────────────────┘
```

Dette ligger i message/event stream, ikke som modal.

## 16. Permission resolution

UI sender:

```json
{
  "type": "permission.resolve",
  "requestId": "perm_123",
  "decision": "allow_once"
}
```

eller:

```json
{
  "type": "permission.resolve",
  "requestId": "perm_123",
  "decision": "deny"
}
```

Agent-os matcher `requestId` og fortsetter riktig execution.

## 17. Zero-Block-regelen

Dette skal være en hard invariant:

> En pending approval må aldri blokkere andre agents, tasks, automations
> eller sessions.

Eksempel:

```
Claude
 └── waiting for npm permission

Nyx
 └── still working

Hemera
 └── still thinking

Automation
 └── still running

User terminal
 └── still interactive
```

Dette er selve definisjonen på Zero-Block Autonomy i systemet.

## 18. Tasks

agent-os har allerede Task/Flow med lifecycle og optimistic concurrency.

Eksponer dette i Harness:

```
tasks.list
tasks.get
tasks.cancel
tasks.retry
```

UI Right Rail:

```
TASKS

● Build login
  Claude
  WORKING

● Generate assets
  Nyx
  7/12

○ Review implementation
  Hemera
  WAITING
```

Task-event:

```json
{
  "type": "task.updated",
  "taskId": "task_123",
  "status": "running",
  "progress": 0.62
}
```

## 19. Subagents

Bruk den eksisterende `spawnSubagentTask()`-mekanismen.

agent-os har allerede subagent delegation som isolert context og task.

UI skal vise:

```
CLAUDE
└── Build authentication

    ├── subagent: inspect existing auth
    ├── subagent: inspect database
    └── subagent: write tests
```

Right Rail kan vise:

```
SUBAGENTS
3 running
```

Ikke lag en ny subagent-motor.

## 20. Automations

Eksisterende scheduler/automation-system beholdes.

Eksponer:

```
automations.list
automations.create
automations.enable
automations.disable
automations.run
```

UI:

```
AUTOMATIONS

● Morning brief
  Every day · 08:00

● Git backup
  Every 30 min

○ Weekly review
  Disabled
```

Event:

```
automation.started
automation.completed
automation.failed
```

## 21. Right Rail

Lag:

```
src/features/chat/
└── harness/
    └── components/
        ├── HarnessRightRail.tsx
        ├── AgentRail.tsx
        ├── TaskRail.tsx
        ├── AutomationRail.tsx
        └── ActivityRail.tsx
```

Right rail skal være collapsible.

Tilstand:
- expanded
- collapsed
- hidden

Persistér dette sammen med layout.

## 22. Workspace Layout

Bruk `@dnd-kit/core`, som allerede finnes i BaseOS.

Ikke introduser et nytt layout-bibliotek.

Lag:

```
src/features/chat/harness/layout/
├── Workspace.tsx
├── WorkspacePanel.tsx
├── SplitView.tsx
├── PanelTab.tsx
├── PanelDropZone.tsx
├── layoutTypes.ts
├── layoutStore.ts
└── defaultLayout.ts
```

## 23. Layout-modellen

Bruk en tree-model:

```ts
type LayoutNode =
  | {
      type: 'split'
      direction: 'horizontal' | 'vertical'
      children: LayoutNode[]
      sizes: number[]
    }
  | {
      type: 'panel'
      panelId: string
    }
```

Eksempel:

```json
{
  "type": "split",
  "direction": "horizontal",
  "children": [
    {
      "type": "panel",
      "panelId": "conversation"
    },
    {
      "type": "split",
      "direction": "vertical",
      "children": [
        {
          "type": "panel",
          "panelId": "files"
        },
        {
          "type": "panel",
          "panelId": "tasks"
        }
      ]
    }
  ]
}
```

## 24. Default Chat layout

Start med:

```
┌─────────────────────────────────────────────┐
│ Top Bar                                     │
├──────────────────────────────────┬──────────┤
│                                  │          │
│                                  │ Agents   │
│          Conversation            │ Tasks    │
│                                  │ Activity │
│                                  │          │
│                                  │          │
├──────────────────────────────────┴──────────┤
│ Terminal                                    │
└─────────────────────────────────────────────┘
```

Dette er default.

## 25. Paneler

Definer faste panel IDs:

```ts
type PanelId =
  | 'conversation'
  | 'meeting'
  | 'files'
  | 'browser'
  | 'tool'
  | 'tasks'
  | 'agents'
  | 'automations'
  | 'activity'
  | 'terminal'
```

Ikke alle paneler trenger å være synlige samtidig.

## 26. Drag-and-drop

Bruk dnd-kit.

Brukeren skal kunne:
- dra panel-tab
- flytte til venstre
- flytte til høyre
- splitte horisontalt
- splitte vertikalt
- lukke panel
- åpne panel igjen
- resize split
- lagre layout

Dette er Fase 1 av workspace-systemet.

## 27. Layout persistence

Lag:

```
localStorage:
os:harness:layout
```

med:

```json
{
  "version": 1,
  "layout": {},
  "rightRail": "expanded",
  "bottomRail": "expanded"
}
```

Dette er kun UI-preferanser. Agent state skal fortsatt ligge i agent-os.

## 28. Conversation panel

Dagens Chat.tsx skal brytes opp.

Ikke skriv en ny 600-linjers komponent.

Lag:

```
src/features/chat/harness/
├── ChatHarness.tsx
├── components/
│   ├── ConversationPanel.tsx
│   ├── ConversationHeader.tsx
│   ├── MessageList.tsx
│   ├── Message.tsx
│   ├── ToolCall.tsx
│   ├── PermissionCard.tsx
│   ├── TaskCard.tsx
│   ├── AgentBadge.tsx
│   └── Composer.tsx
├── hooks/
│   ├── useHarnessSocket.ts
│   ├── useHarnessSession.ts
│   ├── useHarnessEvents.ts
│   └── useHarnessCommands.ts
├── state/
│   └── harnessStore.ts
└── types.ts
```

## 29. Message-modellen

Ikke bruk dagens:

```ts
role: 'user' | 'assistant'
```

Bruk:

```ts
type ConversationItem =
  | UserMessage
  | AgentMessage
  | ToolCallItem
  | ToolResultItem
  | PermissionItem
  | TaskItem
  | SystemEventItem
```

Da kan UI-et vise alt i samme stream.

## 30. Chat stream

Eksempel:

```
YOU
Build the login page.

CLAUDE
I'll inspect the current auth implementation.

TOOL
filesystem.read
src/auth.ts

CLAUDE
I found the existing session model.

PERMISSION REQUIRED
Claude wants to modify:
src/pages/Login.tsx

[Allow once] [Always] [Deny]

NYX
Meanwhile, asset generation has completed.

TASK
Build login page
62%
```

Det er dette som skiller Harness fra vanlig Chat.

## 31. Top Bar

Lag:

```
HarnessTopBar.tsx
```

Den skal vise:

```
● CONNECTED

Claude
claude-opus-...

TOKENS
24.2k

TASKS
3 running

AGENTS
2 active

[ Voice ] [ HUD ] [ ⋯ ]
```

Top Bar skal ikke eie state. Den leser Harness state.

## 32. Agent selector

Dagens agent selector:

```
Claude
Hemera
Nyx
```

skal erstattes av runtime-agent selector.

agent-os identity skal være source of truth.

agent-os støtter allerede agent identity/persona og injiserer persona i
system prompt under `runTurn()`.

## 33. Agent identity

Bruk:

```ts
interface AgentIdentity {
  id: string
  name: string
  persona: string
  defaultModel?: string
  color?: string
}
```

UI:

```
Claude
Builder · Code
● WORKING
```

`src/data/agents.ts` skal ikke lenger være runtime source of truth for
Harness.

Den kan senere være seed/default data, men live state skal komme fra
backend.

## 34. Team

Team-panelet inne i Harness skal bruke samme agent identities som
agent-os.

Eksempel:

```
TEAM

Architect
Claude
Builder

Coder
Nyx
Execution

Reviewer
Hemera
Strategy
```

Ikke opprett en separat Team-agentmodell.

## 35. Meeting-modus

Det eksisterende `/room` skal ikke slettes.

Det eksisterende MeetingRoom.tsx er allerede en visuell agent-room med
live team state/replay, men inneholder også mock-bevegelse/random chatter.

Harness Meeting skal være en ny view inne i `/chat`.

## 36. Harness Meeting layout

```
┌─────────────────────────────────────────────────────────┐
│ MEETING · Architecture Review                           │
├──────────────────────────────┬──────────────────────────┤
│                              │                          │
│ Architect                    │                          │
│ Let's inspect the API...     │       Shared Workspace   │
│                              │                          │
│ Coder                        │       Login.tsx          │
│ I'll implement the change.  │                          │
│                              │                          │
│ Reviewer                     │                          │
│ We need a test here.         │                          │
│                              │                          │
├──────────────────────────────┴──────────────────────────┤
│ Terminal                                                │
└─────────────────────────────────────────────────────────┘
```

## 37. Meeting state

Lag:

```ts
interface Meeting {
  id: string
  title: string
  participants: string[]
  workspaceId: string
  sessionIds: string[]
}
```

Meeting messages skal fortsatt være vanlige Harness events.

Det skal ikke være en separat chatmotor.

## 38. Shared Workspace

Lag i agent-os:

```
src/harness/workspace.ts
```

State:

```ts
interface WorkspaceDocument {
  id: string
  path?: string
  title: string
  content: string
  version: number
  updatedBy: string
  updatedAt: string
}
```

Events:

```
workspace.document.created
workspace.document.updated
workspace.document.deleted
```

## 39. Optimistic concurrency

Når agent A skriver:

```
version: 10
```

og agent B allerede har skrevet:

```
version: 11
```

skal agent A få:

```
workspace.conflict
```

Ikke overskriv B sin endring.

Dette skal bygge på samme event/revision-tankegang som allerede brukes i
Task/Flow-systemet.

## 40. Files panel

Lag:

```
FilesPanel.tsx
```

som viser:

```
PROJECT
├── src
│   ├── App.tsx
│   ├── auth.ts
│   └── pages
├── public
└── package.json
```

Backend skal bruke agent-os Agent FS der det er agent-context, ikke
browserens filesystem API.

agent-os har allerede Agent FS.

## 41. Tool View

Alle tools skal kunne få en UI renderer.

Eksempel:

```ts
type ToolRenderer =
  | 'text'
  | 'diff'
  | 'file'
  | 'terminal'
  | 'browser'
  | 'image'
  | 'json'
```

Tool-event:

```json
{
  "type": "tool.started",
  "tool": "filesystem.write",
  "renderer": "diff"
}
```

UI åpner riktig panel automatisk.

## 42. Diff view

Når agent vil endre fil:

```
┌─────────────────────────────────────┐
│ src/auth.ts                         │
├─────────────────────────────────────┤
│ - const session = oldSession()      │
│ + const session = getSession()      │
│                                     │
│ [Apply] [Reject]                    │
└─────────────────────────────────────┘
```

Dette kobles til approval-systemet.

## 43. Terminal

Dette skal være en ekte PTY, ikke en fake terminal.

Frontend:

```
xterm.js
```

Backend:

```
node-pty
```

I agent-os:

```
src/harness/terminal/
├── pty.ts
├── manager.ts
└── protocol.ts
```

## 44. Terminal lifecycle

```
terminal.create
      ↓
PTY process
      ↓
terminal.output
      ↓
WebSocket
      ↓
xterm.js
```

Input:

```
xterm.js
 ↓
terminal.input
 ↓
PTY
```

Resize:

```json
terminal.resize
{
  "cols": 0,
  "rows": 0
}
```

## 45. User terminal ≠ Agent worker

Dette skal være en eksplisitt arkitekturregel.

```
Human Terminal
    ↓
PTY
    ↓
Interactive shell
```

og:

```
Agent
    ↓
Worker
    ↓
Agent execution
```

er separate.

agent-os skiller allerede Agent identity og Worker execution environment.

## 46. Terminal security

Bruk ikke samme permission-policy som browser-Harness ukritisk.

Human terminal er eksplisitt brukerinitiert.

Agent shell er agent-initiert.

Agent shell skal fortsatt gå gjennom:

```
PermissionPolicy
+
SandboxPolicy
```

agent-os har allerede denne to-lags modellen, og dokumentasjonen
understreker at policy alene ikke er en faktisk security boundary.

## 47. Slash commands

Composer skal parse:

```
/invite
/restart
/model
/agent
/task
/terminal
/clear
/hud
```

før vanlig message dispatch.

```
input
 │
 ├── startsWith("/")
 │       ↓
 │    command parser
 │
 └── normal text
         ↓
      sendMessage
```

Eksempel:

```
/model claude-opus
```

skal ikke sendes til LLM.

## 48. Command registry

Lag:

```
src/features/chat/harness/commands/
├── registry.ts
├── invite.ts
├── restart.ts
├── model.ts
├── agent.ts
├── task.ts
├── terminal.ts
└── hud.ts
```

## 49. Voice

Voice skal implementeres etter at tekst/agent runtime fungerer.

To modes:

```
PUSH TO TALK
```

og:

```
CONTINUOUS
```

UI:

```
🎙 PTT
◉ CONTINUOUS
```

Audio flow:

```
Microphone
 ↓
Audio chunks
 ↓
Voice pipeline
 ↓
STT
 ↓
Harness event
 ↓
Agent
```

TTS:

```
Agent output
 ↓
TTS
 ↓
Audio stream
```

## 50. Voice state

```ts
type VoiceState =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'speaking'
  | 'error'
```

Top Bar viser state.

## 51. HUD

HUD-en skal ikke være en `position: fixed` komponent inne i BaseOS.

Den skal være et eget desktop window når desktop runtime er aktiv.

Hermes-modellen er riktig her: global hotkey åpner en chrome-free,
always-on-top floating bar; session beholdes når man går tilbake til
hovedvinduet; HUD kan flyttes, resize'es og snappes til musepekeren.

## 52. HUD modes

Implementer:

**Micro**
```
● Claude · Thinking…
```

**Compact**
```
┌──────────────────────────────┐
│ ● Claude      Thinking…      │
│                              │
│ Ask the agent...         🎙  │
└──────────────────────────────┘
```

**Expanded**
```
┌──────────────────────────────────┐
│ ● Claude                    ×     │
├──────────────────────────────────┤
│                                  │
│ Agent conversation               │
│                                  │
│                                  │
├──────────────────────────────────┤
│ Ask the agent...             🎙  │
└──────────────────────────────────┘
```

## 53. HUD shortcuts

Bruk samme konsept som Hermes:

```
Ctrl/Cmd + Shift + H
```

Toggle HUD.

```
Ctrl/Cmd + Shift + G
```

Snap HUD til pointer.

Hermes dokumenterer akkurat denne modellen, inkludert global hotkey,
resizing, moving og snap-to-pointer.

## 54. HUD state

HUD og hovedvindu skal dele:

- Harness session
- Harness event stream
- Harness store

Ikke ha:

```
MainChatState
HudChatState
```

som to forskjellige sessions.

Riktig:

```
              Harness Runtime
                    │
             Session sess_123
               /          \
              /            \
       Main Window        HUD
```

## 55. Context anchoring

HUD-positionen skal registreres:

```ts
interface HudContext {
  x: number
  y: number
  width: number
  height: number
  screenId?: string
  activeWindow?: string
}
```

Dette gir oss grunnlaget for kontekst knyttet til hvor HUD befinner seg.

Clicky Windows bruker nettopp always-on-top/pinned companion-modellen og
kjører som tray-app.

## 56. Clicky-inspirert behavior

Ikke kopier Clicky visuelt.

Ta kun:

```
always available
+
tray/background
+
small companion
+
voice
+
screen/context awareness
```

Clicky Windows beskriver blant annet pinned always-on-top chat og
tray-resident companion.

## 57. Desktop runtime

For faktisk HUD må BaseOS bli desktop-capable.

Bruk:

```
Electron
```

i første desktop-implementasjon.

Grunnen er at Hermes allerede viser at Electron håndterer denne typen
desktop HUD, global hotkeys og native window behavior.

Ikke bland dette inn i webversjonen.

## 58. Electron-struktur

Opprett:

```
desktop/
├── main.ts
├── preload.ts
├── windows/
│   ├── main.ts
│   └── hud.ts
├── shortcuts.ts
└── tray.ts
```

Main window:

```
BaseOS
```

HUD:

```
BaseOS HUD
```

## 59. Web vs Desktop

BaseOS skal fortsatt kunne kjøre:

```
npm run dev
```

uten Electron.

HUD-knappen i web-mode skal enten:
- være disabled med tydelig desktop-indikator

eller

- bruke in-page fallback.

Desktop build skal aktivere full HUD.

## 60. Important: Linux/Wayland

Hermes sin egen dokumentasjon viser at always-on-top ikke er universelt
garantert under Wayland; enkelte compositors ignorerer det, og Hermes har
egne XWayland/desktop-spesifikke løsninger.

Derfor skal HUD-abstraksjonen være:

```ts
interface DesktopWindowAdapter {
  showHud(): Promise<void>
  hideHud(): Promise<void>
  toggleHud(): Promise<void>
  moveHud(x: number, y: number): Promise<void>
  resizeHud(width: number, height: number): Promise<void>
  snapHudToPointer(): Promise<void>
}
```

Ikke la React-komponenten vite hvordan OS-vinduet fungerer.

## 61. BaseOS Chat route

App.tsx skal til slutt ha:

```tsx
{ path: 'chat', element: <Chat /> }
```

men Chat peker på Harness.

`/chat` beholdes. Dermed brytes ikke navigation eller bookmarks.

## 62. Chat.tsx

Etter migreringen:

```
src/pages/Chat.tsx
```

skal enten:

```tsx
export function Chat() {
  return <ChatHarness />
}
```

eller fjernes når alle imports er oppdatert.

Anbefalt først:

```tsx
export { ChatHarness as Chat } from '@/features/chat/harness/ChatHarness'
```

slik at routing ikke må endres samtidig med resten.

## 63. Navbar

Navbar skal fortsatt ha Chat som global route.

Dagens SECTIONS har:

```
Chat
route: /chat
```

og NavBar renderer disse dynamisk.

Ikke endre hele Navbar-arkitekturen.

Endre kun Chat entryens metadata:

```
Chat
AGT.02
Agent Harness
```

Ikonet kan fortsatt være `MessagesSquare`.

## 64. Ikke legg Team/Meeting i Navbar nå

Global Navbar skal fortsatt være:

```
Home
Notes
Chat
Calendar
Projects
Lab
Meeting Room
Team
Ops
Weather
```

Det vi bygger er:

```
Chat
 └── Agent Harness
     ├── Chat
     ├── Team
     └── Meeting
```

men global Team og Meeting beholdes.

## 65. Harness Activity Bar

Inne i `/chat` får vi en ny activity bar:

```
┌────┐
│ 💬 │ Chat
│ 👥 │ Team
│ 🏛 │ Meeting
│ 📁 │ Files
│ ⚙  │ Tools
└────┘
```

Denne skal være lokal til Chat-modulen. Det er viktig.

## 66. Harness Activity routing

Ikke bruk React Router for interne Harness views.

Bruk local state:

```ts
type HarnessView =
  | 'chat'
  | 'team'
  | 'meeting'
  | 'files'
  | 'tools'
```

Da forblir alt under `/chat`.

## 67. Session persistence

Når brukeren går:

```
Chat → Team → Meeting → Chat
```

skal sessionen beholdes.

Store:

```
activeHarnessSessionId
activeAgentId
activeMeetingId
activeWorkspaceId
```

skal leve i Harness state.

## 68. Browser panel

Implementer først som en panel-placeholder:

```
Browser
```

og koble til en renderer senere.

Ikke bygg en full browser backend før Harness event-protokollen fungerer.

Paneltypen skal likevel være definert fra starten.

## 69. Tool Views

Samme prinsipp:

```
Tool view
```

skal være et generisk panel.

Tools kan senere åpne:

```
JSON
Diff
Image
Markdown
Browser
Terminal
File
```

## 70. State management

Ikke introduser Redux.

Lag en liten Harness store.

For eksempel:

```ts
interface HarnessState {
  connection: ConnectionState
  session: SessionState | null
  agents: AgentRuntime[]
  messages: ConversationItem[]
  tasks: Task[]
  permissions: PermissionRequest[]
  automations: Automation[]
  workspace: WorkspaceState
  terminal: TerminalState
  layout: LayoutState
}
```

En liten custom store/context er nok.

## 71. WebSocket client

Lag:

```
useHarnessSocket()
```

med:

```
connect()
disconnect()
send()
subscribe()
```

Den skal håndtere:

```
connecting
connected
reconnecting
disconnected
error
```

UI:

```
● CONNECTED
```

eller:

```
○ RECONNECTING
```

## 72. Reconnect

Ved WebSocket disconnect:

```
connect
 ↓
subscribe session
 ↓
request current session projection
 ↓
replay missed events
 ↓
resume live stream
```

Ikke stol på at React state fortsatt er korrekt.

## 73. Event replay

Lag gateway command:

```
session.sync
```

Response:

```json
{
  "type": "session.state",
  "sessionId": "sess_123",
  "messages": [],
  "tasks": [],
  "pendingPermissions": []
}
```

Dette gjør reload/reconnect robust.

## 74. Agent event mapping

Lag én frontend mapper:

```
harnessEventToConversationItem()
```

Den oversetter:

```
agent.message.delta
tool.started
tool.completed
permission.request
task.updated
```

til UI objects.

Ikke spre mappinglogikken over komponentene.

## 75. Observability

agent-os har allerede metrics/observability fra event-loggen.

Eksponer:

```
tokens
latency
tasks
tool calls
errors
agent status
```

Top Bar:

```
TOKENS 24.2k
LATENCY 1.2s
```

Ops kan fortsatt bruke sin eksisterende verden.

## 76. Error handling

Alle backend errors skal bli events:

```
harness.error
```

med:

```json
{
  "code": "",
  "message": "",
  "recoverable": true,
  "requestId": null
}
```

Frontend viser inline:

```
⚠ Agent connection failed
[Retry]
```

Ikke `alert()`.

## 77. Authentication

I første lokale versjon:

```
localhost only
```

Gateway skal lytte på:

```
127.0.0.1
```

ikke:

```
0.0.0.0
```

med mindre det eksplisitt konfigureres.

Dette er nødvendig fordi gatewayen etter hvert har tilgang til shell/PTY
og agent runtime.

## 78. API credentials

Flytt provider credentials til agent-os.

BaseOS skal aldri motta:

```
ANTHROPIC_API_KEY
OPENAI_API_KEY
```

som browser state.

BaseOS får kun:

```
connected
provider
model
usage
```

## 79. MCP

MCP skal ikke bygges som en separat agentmotor.

Lag Harness settings:

```
Settings
└── Connections
    ├── Models
    ├── MCP
    ├── Webhooks
    └── Providers
```

Men implementer først bare datamodellen/placeholder.

MCP execution skal gå via agent-os tool layer.

## 80. Webhooks

Eksisterende webhook-funksjonalitet i agent-os beholdes. README-en
beskriver allerede webhook-driven automation.

Harness skal vise:

```
AUTOMATIONS
```

ikke ha sin egen webhook engine.

## 81. Memory UI

Memory finnes allerede i agent-os, inkludert episodic memory, dreaming og
human-approved nominations.

I Harness implementerer vi kun:

```
Activity
  Memory suggestion
```

med:

```
Remember this?
[Approve] [Reject]
```

Ikke bygg en full memory editor i denne fasen.

## 82. Implementation order

Dette er den faktiske rekkefølgen som skal følges.

### Phase 1 — Contract

**agent-os**

Opprett:

```
src/harness/protocol.ts
src/harness/index.ts
```

Definer alle event/command types.

**Ferdig når**: TypeScript kompilerer og både backend/frontend kan
importere samme kontrakt.

## 83. Phase 2 — Harness Gateway

I agent-os:

```
src/harness/gateway.ts
src/harness/sessions.ts
```

Implementer:

```
connect
hello
create session
subscribe
send message
session sync
```

Bruk eksisterende event bus.

**Ferdig når**: En liten Node-test kan connect → create session → send
message → receive stream.

## 84. Phase 3 — Real agent execution

Koble Gateway til:

```
runTurn()
createModelForAgent()
Worker
Identity
Memory
Skills
```

agent-os har allerede disse primitives.

**Ferdig når**: CLI/WebSocket-client kan sende `hello` og få ekte
modellrespons tilbake.

## 85. Phase 4 — Streaming

Utvid model abstraction.

Implementer:

```
message.start
message.delta
message.end
```

**Ferdig når**: UI/client får tekst tegn/segment for segment uten
polling.

## 86. Phase 5 — BaseOS Harness shell

I BaseOS:

```
src/features/chat/harness/
```

Lag:

```
ChatHarness.tsx
HarnessActivityBar.tsx
HarnessTopBar.tsx
HarnessRightRail.tsx
HarnessBottomRail.tsx
```

Bygg først layouten med fake data.

**Ferdig når**: Chat-modulen ser riktig ut uten backend.

## 87. Phase 6 — WebSocket integration

Implementer:

```
useHarnessSocket
useHarnessSession
useHarnessEvents
```

Fjern mock conversation data.

**Ferdig når**: BaseOS kan sende melding til agent-os og vise streaming
response.

## 88. Phase 7 — Replace old Chat

Flytt:
- composer
- attachments
- markdown
- message renderer
- agent selector

inn i Harness.

Fjern direkte Anthropic fetch.

Fjern:

```
AGENT_MODEL
AGENT_SYSTEM
CONVERSATIONS
localStorage chat history
```

som runtime-logikk.

## 89. Phase 8 — Workspace manager

Implementer:

```
panel tree
split
resize
drag
drop
close
restore
persist
```

**Ferdig når**: Brukeren kan gjøre `Chat | Tasks` eller `Chat / Terminal`
og layouten overlever reload.

## 90. Phase 9 — Terminal

Legg til:

```
xterm.js
node-pty
```

Implementer:

```
terminal.create
terminal.input
terminal.output
terminal.resize
terminal.close
```

**Ferdig når**: Du kan åpne en ekte shell fra `/chat`.

## 91. Phase 10 — Permissions

Implementer async approval.

Backend:

```
permission.request
permission.resolve
```

Frontend:

```
PermissionCard
```

**Ferdig når**: Agent kan request tool → wait → user approves → continue
uten å drepe/restarte sessionen.

## 92. Phase 11 — Tasks/Subagents

Koble:

```
listTasks
createTask
transitionTask
spawnSubagentTask
```

til Right Rail.

**Ferdig når**: Subagent-jobber vises live.

## 93. Phase 12 — Automations

Koble scheduler events til Activity/Automation Rail.

**Ferdig når**: En automation kan starte mens Chat er åpen og UI-et
oppdateres uten refresh.

## 94. Phase 13 — Meeting

Lag:

```
HarnessMeeting.tsx
```

Bruk samme event stream.

Implementer:
- participants
- multi-agent conversation
- shared workspace

**Ferdig når**: Tre agenter kan delta i samme Meeting session.

## 95. Phase 14 — Shared Workspace

Implementer:

```
document.create
document.update
document.delete
document.conflict
```

og Files/Editor panel.

**Ferdig når**: Agent A gjør endring → UI oppdateres → Agent B får ny
workspace state.

## 96. Phase 15 — Voice

Implementer:

```
PTT
Continuous
STT
TTS
```

først når text Harness er stabil.

## 97. Phase 16 — HUD

Lag Electron:
- main window
- HUD window
- tray
- global shortcuts

Implementer:

```
Ctrl/Cmd+Shift+H
Ctrl/Cmd+Shift+G
```

samt micro/compact/expanded.

## 98. Phase 17 — Desktop integration

Flytt PTY og desktop capabilities inn i desktop runtime der det er
nødvendig.

Harness UI skal kommunisere med:

```
Desktop adapter
```

og aldri direkte med Electron APIs.

## 99. Fase 18 — Settings

Til slutt:

```
Harness Settings
├── Models
├── Agents
├── Permissions
├── MCP
├── Webhooks
├── Keyboard
└── Desktop
```

## 100. Filer som skal opprettes i BaseOS

Sluttstruktur:

```
src/
├── features/
│   └── chat/
│       └── harness/
│           ├── ChatHarness.tsx
│           ├── types.ts
│           ├── protocol.ts
│           │
│           ├── components/
│           │   ├── HarnessActivityBar.tsx
│           │   ├── HarnessTopBar.tsx
│           │   ├── HarnessRightRail.tsx
│           │   ├── HarnessBottomRail.tsx
│           │   ├── ConversationPanel.tsx
│           │   ├── ConversationHeader.tsx
│           │   ├── MessageList.tsx
│           │   ├── Message.tsx
│           │   ├── Composer.tsx
│           │   ├── AgentBadge.tsx
│           │   ├── PermissionCard.tsx
│           │   ├── ToolCall.tsx
│           │   ├── TaskCard.tsx
│           │   ├── AgentRail.tsx
│           │   ├── TaskRail.tsx
│           │   ├── AutomationRail.tsx
│           │   ├── ActivityRail.tsx
│           │   ├── TerminalPanel.tsx
│           │   ├── FilesPanel.tsx
│           │   ├── MeetingPanel.tsx
│           │   └── HudButton.tsx
│           │
│           ├── layout/
│           │   ├── Workspace.tsx
│           │   ├── WorkspacePanel.tsx
│           │   ├── SplitView.tsx
│           │   ├── PanelTab.tsx
│           │   ├── PanelDropZone.tsx
│           │   ├── layoutTypes.ts
│           │   ├── layoutStore.ts
│           │   └── defaultLayout.ts
│           │
│           ├── hooks/
│           │   ├── useHarnessSocket.ts
│           │   ├── useHarnessSession.ts
│           │   ├── useHarnessEvents.ts
│           │   ├── useHarnessCommands.ts
│           │   └── useHarnessLayout.ts
│           │
│           ├── state/
│           │   └── harnessStore.ts
│           │
│           └── commands/
│               ├── registry.ts
│               ├── agent.ts
│               ├── model.ts
│               ├── task.ts
│               ├── terminal.ts
│               ├── hud.ts
│               └── restart.ts
│
└── pages/
    └── Chat.tsx
```

## 101. Filer som skal opprettes i agent-os

```
src/
└── harness/
    ├── protocol.ts
    ├── gateway.ts
    ├── sessions.ts
    ├── agents.ts
    ├── tasks.ts
    ├── permissions.ts
    ├── workspace.ts
    ├── terminal.ts
    ├── stream.ts
    └── index.ts
```

Og:

```
src/
├── test-harness-gateway.ts
├── test-harness-stream.ts
├── test-harness-permissions.ts
├── test-harness-workspace.ts
└── test-harness-terminal.ts
```

## 102. Filer som skal endres i BaseOS

**src/App.tsx**

Behold:

```tsx
{ path: 'chat', element: <Chat /> }
```

men Chat peker på Harness.

**src/pages/Chat.tsx**

Gjør til thin wrapper.

**src/data/sections.ts**

Endre Chat metadata:

```
Chat
→ Agent Harness
```

men behold:

```
id: chat
route: /chat
```

**src/index.css**

Kun legg til Harness/HUD/layout styles som faktisk trengs. Ikke omskriv
global theme.

Den eksisterende CSS-en har allerede HUD corner/grid-system og
terminal-orientert styling som kan gjenbrukes.

**package.json**

Legg til nødvendige runtime dependencies:

```
xterm
xterm-addon-fit
```

og for desktop/runtime:

```
electron
```

samt WebSocket-klient etter valgt implementasjon.

`@dnd-kit/core` beholdes og brukes til workspace.

## 103. Filer som skal fjernes fra Chat-runtime

Når Harness fungerer, `src/pages/Chat.tsx` skal ikke lenger inneholde:

```
Anthropic fetch
OAuth exchange
API key state
CONVERSATIONS mock
AGENT_MODEL
AGENT_SYSTEM
localStorage message persistence
AbortController for model request
```

Dette flyttes til backend/runtime.

## 104. Hva som beholdes fra dagens Chat

Behold UI/UX-konsepter som er gode:
- drag/drop attachments
- file attachments
- markdown messages
- Enter to send
- Shift+Enter
- streaming indicator
- agent color
- mobile conversation selector
- stop action
- composer

Men komponentene flyttes inn i Harness.

## 105. Testplan

### Backend unit tests

**Event bus**
```
publish event
→ subscriber receives
```

**Gateway**
```
connect
→ hello
→ create session
→ send message
→ receive events
```

**Streaming**
```
model emits delta
→ gateway emits delta
```

**Permissions**
```
tool request
→ permission event
→ resolve allow
→ tool executes
```

**Zero-block**
```
Agent A waits for approval
Agent B executes
```
må passere.

**Tasks**
```
created
→ running
→ succeeded
```

**Workspace**
```
version 1
→ update
→ version 2
→ stale version rejected
```

**Terminal**
```
create
→ input
→ output
→ resize
→ close
```

## 106. Frontend testplan

Test:
```
Chat opens
WebSocket connects
Agent appears
Message streams
Stop works
Reconnect works
Session persists
```

Workspace:
```
split
resize
drag
close
restore
reload
```

Permission:
```
request appears inline
allow once
allow always
deny
```

Task:
```
task appears
progress updates
completion updates
```

Meeting:
```
multiple agents
shared messages
workspace updates
```

HUD:
```
open
close
move
resize
snap
session remains
```

## 107. Acceptance test 1 — vanlig chat

Start: `BaseOS → Chat`

Send: `Hello`

Expected:
```
User message
↓
Agent thinking
↓
Streaming response
↓
Agent completed
```

Ingen direkte API-kall fra browser.

## 108. Acceptance test 2 — autonomous task

Send: `Create a task that investigates the current project structure.`

Expected:
```
Chat
 ↓
Task created
 ↓
Agent working
 ↓
Tool calls
 ↓
Task completed
```

Right Rail oppdateres uten refresh.

## 109. Acceptance test 3 — permission

Agent ber om: `write file`

Expected: `Permission Card`

Trykk: `Allow once`

Agent fortsetter. Ikke ny user message.

## 110. Acceptance test 4 — Zero Block

Start: `Claude → waiting for permission`

Samtidig: `Nyx → working`

Expected:
```
Claude WAITING
Nyx WORKING
```

Nyx fortsetter.

## 111. Acceptance test 5 — terminal

Åpne Terminal. Kjør: `echo hello`

Expected: `hello` uten fake output.

## 112. Acceptance test 6 — Meeting

Start: `Meeting` med `Architect`, `Coder`, `Reviewer`.

Architect skriver. Coder responderer. Reviewer responderer.

Alle vises i samme event stream.

## 113. Acceptance test 7 — shared file

Coder oppdaterer `src/Login.tsx`.

Expected:
```
Files panel
→ file changes
→ editor/diff
→ other agents receive updated version
```

## 114. Acceptance test 8 — HUD

Fra desktop: `Ctrl/Cmd + Shift + H`

Expected: `HUD appears above current application.`

Send melding. Gå tilbake til hovedvindu.

Expected:
```
same session
same conversation
same agent state
```

## 115. Acceptance test 9 — reconnect

Kill WebSocket.

Expected: `RECONNECTING`

Start igjen.

Expected: `CONNECTED` og session state rehydrates.

## 116. Acceptance test 10 — reload

Reload BaseOS.

Expected:
```
Chat
→ same session
→ messages recovered
→ tasks recovered
→ pending permissions recovered
```

Dette kommer fra event-log projection, ikke localStorage chat history.

## 117. Acceptance test 11 — automation

Start en automation. Lukk Chat. La automation kjøre. Åpne Chat igjen.

Expected:
```
automation event visible
task exists
agent result exists
```

Det viser at agent-os faktisk er autonom motor og ikke bare en
chat-server.

## 118. Acceptance test 12 — browser independence

Mens agenten jobber: `Chat → browser → terminal → another BaseOS section
→ back to Chat`

Agenten skal fortsette hele tiden.

## 119. Final repository relationship

Når alt er ferdig:

```
BaseOStest
    │
    │ WebSocket
    ▼
agent-os
```

Ikke:

```
BaseOStest
 ├── own agent loop
 ├── own memory
 ├── own task system
 └── agent-os
```

Det ville gitt to OS-er.

## 120. Endelig arkitektur

```
                         BASEOS
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Global Activity Bar                                     │
│                                                          │
│  Home                                                    │
│  Notes                                                   │
│  Chat ─────────────────────────────┐                     │
│  Calendar                           │                     │
│  Projects                           │                     │
│  Lab                                │                     │
│  Meeting                            │                     │
│  Team                               │                     │
│  Ops                                │                     │
│                                     │                     │
│                  CHAT / HARNESS      │                     │
│                                     │                     │
│   Harness Activity Bar              │                     │
│       │                             │                     │
│       ├─ Chat                       │                     │
│       ├─ Team                       │                     │
│       ├─ Meeting                    │                     │
│       ├─ Files                      │                     │
│       └─ Tools                      │                     │
│                                     │                     │
│   ┌─────────────────────────────┐   │                     │
│   │ Conversation                │   │                     │
│   │                             │   │                     │
│   │ Agent messages              │   │                     │
│   │ Tool calls                  │   │                     │
│   │ Permission cards            │   │                     │
│   │ Task cards                  │   │                     │
│   │                             │   │                     │
│   ├─────────────────────────────┤   │                     │
│   │ Composer                    │   │                     │
│   └─────────────────────────────┘   │                     │
│                                     │                     │
│                         Right Rail   │                     │
│                         Agents       │                     │
│                         Tasks        │                     │
│                         Automations  │                     │
│                         Activity     │                     │
│                                     │                     │
│   Terminal                          │                     │
│                                     │                     │
└───────────────────────┬─────────────┴─────────────────────┘
                        │
                     WebSocket
                        │
                        ▼
                    AGENT-OS
┌──────────────────────────────────────────────────────────┐
│                                                          │
│ Event Log                                                │
│    │                                                     │
│ Event Bus                                                │
│    │                                                     │
│    ├── Agent Loop                                        │
│    │     ├── Model                                       │
│    │     ├── Worker                                      │
│    │     ├── Skills                                      │
│    │     ├── Memory                                      │
│    │     └── Identity                                    │
│    │                                                     │
│    ├── Tasks / Flows                                     │
│    ├── Subagents                                         │
│    ├── Automations                                       │
│    ├── Permissions                                       │
│    ├── Workspace                                         │
│    ├── PTY                                               │
│    └── Harness Gateway                                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## 121. Definition of Done

Prosjektet er ferdig når alle disse er sanne:

- [ ] `/chat` er erstattet av Agent Harness.
- [ ] Global Navbar fungerer uendret ellers.
- [ ] Harness eksisterer kun inne i Chat-modulen.
- [ ] Browseren kaller ikke Anthropic/OpenAI direkte.
- [ ] agent-os er eneste agent-runtime.
- [ ] WebSocket er eneste live transport mellom BaseOS og agent-os.
- [ ] Event Bus driver live state.
- [ ] Event Log er source of truth.
- [ ] Agent messages streames.
- [ ] Agent status er live.
- [ ] Tasks er live.
- [ ] Subagents er live.
- [ ] Automations er live.
- [ ] Permissions er inline.
- [ ] Permissions blokkerer ikke andre agents.
- [ ] Terminalen er ekte PTY.
- [ ] Human terminal og Agent Worker er separate.
- [ ] Workspace kan splittes.
- [ ] Workspace kan resize'es.
- [ ] Workspace kan drag/drop'es.
- [ ] Workspace layout persisteres.
- [ ] Files kan oppdateres live.
- [ ] Meeting kan kjøre flere agents.
- [ ] Shared workspace fungerer.
- [ ] Slash commands fungerer før LLM-routing.
- [ ] Voice PTT fungerer.
- [ ] Continuous voice fungerer.
- [ ] HUD fungerer som separat desktop window.
- [ ] HUD er always-on-top der OS-et tillater det.
- [ ] HUD kan flyttes.
- [ ] HUD kan resize'es.
- [ ] HUD kan snap-to-pointer.
- [ ] HUD deler session med hovedvindu.
- [ ] Reconnect fungerer.
- [ ] Reload/replay fungerer.
- [ ] Agent-os test suite er grønn.
- [ ] BaseOS typecheck/build er grønn.
- [ ] Ingen av de eksisterende BaseOS-modulene er avhengige av Harness.

## Kort sagt: byggerekkefølgen

```
1.  Git branches
2.  Harness protocol
3.  Harness gateway
4.  WebSocket
5.  Session API
6.  Agent execution
7.  Streaming
8.  BaseOS Harness shell
9.  WebSocket frontend
10. Replace old Chat
11. Workspace manager
12. Terminal
13. Permissions / Zero-Block
14. Tasks
15. Subagents
16. Automations
17. Meeting
18. Shared Workspace
19. Voice
20. Electron
21. HUD
22. Settings
23. Full test suite
24. Production build
```

---

Denne planen bygger på den faktiske strukturen som ligger i BaseOS nå, i
stedet for å anta en annen app-arkitektur: `/chat` er allerede en egen
route, AppShell håndterer det globale skallet, NavBar kommer fra
`SECTIONS`, og MeetingRoom/Team eksisterer allerede separat.

Og den utnytter det agent-os faktisk allerede har i stedet for å bygge en
parallell runtime: event-log, event bus, agent-loop, workers, tasks/flows,
subagents, automations, memory, permissions og agent identity er allerede
implementert der.

Hermes/Clicky-delen er dermed avgrenset til den konkrete
desktop-interaksjonen: en separat, always-on-top companion/HUD med global
hotkey, resizing, flytting, snap-to-pointer og delt session-state — ikke
en kopi av deres interne agentarkitektur.
