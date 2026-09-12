import type { FlowStepInput } from '@/features/agentos/sessionClient'

export interface FlowTemplateStep {
  id: string
  label: string
  defaultAgentId: string
  /** `{goal}` is replaced with the one goal the user types when starting
   * the flow — every step gets the same underlying goal, phrased for its
   * own role in the template. */
  goalTemplate: string
  dependsOn?: string[]
}

export interface FlowTemplate {
  id: string
  name: string
  description: string
  steps: FlowTemplateStep[]
}

/**
 * Predefined multi-agent step patterns — real orchestration
 * (flow-engine.ts on the Agent-OS side) without needing an LLM planner to
 * turn a goal into a DAG. The user picks a template, types one goal,
 * optionally reassigns which agent runs which step, and the resolved
 * steps go straight to POST /flows.
 */
export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: 'research-report',
    name: 'Research → Report',
    description: 'One agent researches, a second turns it into a report.',
    steps: [
      { id: 'research', label: 'Research', defaultAgentId: 'theia', goalTemplate: 'Research: {goal}' },
      {
        id: 'report',
        label: 'Report',
        defaultAgentId: 'hemera',
        goalTemplate: 'Write a short report summarizing the research on: {goal}',
        dependsOn: ['research'],
      },
    ],
  },
  {
    id: 'research-factcheck-write-review',
    name: 'Research → Fact-check → Write → Review',
    description: 'A full sequential pipeline: research, verify, write, then review.',
    steps: [
      { id: 'research', label: 'Research', defaultAgentId: 'theia', goalTemplate: 'Research: {goal}' },
      {
        id: 'fact-check',
        label: 'Fact-check',
        defaultAgentId: 'claude',
        goalTemplate: 'Fact-check and verify the research findings on: {goal}',
        dependsOn: ['research'],
      },
      {
        id: 'write',
        label: 'Write',
        defaultAgentId: 'nyx',
        goalTemplate: 'Write the final piece on: {goal}, using the verified research.',
        dependsOn: ['fact-check'],
      },
      {
        id: 'review',
        label: 'Review',
        defaultAgentId: 'argus',
        goalTemplate: 'Review the writeup on: {goal} for quality and follow-through.',
        dependsOn: ['write'],
      },
    ],
  },
  {
    id: 'parallel-investigation',
    name: 'Parallel Investigation → Synthesize',
    description: 'Two agents investigate different angles at the same time, then a third combines their findings.',
    steps: [
      { id: 'angle-a', label: 'Investigate (A)', defaultAgentId: 'theia', goalTemplate: 'Investigate the market/trend angle of: {goal}' },
      { id: 'angle-b', label: 'Investigate (B)', defaultAgentId: 'claude', goalTemplate: 'Investigate the technical/practical angle of: {goal}' },
      {
        id: 'synthesize',
        label: 'Synthesize',
        defaultAgentId: 'hemera',
        goalTemplate: 'Combine both investigations into one clear recommendation on: {goal}',
        dependsOn: ['angle-a', 'angle-b'],
      },
    ],
  },
]

export function resolveFlowTemplate(
  template: FlowTemplate,
  goal: string,
  agentOverrides: Record<string, string> = {},
): FlowStepInput[] {
  return template.steps.map((s) => ({
    id: s.id,
    agentId: agentOverrides[s.id] ?? s.defaultAgentId,
    goal: s.goalTemplate.replace('{goal}', goal),
    dependsOn: s.dependsOn ?? [],
  }))
}
