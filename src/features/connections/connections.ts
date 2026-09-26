import { useMemo } from 'react'
import type { Note } from '@/data/notes'
import { useVault } from '@/features/notes/notesStore'
import { inferType, type PropType } from '@/features/notes/frontmatter'
import { cleanTag, noteTags, parseWikiTarget, resolveNote, wikiTargets } from '@/features/notes/vault'
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

// ---- links between notes and projects ------------------------------------

export type LinkHit = { kind: 'note'; note: Note } | { kind: 'project'; project: ProjectView }

/** A `[[target]]` resolves to a note first (paths, titles, aliases), then to
 *  a project by name — so notes and projects can link to each other. */
export function resolveLink(notes: Note[], projects: ProjectView[], target: string, from?: Note | null): LinkHit | null {
  const note = resolveNote(notes, target, from)
  if (note) return { kind: 'note', note }
  const name = parseWikiTarget(target).note.trim().toLowerCase()
  const project = projects.find((p) => p.name.toLowerCase() === name)
  return project ? { kind: 'project', project } : null
}

/** All text a project carries that can hold [[links]]. */
export function projectText(p: ProjectView): string {
  const props = Object.values(p.props ?? {}).flatMap((v) => (Array.isArray(v) ? v : v == null ? [] : [String(v)]))
  return [p.tagline, p.what, ...p.history.map((h) => h.text), ...props].join('\n')
}

export function useLinkGraph() {
  const { notes } = useVault()
  const projects = useProjects()
  return useMemo(() => {
    const resolve = (target: string, from?: Note | null) => resolveLink(notes, projects, target, from)
    /** Projects whose text links to this note. */
    const projectsLinkingTo = (noteId: string) =>
      projects.filter((p) => wikiTargets(projectText(p)).some((t) => resolve(t)?.kind === 'note' && (resolve(t) as { note: Note }).note.id === noteId))
    /** Notes whose text links to this project. */
    const notesLinkingToProject = (projectId: string) =>
      notes.filter((n) =>
        wikiTargets(n.body).some((t) => {
          const hit = resolve(t, n)
          return hit?.kind === 'project' && hit.project.id === projectId
        }),
      )
    /** Everything a project's own text links to. */
    const linksFromProject = (p: ProjectView): LinkHit[] => {
      const seen = new Set<string>()
      const out: LinkHit[] = []
      for (const t of wikiTargets(projectText(p))) {
        const hit = resolve(t)
        const id = hit ? (hit.kind === 'note' ? hit.note.id : hit.project.id) : null
        if (hit && id && id !== p.id && !seen.has(id)) {
          seen.add(id)
          out.push(hit)
        }
      }
      return out
    }
    return { notes, projects, resolve, projectsLinkingTo, notesLinkingToProject, linksFromProject }
  }, [notes, projects])
}
