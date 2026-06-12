// TypeScript mirrors of the JSON shapes in team/README.md (the workflow-committed
// state store under team/ that this feature reads via the GitHub contents API).

export type TeamAgentStatus = 'working' | 'thinking' | 'idle' | 'offline'

export interface TeamAgentState {
  id: string
  name: string
  role: string
  status: TeamAgentStatus
  task: string
  lastActive: string
}

export type TeamTaskStatus = 'backlog' | 'doing' | 'review' | 'blocked' | 'done'

export interface TeamTask {
  id: string
  title: string
  owner: string
  status: TeamTaskStatus
  createdBy: string
  createdAt: string
  handedFrom?: string
  due?: string
  notes?: string
  links?: string[]
}

export interface MeetingTurn {
  agent: string
  text: string
}

export interface Meeting {
  date: string
  agenda: string[]
  turns: MeetingTurn[]
  decisions: string[]
  handoffs: string[]
  actionItems: string[]
}

export type ApprovalType =
  | 'youtube_upload'
  | 'soundcloud_upload'
  | 'social_post'
  | 'booking_reply'
  | 'site_publish'

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'published (manual)'
  | 'failed'

export interface ApprovalItem {
  id: string
  type: ApprovalType
  title: string
  summary: string
  draftPaths: string[]
  draftedBy: string
  createdAt: string
  status: ApprovalStatus
  resolvedAt?: string
  result?: string
}

export interface IntakeFeatures {
  durationSec?: number
  bpm?: number
  key?: string
  keyConfidence?: number
  lufs?: number
  truePeakDb?: number
  loudnessRange?: number
  spectralCentroidHz?: number
  onsetsPerSec?: number
  bitrateKbps?: number
}

export interface IntakeAnalysis {
  summary: string
  mood: string[]
  suggestedTitle: string
  suggestedTags: string[]
  verdict: 'keep' | 'maybe' | 'pass'
}

export interface IntakeRecord {
  id: string
  source: 'discord' | 'email' | 'copyparty'
  kind: 'audio' | 'message'
  receivedAt: string
  filename: string
  from?: string
  subject?: string
  body?: string
  features?: IntakeFeatures
  analysis?: IntakeAnalysis
  status: 'new' | 'analyzed' | 'cataloged' | 'rejected'
}

export type TeamConnection = 'connecting' | 'live' | 'mock' | 'error'

export interface TeamState {
  agents: TeamAgentState[]
  tasks: TeamTask[]
  meeting: Meeting | null
  brief: string
  approvals: ApprovalItem[]
  intake: IntakeRecord[]
}
