// A base (Obsidian Bases) is stored as a note of kind 'base' whose body is
// this config as JSON — which is also valid YAML, like Obsidian's .base.

export type FilterOp =
  | 'is'
  | 'is not'
  | 'contains'
  | 'does not contain'
  | 'starts with'
  | 'ends with'
  | 'is empty'
  | 'is not empty'
  | '>'
  | '<'
  | '>='
  | '<='
  | 'has tag'
  | 'in folder'

export const FILTER_OPS: FilterOp[] = [
  'is', 'is not', 'contains', 'does not contain', 'starts with', 'ends with',
  'is empty', 'is not empty', '>', '<', '>=', '<=', 'has tag', 'in folder',
]

export interface BaseFilter {
  prop: string
  op: FilterOp
  value: string
}

export interface BaseSort {
  prop: string
  dir: 'asc' | 'desc'
}

export interface BaseView {
  id: string
  name: string
  type: 'table' | 'cards'
  filters: BaseFilter[]
  match: 'all' | 'any'
  sort: BaseSort[]
  groupBy: string | null
  /** Property ids: `file.name`, `file.folder`, …, a note property name,
   *  or `formula.<name>`. */
  columns: string[]
  /** Cards view: property holding an image URL, or null for none. */
  cardImage?: string | null
  /** Which records the view lists: notes (default), projects, or both. */
  source?: 'notes' | 'projects' | 'all'
}

export interface BaseConfig {
  formulas: Record<string, string>
  views: BaseView[]
}

export function defaultBase(): BaseConfig {
  return {
    formulas: {},
    views: [
      {
        id: 'view-1',
        name: 'Table',
        type: 'table',
        filters: [],
        match: 'all',
        sort: [{ prop: 'file.name', dir: 'asc' }],
        groupBy: null,
        columns: ['file.name', 'file.folder', 'file.tags', 'file.mtime'],
      },
    ],
  }
}

export function parseBase(body: string): BaseConfig {
  try {
    const raw = JSON.parse(body) as Partial<BaseConfig>
    const views = (raw.views ?? []).map((v, i) => ({
      ...defaultBase().views[0],
      ...v,
      id: v.id ?? `view-${i + 1}`,
    }))
    return { formulas: raw.formulas ?? {}, views: views.length ? views : defaultBase().views }
  } catch {
    return defaultBase()
  }
}
