import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  FileText,
  Filter,
  Layers,
  LayoutGrid,
  Plus,
  Sigma,
  Table2,
  Trash2,
  X,
} from 'lucide-react'
import type { Note } from '@/data/notes'
import { cn } from '@/lib/cn'
import { inferType, type PropType, type PropValue } from '../frontmatter'
import { openContextMenu } from '../menuBus'
import { ValueEditor } from '../PropertiesPanel'
import { isFormula, isFileProp, makeGetter, noteKey, propLabel, allPropIds, groupRows, runView, formatValue, type Getter } from './engine'
import { FORMULA_FUNCTIONS, type Value } from './formula'
import { FILTER_OPS, parseBase, type BaseConfig, type BaseFilter, type BaseView as View } from './types'

type Panel = 'sort' | 'filter' | 'props' | 'group' | 'formulas'

export function BaseView({
  base,
  notes,
  projectRows = [],
  propTypes,
  suggestions,
  onChange,
  onOpenNote,
  onCreateNote,
  onSetProp,
  onOpenWiki,
  onTagClick,
}: {
  base: Note
  notes: Note[]
  /** Projects as note-shaped rows (folder "Projects"), for views whose
   *  source includes projects. */
  projectRows?: Note[]
  propTypes: Record<string, PropType>
  suggestions: (key: string) => string[]
  onChange: (body: string) => void
  onOpenNote: (id: string) => void
  onCreateNote: (folder: string, props: Record<string, PropValue>, source: 'notes' | 'projects') => void
  onSetProp: (note: Note, key: string, value: PropValue | undefined) => void
  onOpenWiki: (target: string) => void
  onTagClick: (tag: string) => void
}) {
  const config = useMemo(() => parseBase(base.body), [base.body])
  const [viewId, setViewId] = useState(config.views[0].id)
  const view = config.views.find((v) => v.id === viewId) ?? config.views[0]
  const [panel, setPanel] = useState<Panel | null>(null)
  const [renamingView, setRenamingView] = useState<string | null>(null)

  useEffect(() => setPanel(null), [base.id])

  const save = (next: BaseConfig) => onChange(JSON.stringify(next, null, 2))
  const updateView = (patch: Partial<View>) =>
    save({ ...config, views: config.views.map((v) => (v.id === view.id ? { ...v, ...patch } : v)) })

  const get = useMemo(() => makeGetter(config.formulas), [config.formulas])
  const source = view.source ?? 'notes'
  const records = useMemo(
    () => (source === 'notes' ? notes : source === 'projects' ? projectRows : [...notes, ...projectRows]),
    [source, notes, projectRows],
  )
  const rows = useMemo(() => runView(view, records, get, base.id), [view, records, get, base.id])
  const groups = useMemo(() => groupRows(rows, view.groupBy, get), [rows, view.groupBy, get])
  const propIds = useMemo(() => allPropIds(propTypes, config.formulas), [propTypes, config.formulas])

  const addView = () => {
    const id = `view-${Date.now().toString(36)}`
    save({ ...config, views: [...config.views, { ...view, id, name: `View ${config.views.length + 1}` }] })
    setViewId(id)
  }

  const viewMenu = (v: View, x: number, y: number) =>
    openContextMenu(x, y, [
      { kind: 'header', label: v.name },
      { label: 'Rename', onSelect: () => setRenamingView(v.id) },
      {
        label: 'Duplicate',
        onSelect: () => {
          const id = `view-${Date.now().toString(36)}`
          save({ ...config, views: [...config.views, { ...v, id, name: `${v.name} copy` }] })
          setViewId(id)
        },
      },
      {
        label: 'Layout',
        submenu: [
          { label: 'Table', checked: v.type === 'table', onSelect: () => save({ ...config, views: config.views.map((x) => (x.id === v.id ? { ...x, type: 'table' } : x)) }) },
          { label: 'Cards', checked: v.type === 'cards', onSelect: () => save({ ...config, views: config.views.map((x) => (x.id === v.id ? { ...x, type: 'cards' } : x)) }) },
        ],
      },
      { kind: 'separator' },
      {
        label: 'Delete view',
        danger: true,
        disabled: config.views.length <= 1,
        onSelect: () => {
          const views = config.views.filter((x) => x.id !== v.id)
          save({ ...config, views })
          setViewId(views[0].id)
        },
      },
    ])

  const newNote = () => {
    const folderFilter = view.filters.find(
      (f) => f.op === 'in folder' || (f.prop === 'file.folder' && (f.op === 'is' || f.op === 'starts with')),
    )
    const props: Record<string, PropValue> = {}
    for (const f of view.filters) {
      if (f.op !== 'is' || !f.prop || isFileProp(f.prop) || isFormula(f.prop)) continue
      const n = Number(f.value)
      props[noteKey(f.prop)] = f.value !== '' && !Number.isNaN(n) ? n : f.value
    }
    onCreateNote(folderFilter?.value ?? base.folder, props, source === 'projects' ? 'projects' : 'notes')
  }

  const toggleSort = (prop: string) => {
    const cur = view.sort[0]
    updateView({ sort: [{ prop, dir: cur?.prop === prop && cur.dir === 'asc' ? 'desc' : 'asc' }] })
  }

  const columnMenu = (prop: string, x: number, y: number) => {
    const i = view.columns.indexOf(prop)
    const move = (d: number) => {
      const cols = [...view.columns]
      const [c] = cols.splice(i, 1)
      cols.splice(Math.max(0, Math.min(cols.length, i + d)), 0, c)
      updateView({ columns: cols })
    }
    openContextMenu(x, y, [
      { kind: 'header', label: propLabel(prop), mono: true },
      { label: 'Sort ascending', onSelect: () => updateView({ sort: [{ prop, dir: 'asc' }] }) },
      { label: 'Sort descending', onSelect: () => updateView({ sort: [{ prop, dir: 'desc' }] }) },
      { label: view.groupBy === prop ? 'Stop grouping' : 'Group by this', onSelect: () => updateView({ groupBy: view.groupBy === prop ? null : prop }) },
      { kind: 'separator' },
      { label: 'Move left', disabled: i <= 0, onSelect: () => move(-1) },
      { label: 'Move right', disabled: i >= view.columns.length - 1, onSelect: () => move(1) },
      { label: 'Hide column', danger: true, onSelect: () => updateView({ columns: view.columns.filter((c) => c !== prop) }) },
    ])
  }

  const cellProps = { get, propTypes, suggestions, onOpenNote, onSetProp, onOpenWiki, onTagClick }

  return (
    <div className="flex h-full min-h-0 flex-col font-read text-[13px]">
      {/* Views + toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-3 py-1.5">
        {config.views.map((v) => (
          <div key={v.id}>
            {renamingView === v.id ? (
              <input
                autoFocus
                defaultValue={v.name}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                  if (e.key === 'Escape') setRenamingView(null)
                }}
                onBlur={(e) => {
                  const name = e.currentTarget.value.trim()
                  setRenamingView(null)
                  if (name) save({ ...config, views: config.views.map((x) => (x.id === v.id ? { ...x, name } : x)) })
                }}
                className="w-32 rounded-sm border border-accent/60 bg-bg px-2 py-1 text-[12px] text-text outline-none"
              />
            ) : (
              <button
                onClick={() => setViewId(v.id)}
                onDoubleClick={() => setRenamingView(v.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  viewMenu(v, e.clientX, e.clientY)
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-control px-2 py-1 text-[12px] transition-colors',
                  v.id === view.id ? 'bg-panel-2 text-text' : 'text-dim hover:text-text',
                )}
              >
                {v.type === 'cards' ? <LayoutGrid size={12} /> : <Table2 size={12} />}
                {v.name}
              </button>
            )}
          </div>
        ))}
        <button onClick={addView} title="Add view" className="rounded-control p-1 text-dim hover:bg-panel-2 hover:text-text">
          <Plus size={13} />
        </button>
        <div className="-mx-1 flex w-full items-center gap-0.5 overflow-x-auto px-1 sm:mx-0 sm:ml-auto sm:w-auto sm:overflow-visible [&>*]:shrink-0">
          <select
            value={source}
            onChange={(e) => updateView({ source: e.target.value as View['source'] })}
            title="What this view lists"
            className="mr-1 rounded-control border border-line bg-bg px-1.5 py-1 text-[12px] text-text focus:border-accent/60 focus:outline-none"
          >
            <option value="notes">Notes</option>
            <option value="projects">Projects</option>
            <option value="all">Notes + projects</option>
          </select>
          <span className="mr-2 text-[11px] text-dim">
            {rows.length} result{rows.length === 1 ? '' : 's'}
          </span>
          <ToolBtn icon={<ArrowUpDown size={13} />} label="Sort" active={panel === 'sort'} count={view.sort.length} onClick={() => setPanel(panel === 'sort' ? null : 'sort')} />
          <ToolBtn icon={<Filter size={13} />} label="Filter" active={panel === 'filter'} count={view.filters.length} onClick={() => setPanel(panel === 'filter' ? null : 'filter')} />
          <ToolBtn icon={<Columns3 size={13} />} label="Properties" active={panel === 'props'} onClick={() => setPanel(panel === 'props' ? null : 'props')} />
          <ToolBtn icon={<Layers size={13} />} label="Group" active={panel === 'group'} count={view.groupBy ? 1 : 0} onClick={() => setPanel(panel === 'group' ? null : 'group')} />
          <ToolBtn icon={<Sigma size={13} />} label="Formulas" active={panel === 'formulas'} count={Object.keys(config.formulas).length} onClick={() => setPanel(panel === 'formulas' ? null : 'formulas')} />
          <button onClick={newNote} className="ml-1 flex items-center gap-1 rounded-control bg-accent/15 px-2 py-1 text-[12px] text-accent hover:bg-accent/25">
            <Plus size={12} /> New
          </button>
        </div>
      </div>

      {panel && (
        <div className="border-b border-line bg-panel/60 px-4 py-3">
          {panel === 'sort' && <SortPanel view={view} propIds={propIds} onChange={updateView} />}
          {panel === 'filter' && <FilterPanel view={view} propIds={propIds} onChange={updateView} />}
          {panel === 'props' && <ColumnsPanel view={view} propIds={propIds} onChange={updateView} />}
          {panel === 'group' && (
            <label className="flex items-center gap-2 text-dim">
              Group by
              <PropSelect value={view.groupBy ?? ''} propIds={propIds} allowNone onChange={(p) => updateView({ groupBy: p || null })} />
            </label>
          )}
          {panel === 'formulas' && <FormulasPanel config={config} view={view} sample={rows[0]} get={get} onSave={save} />}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {view.type === 'table' ? (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-panel">
              <tr>
                {view.columns.map((c) => {
                  const s = view.sort.find((x) => x.prop === c)
                  return (
                    <th
                      key={c}
                      onClick={() => toggleSort(c)}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        columnMenu(c, e.clientX, e.clientY)
                      }}
                      className="cursor-pointer select-none whitespace-nowrap border-b border-r border-line px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-dim hover:text-text"
                    >
                      <span className="inline-flex items-center gap-1">
                        {isFormula(c) && <Sigma size={11} className="text-accent/70" />}
                        {propLabel(c)}
                        {s && (s.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {groups.map(([g, items]) => (
                <Fragment key={g || 'all'}>
                  {view.groupBy && (
                    <tr>
                      <td colSpan={view.columns.length} className="border-b border-line bg-panel-2/60 px-3 py-1.5 text-[12px] font-semibold text-text">
                        {g} <span className="font-normal text-dim">{items.length}</span>
                      </td>
                    </tr>
                  )}
                  {items.map((n) => (
                    <tr key={n.id} className="hover:bg-panel-2/40">
                      {view.columns.map((c) => (
                        <td key={c} className="max-w-[320px] border-b border-r border-line/70 px-2 py-1 align-top">
                          <Cell note={n} prop={c} {...cellProps} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        ) : (
          view.groupBy ? (
            // Grouped cards read as a board: one column per group.
            <div className="flex min-h-full items-start gap-3 p-4">
              {groups.map(([g, items]) => (
                <section key={g} className="w-[250px] shrink-0 rounded-panel bg-panel-2/40 p-2">
                  <h3 className="mb-2 px-1 text-[12px] font-semibold text-text">
                    {g} <span className="font-normal text-dim">{items.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {items.map((n) => (
                      <Card key={n.id} note={n} view={view} {...cellProps} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3 p-4">
              {rows.map((n) => (
                <Card key={n.id} note={n} view={view} {...cellProps} />
              ))}
            </div>
          )
        )}
        {!rows.length && <div className="p-6 text-center text-[12px] text-dim">No notes match this view's filters.</div>}
        <button onClick={newNote} className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[12px] text-dim hover:bg-panel-2/40 hover:text-text">
          <Plus size={12} /> {source === 'projects' ? 'New project' : 'New note'}
        </button>
      </div>
    </div>
  )
}

function ToolBtn({ icon, label, active, count, onClick }: { icon: ReactNode; label: string; active: boolean; count?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'flex items-center gap-1 rounded-control px-2 py-1 text-[12px] transition-colors',
        active ? 'bg-panel-2 text-accent' : 'text-dim hover:bg-panel-2 hover:text-text',
      )}
    >
      {icon}
      <span className="hidden xl:inline">{label}</span>
      {!!count && <span className="rounded-full bg-accent/20 px-1.5 text-[10px] text-accent-1">{count}</span>}
    </button>
  )
}

function PropSelect({ value, propIds, onChange, allowNone }: { value: string; propIds: string[]; onChange: (p: string) => void; allowNone?: boolean }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-control border border-line bg-bg px-2 py-1 text-[12px] text-text focus:border-accent/60 focus:outline-none"
    >
      {allowNone && <option value="">None</option>}
      {!allowNone && !value && <option value="">Choose property…</option>}
      {propIds.map((p) => (
        <option key={p} value={p}>
          {isFormula(p) ? `ƒ ${propLabel(p)}` : propLabel(p)}
        </option>
      ))}
    </select>
  )
}

const small = 'rounded-control border border-line bg-bg px-2 py-1 text-[12px] text-text focus:border-accent/60 focus:outline-none'
const iconBtn = 'rounded-control p-1 text-dim hover:bg-panel-2 hover:text-danger'
const addBtn = 'flex items-center gap-1 rounded-control px-1.5 py-1 text-[12px] text-dim hover:bg-panel-2 hover:text-text'

function SortPanel({ view, propIds, onChange }: { view: View; propIds: string[]; onChange: (p: Partial<View>) => void }) {
  const set = (i: number, patch: Partial<View['sort'][number]>) => onChange({ sort: view.sort.map((s, j) => (j === i ? { ...s, ...patch } : s)) })
  return (
    <div className="space-y-1.5">
      {view.sort.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-12 text-[11px] text-dim">{i === 0 ? 'Sort by' : 'then'}</span>
          <PropSelect value={s.prop} propIds={propIds} onChange={(prop) => set(i, { prop })} />
          <select value={s.dir} onChange={(e) => set(i, { dir: e.target.value as 'asc' | 'desc' })} className={small}>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
          <button onClick={() => onChange({ sort: view.sort.filter((_, j) => j !== i) })} className={iconBtn} aria-label="Remove sort">
            <X size={13} />
          </button>
        </div>
      ))}
      <button onClick={() => onChange({ sort: [...view.sort, { prop: 'file.name', dir: 'asc' }] })} className={addBtn}>
        <Plus size={12} /> Add sort
      </button>
    </div>
  )
}

function FilterPanel({ view, propIds, onChange }: { view: View; propIds: string[]; onChange: (p: Partial<View>) => void }) {
  const set = (i: number, patch: Partial<BaseFilter>) => onChange({ filters: view.filters.map((f, j) => (j === i ? { ...f, ...patch } : f)) })
  return (
    <div className="space-y-1.5">
      {view.filters.length > 1 && (
        <div className="flex items-center gap-2 text-[12px] text-dim">
          Match
          <select value={view.match} onChange={(e) => onChange({ match: e.target.value as 'all' | 'any' })} className={small}>
            <option value="all">all filters</option>
            <option value="any">any filter</option>
          </select>
        </div>
      )}
      {view.filters.map((f, i) => {
        const noProp = f.op === 'has tag' || f.op === 'in folder'
        const noValue = f.op === 'is empty' || f.op === 'is not empty'
        return (
          <div key={i} className="flex flex-wrap items-center gap-2">
            {!noProp && <PropSelect value={f.prop} propIds={propIds} onChange={(prop) => set(i, { prop })} />}
            <select value={f.op} onChange={(e) => set(i, { op: e.target.value as BaseFilter['op'] })} className={small}>
              {FILTER_OPS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
            {!noValue && (
              <input
                key={`${i}:${f.value}`}
                defaultValue={f.value}
                placeholder={f.op === 'has tag' ? 'tag' : f.op === 'in folder' ? 'Folder/path' : 'value'}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                onBlur={(e) => e.currentTarget.value !== f.value && set(i, { value: e.currentTarget.value })}
                className={cn(small, 'w-40')}
              />
            )}
            <button onClick={() => onChange({ filters: view.filters.filter((_, j) => j !== i) })} className={iconBtn} aria-label="Remove filter">
              <X size={13} />
            </button>
          </div>
        )
      })}
      <button onClick={() => onChange({ filters: [...view.filters, { prop: 'file.name', op: 'contains', value: '' }] })} className={addBtn}>
        <Plus size={12} /> Add filter
      </button>
    </div>
  )
}

function ColumnsPanel({ view, propIds, onChange }: { view: View; propIds: string[]; onChange: (p: Partial<View>) => void }) {
  const shown = view.columns
  const hidden = propIds.filter((p) => !shown.includes(p))
  const move = (i: number, d: number) => {
    const cols = [...shown]
    const [c] = cols.splice(i, 1)
    cols.splice(i + d, 0, c)
    onChange({ columns: cols })
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <div className="mb-1 text-[11px] text-dim">Shown, in order</div>
        {shown.map((p, i) => (
          <div key={p} className="flex items-center gap-1 rounded-control px-1 py-0.5 hover:bg-panel-2">
            <input type="checkbox" checked onChange={() => onChange({ columns: shown.filter((c) => c !== p) })} className="accent-[#c77591]" />
            <span className="flex-1 truncate">{isFormula(p) ? `ƒ ${propLabel(p)}` : propLabel(p)}</span>
            <button disabled={i === 0} onClick={() => move(i, -1)} className="p-0.5 text-dim hover:text-text disabled:opacity-30" aria-label="Move up">
              <ArrowUp size={12} />
            </button>
            <button disabled={i === shown.length - 1} onClick={() => move(i, 1)} className="p-0.5 text-dim hover:text-text disabled:opacity-30" aria-label="Move down">
              <ArrowDown size={12} />
            </button>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-1 text-[11px] text-dim">Available</div>
        {hidden.map((p) => (
          <label key={p} className="flex cursor-pointer items-center gap-1 rounded-control px-1 py-0.5 hover:bg-panel-2">
            <input type="checkbox" checked={false} onChange={() => onChange({ columns: [...shown, p] })} className="accent-[#c77591]" />
            <span className="truncate text-text/80">{isFormula(p) ? `ƒ ${propLabel(p)}` : propLabel(p)}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function FormulasPanel({
  config,
  view,
  sample,
  get,
  onSave,
}: {
  config: BaseConfig
  view: View
  sample: Note | undefined
  get: Getter
  onSave: (c: BaseConfig) => void
}) {
  const entries = Object.entries(config.formulas)
  const rename = (from: string, to: string) => {
    to = to.trim().replace(/[^\p{L}\p{N}_]/gu, '_')
    if (!to || to === from || to in config.formulas) return
    const formulas = Object.fromEntries(entries.map(([k, v]) => (k === from ? [to, v] : [k, v])))
    const remap = (c: string) => (c === `formula.${from}` ? `formula.${to}` : c)
    onSave({
      formulas,
      views: config.views.map((v) => ({
        ...v,
        columns: v.columns.map(remap),
        sort: v.sort.map((s) => ({ ...s, prop: remap(s.prop) })),
        groupBy: v.groupBy ? remap(v.groupBy) : null,
      })),
    })
  }
  return (
    <div className="space-y-2">
      {entries.map(([name, src]) => {
        const preview = sample ? get(sample, `formula.${name}`) : null
        const error = typeof preview === 'string' && preview.startsWith('⚠')
        return (
          <div key={name} className="flex flex-wrap items-start gap-2">
            <input
              key={`n:${name}`}
              defaultValue={name}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              onBlur={(e) => rename(name, e.currentTarget.value)}
              className={cn(small, 'w-32')}
            />
            <div className="min-w-[240px] flex-1">
              <input
                key={`s:${name}:${src}`}
                defaultValue={src}
                spellCheck={false}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                onBlur={(e) => e.currentTarget.value !== src && onSave({ ...config, formulas: { ...config.formulas, [name]: e.currentTarget.value } })}
                className={cn(small, 'w-full font-mono')}
              />
              <div className={cn('mt-0.5 truncate text-[11px]', error ? 'text-danger' : 'text-dim')}>
                {sample ? `${sample.title} → ${formatValue(preview as Value) || '(empty)'}` : 'No rows to preview'}
              </div>
            </div>
            <button
              onClick={() => {
                const formulas = { ...config.formulas }
                delete formulas[name]
                const gone = `formula.${name}`
                onSave({ formulas, views: config.views.map((v) => ({ ...v, columns: v.columns.filter((c) => c !== gone) })) })
              }}
              className={iconBtn}
              aria-label="Delete formula"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )
      })}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            let i = entries.length + 1
            while (`formula${i}` in config.formulas) i++
            const name = `formula${i}`
            onSave({
              formulas: { ...config.formulas, [name]: '""' },
              views: config.views.map((v) => (v.id === view.id ? { ...v, columns: [...v.columns, `formula.${name}`] } : v)),
            })
          }}
          className={addBtn}
        >
          <Plus size={12} /> Add formula
        </button>
        <span className="truncate text-[11px] text-dim" title={FORMULA_FUNCTIONS.join(', ')}>
          Use property names, "text", numbers, + − × ÷, == != &gt; &lt;, and/or, and functions like if(), daysUntil(), lower(), repeat()
        </span>
      </div>
    </div>
  )
}

interface CellProps {
  get: Getter
  propTypes: Record<string, PropType>
  suggestions: (key: string) => string[]
  onOpenNote: (id: string) => void
  onSetProp: (note: Note, key: string, value: PropValue | undefined) => void
  onOpenWiki: (target: string) => void
  onTagClick: (tag: string) => void
}

function Display({ value, prop, onOpenWiki, onTagClick }: { value: Value; prop: string; onOpenWiki: (t: string) => void; onTagClick: (t: string) => void }) {
  if (typeof value === 'string' && value.startsWith('⚠')) return <span className="text-[12px] text-danger">{value}</span>
  if (Array.isArray(value)) {
    const tags = prop === 'file.tags'
    return (
      <span className="flex flex-wrap gap-1">
        {value.map((v) => (
          <button
            key={v}
            onClick={() => (tags ? onTagClick(v) : /^\[\[.+\]\]$/.test(v) ? onOpenWiki(v.slice(2, -2).split('|')[0]) : undefined)}
            className={cn('rounded-full px-2 py-px text-[11px]', tags ? 'bg-accent/15 text-accent-1' : 'bg-panel-2 text-text/85')}
          >
            {tags ? `#${v}` : v}
          </button>
        ))}
      </span>
    )
  }
  return <span className="break-words text-text/90">{formatValue(value)}</span>
}

function Cell({ note, prop, get, propTypes, suggestions, onOpenNote, onSetProp, onOpenWiki, onTagClick }: CellProps & { note: Note; prop: string }) {
  const value = get(note, prop)
  if (prop === 'file.name') {
    return (
      <button onClick={() => onOpenNote(note.id)} className="flex items-center gap-1.5 px-1 py-0.5 text-left font-semibold text-text hover:text-accent-1">
        <FileText size={12} className="shrink-0 text-dim" />
        <span className="underline decoration-line-2 underline-offset-2">{note.title}</span>
      </button>
    )
  }
  if (isFileProp(prop) || isFormula(prop)) {
    return (
      <div className="px-1 py-0.5">
        <Display value={value} prop={prop} onOpenWiki={onOpenWiki} onTagClick={onTagClick} />
      </div>
    )
  }
  const key = noteKey(prop)
  const type = propTypes[key] ?? inferType(key, value as PropValue)
  return (
    <ValueEditor
      type={type}
      value={value as PropValue}
      suggestions={suggestions(key)}
      onChange={(v) => onSetProp(note, key, v)}
      onOpenWiki={onOpenWiki}
      onTagClick={onTagClick}
    />
  )
}

function Card({ note, view, ...p }: CellProps & { note: Note; view: View }) {
  const imgProp = view.cardImage ? p.get(note, view.cardImage) : null
  const bodyImg = /!\[[^\]]*\]\(([^)\s]+)\)/.exec(note.body)?.[1]
  const img = typeof imgProp === 'string' && imgProp ? imgProp : view.cardImage ? bodyImg : null
  return (
    <div className="overflow-hidden rounded-panel border border-line bg-panel/60 transition-colors hover:border-line-2">
      {img && (
        <button onClick={() => p.onOpenNote(note.id)} className="block h-24 w-full overflow-hidden bg-panel-2">
          <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
        </button>
      )}
      <div className="space-y-1.5 p-3">
        <button onClick={() => p.onOpenNote(note.id)} className="block w-full truncate text-left text-[14px] font-semibold text-text hover:text-accent-1">
          {note.title}
        </button>
        {view.columns
          .filter((c) => c !== 'file.name')
          .map((c) => (
            <div key={c} className="flex items-start gap-2 text-[12px]">
              <span className="w-16 shrink-0 truncate pt-0.5 text-dim">{propLabel(c)}</span>
              <div className="min-w-0 flex-1">
                <Cell note={note} prop={c} {...p} />
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
