/** Flows saved before being started — agent-os itself has no "draft"
 * flow concept (POST /flows always starts driving the DAG immediately,
 * see flow-engine.ts), so a draft is purely a BaseOStest-side concept:
 * just enough of NewFlowModal's form state to resume editing later,
 * kept in localStorage (same posture as the other workbench layout
 * prefs in this folder — per-browser, not synced, fine for a scratchpad
 * like this). */

export interface FlowDraftStep {
  id: string
  agentId: string
  goal: string
  dependsOn: string[]
}

export interface FlowDraft {
  id: string
  name: string
  createdAt: string
  kind: 'template' | 'custom'
  templateId?: string
  goal?: string
  overrides?: Record<string, string>
  customSteps?: FlowDraftStep[]
}

const KEY = 'os:workbench:flowDrafts'

export function listFlowDrafts(): FlowDraft[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(drafts: FlowDraft[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(drafts))
  } catch {
    /* best-effort — a full/blocked localStorage just means drafts don't persist */
  }
}

/** Upserts by id — saving a draft you're already editing replaces it in place. */
export function saveFlowDraft(draft: FlowDraft) {
  const rest = listFlowDrafts().filter((d) => d.id !== draft.id)
  writeAll([draft, ...rest])
}

export function deleteFlowDraft(id: string) {
  writeAll(listFlowDrafts().filter((d) => d.id !== id))
}
