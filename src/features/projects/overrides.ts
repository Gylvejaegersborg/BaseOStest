import { useState } from 'react'
import type { Project, ProjectStatus } from '@/data/projects'

/** Local user overrides layered on top of the static PROJECTS seed data (and
 *  the team-agent-writable overlay beneath that). Shared by every page that
 *  can edit a project — Home's HUD planet detail and the Projects Kanban
 *  popup both read/write the same 'os:projects:overrides' key so an edit
 *  made in one place is immediately visible in the other. */
export type ProjectOverrides = Record<
  string,
  { status?: ProjectStatus; lastMove?: string; nextMove?: string; progress?: number }
>

const STORAGE_KEY = 'os:projects:overrides'

function loadOverrides(): ProjectOverrides {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveOverrides(o: ProjectOverrides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(o))
}

export function applyOverrides(projects: Project[], overrides: ProjectOverrides): Project[] {
  return projects.map((p) => {
    const o = overrides[p.id]
    return o ? { ...p, ...o } : p
  })
}

export function useProjectOverrides() {
  const [overrides, setOverrides] = useState<ProjectOverrides>(loadOverrides)

  const updateProject = (
    id: string,
    patch: { status?: ProjectStatus; lastMove?: string; nextMove?: string; progress?: number },
  ) => {
    setOverrides((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } }
      saveOverrides(next)
      return next
    })
  }

  return { overrides, updateProject }
}
