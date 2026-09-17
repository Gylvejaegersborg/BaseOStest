import {
  Orbit,
  Briefcase,
  NotebookPen,
  Bot,
  CalendarDays,
  FolderKanban,
  FlaskConical,
  Activity,
  CloudSun,
  type LucideIcon,
} from 'lucide-react'

export type SectionId =
  | 'home'
  | 'notes'
  | 'workbench'
  | 'calendar'
  | 'projects'
  | 'lab'
  | 'team'
  | 'ops'
  | 'weather'

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
    id: 'workbench',
    label: 'Workbench',
    code: 'AGT.02',
    route: '/workbench',
    icon: Bot,
    blurb: 'Every agent, one surface: conversations, tasks, flows, artifacts and approvals.',
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
    id: 'team',
    label: 'Team',
    code: 'AGT.07',
    route: '/team',
    icon: Briefcase,
    blurb: 'The management team: briefs, task board, approvals and beat intake.',
    accent: '#f0a020',
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
    id: 'weather',
    label: 'Weather',
    code: 'MET.08',
    route: '/weather',
    icon: CloudSun,
    blurb: 'Oslo, Hamar and Trysil — many feeds, one honest forecast.',
    accent: '#58b6f0',
  },
]

export const NAV_SECTIONS = SECTIONS.filter((s) => s.id !== 'home')

export function sectionById(id: SectionId): Section {
  return SECTIONS.find((s) => s.id === id)!
}

/** Which section a route belongs to — shared by the rail, mobile nav, and
 *  the shell's cross-fade transition so "what section am I in" is computed
 *  once, not reimplemented per consumer. */
export function sectionForPath(pathname: string): Section {
  return (
    SECTIONS.find((s) => (s.route === '/' ? pathname === '/' : pathname.startsWith(s.route))) ?? SECTIONS[0]
  )
}
