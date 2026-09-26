import { useMemo } from 'react'
import type { Note } from '@/data/notes'
import { useVault } from '@/features/notes/notesStore'
import { inferType, type PropType } from '@/features/notes/frontmatter'
import { cleanTag, noteTags } from '@/features/notes/vault'
import { useProjects, type ProjectView } from '@/features/projects/store'

// The connective layer of BaseSpace: one tag namespace and one property
// model shared by notes and projects, so everything that carries the same
// tag or property is linked — the base for "related" lists, bases that
// span notes and projects, and a future knowledge graph.

export interface TagEntry {
  tag: string
  notes: Note[]
  projects: ProjectView[]
}

export function normTag(t: string): string {
  return cleanTag(t)
}

export function useGlobalTags() {
  const { notes } = useVault()
  const projects = useProjects()
  return useMemo(() => {
    const index = new Map<string, TagEntry>()
    const entry = (t: string) => {
      const tag = normTag(t)
      let e = index.get(tag)
      if (!e) index.set(tag, (e = { tag, notes: [], projects: [] }))
      return e
    }
    for (const n of notes) for (const t of noteTags(n)) entry(t).notes.push(n)
    for (const p of projects) for (const t of p.tags) entry(t).projects.push(p)
    const all = [...index.values()].sort(
      (a, b) => b.notes.length + b.projects.length - (a.notes.length + a.projects.length) || a.tag.localeCompare(b.tag),
    )
    return { index, all }
  }, [notes, projects])
}

/** Property types and known values across notes AND projects. Types come
 *  from the one vault-wide registry (set from either place); properties
 *  only projects use are inferred from their values. */
export function useGlobalProps() {
  const { notes, propTypes } = useVault()
  const projects = useProjects()
  return useMemo(() => {
    const types: Record<string, PropType> = {}
    const values = new Map<string, Set<string>>()
    const add = (props: Record<string, unknown> | undefined) => {
      for (const [k, v] of Object.entries(props ?? {})) {
        const set = values.get(k) ?? new Set<string>()
        for (const x of Array.isArray(v) ? v : v == null || typeof v === 'boolean' ? [] : [String(v)]) set.add(String(x))
        values.set(k, set)
      }
    }
    for (const n of notes) add(n.props)
    for (const p of projects) {
      add(p.props)
      for (const [k, v] of Object.entries(p.props)) types[k] ??= inferType(k, v)
    }
    return {
      propTypes: { ...types, ...propTypes },
      suggestions: (key: string) => [...(values.get(key) ?? [])].sort(),
    }
  }, [notes, projects, propTypes])
}
