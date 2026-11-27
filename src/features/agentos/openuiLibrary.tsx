import { createLibrary, createParser, defineComponent, Renderer } from '@openuidev/react-lang'
import { z } from 'zod'

const ApprovalCard = defineComponent({
  name: 'ApprovalCard',
  description: 'A compact human approval decision card.',
  props: z.object({
    approvalId: z.string(),
    title: z.string(),
    detail: z.string().optional(),
  }),
  component: ({ props }) => (
    <div className="rounded-docked border border-amber/40 bg-amber/5 p-3 text-xs">
      <div className="font-medium text-text">{props.title}</div>
      {props.detail && <div className="mt-1 text-dim">{props.detail}</div>}
      <div className="mt-2 font-mono text-[10px] text-dim">Approval {props.approvalId}</div>
    </div>
  ),
})

const NoteCard = defineComponent({
  name: 'NoteCard',
  description: 'A read-only note or Roam-like block.',
  props: z.object({ title: z.string(), body: z.string() }),
  component: ({ props }) => (
    <div className="rounded-docked border border-line bg-panel-2 p-3 text-xs">
      <div className="font-medium text-accent">{props.title}</div>
      <div className="mt-1 whitespace-pre-wrap text-text/80">{props.body}</div>
    </div>
  ),
})

const WorkspacePanel = defineComponent({
  name: 'WorkspacePanel',
  description: 'A compact workspace, task, or telemetry summary.',
  props: z.object({
    title: z.string(),
    items: z.array(z.string()).optional(),
  }),
  component: ({ props }) => (
    <div className="rounded-docked border border-line bg-panel p-3 text-xs">
      <div className="mb-2 font-medium text-text">{props.title}</div>
      <ul className="space-y-1 text-dim">{(props.items ?? []).map((item: string, i: number) => <li key={i}>• {item}</li>)}</ul>
    </div>
  ),
})

export const baseOsOpenUiLibrary = createLibrary({
  components: [ApprovalCard, NoteCard, WorkspacePanel],
})

export function openUiPrompt(): string {
  return baseOsOpenUiLibrary.prompt({
    inlineMode: true,
    additionalRules: [
      'Use only ApprovalCard, NoteCard, or WorkspacePanel components.',
      'Keep the response compact; fall back to plain text if a component would be misleading.',
      'Do not claim that an approval, action, or mutation succeeded unless it was explicitly reported.',
    ],
  })
}

const parser = createParser(baseOsOpenUiLibrary.toJSONSchema())

export function isValidOpenUiResponse(text: string): boolean {
  try {
    const result = parser.parse(text)
    return Boolean(result.root && !result.meta.incomplete && result.meta.errors.length === 0)
  } catch {
    return false
  }
}

export function OpenUiMessage({ text, streaming }: { text: string; streaming: boolean }) {
  if (!isValidOpenUiResponse(text) && streaming) return null
  return <Renderer response={text} library={baseOsOpenUiLibrary} isStreaming={streaming} />
}
