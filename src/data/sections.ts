import {
  Orbit,
  NotebookPen,
  MessagesSquare,
  CalendarDays,
  FolderKanban,
  FlaskConical,
  Users,
  Activity,
  Grid3x3,
  type LucideIcon,
} from 'lucide-react'

export type SectionId =
  | 'home'
  | 'notes'
  | 'chat'
  | 'calendar'
  | 'projects'
  | 'lab'
  | 'room'
  | 'ops'
  | 'sudoku'

export interface Section {
  id: SectionId
  label: string
  code: string
  route: string
  icon: LucideIcon
  blurb: string
  accent: string // hex used for constellation glow + accents
}

export const SECTIONS: Section[] = [
  {
    id: 'home',
    label: 'Constellation',
    code: 'SYS.00',
    route: '/',
    icon: Orbit,
    blurb: 'The map. Every section a sun, every project a planet in orbit.',
    accent: '#36e0c8',
  },
  {
    id: 'notes',
    label: 'Notes',
    code: 'VLT.01',
    route: '/notes',
    icon: NotebookPen,
    blurb: 'Markdown vault. Search and read hundreds of long-term project notes.',
    accent: '#46d369',
  },
  {
    id: 'chat',
    label: 'Chat',
    code: 'AGT.02',
    route: '/chat',
    icon: MessagesSquare,
    blurb: 'Talk to Claude, Hemera and Nyx. Upload files, record voice.',
    accent: '#36e0c8',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    code: 'TMP.03',
    route: '/calendar',
    icon: CalendarDays,
    blurb: 'Appointments, AI cron routines and the next things due.',
    accent: '#f0a020',
  },
  {
    id: 'projects',
    label: 'Projects',
    code: 'PRJ.04',
    route: '/projects',
    icon: FolderKanban,
    blurb: 'Status, last move, next move — what each project actually is.',
    accent: '#e0408a',
  },
  {
    id: 'lab',
    label: 'Lab',
    code: 'LAB.05',
    route: '/lab',
    icon: FlaskConical,
    blurb: 'Live pages and apps you have built. Poke, preview and test them.',
    accent: '#36e0c8',
  },
  {
    id: 'room',
    label: 'Meeting Room',
    code: 'AGT.06',
    route: '/room',
    icon: Users,
    blurb: 'The agents, in one open room. Watch them work and talk.',
    accent: '#e0408a',
  },
  {
    id: 'ops',
    label: 'Ops',
    code: 'OPS.07',
    route: '/ops',
    icon: Activity,
    blurb: 'Errors, uptime, agent health and every device connection.',
    accent: '#ff5566',
  },
  {
    id: 'sudoku',
    label: 'Sudoku',
    code: 'SDK.08',
    route: '/sudoku',
    icon: Grid3x3,
    blurb: 'Learn to read the board. Guided hints, mid-game nudges and a coaching report each round.',
    accent: '#CC785C',
  },
]

export const NAV_SECTIONS = SECTIONS.filter((s) => s.id !== 'home')

export function sectionById(id: SectionId): Section {
  return SECTIONS.find((s) => s.id === id)!
}
