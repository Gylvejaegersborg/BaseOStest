import { RECURRENCE_LABEL, type Recurrence, type RecurrenceFreq } from '@/data/calendar'
import { DateField } from './DateField'

const FREQS: RecurrenceFreq[] = ['daily', 'weekly', 'monthly']

interface RecurrenceFieldProps {
  value: Recurrence | undefined
  onChange: (r: Recurrence | undefined) => void
}

/** Shared "Repeat" control for the appointment/task/reminder editors — a
 *  freq select plus an optional end date, collapsing to just "None" when
 *  the item doesn't recur. */
export function RecurrenceField({ value, onChange }: RecurrenceFieldProps) {
  return (
    <div className="mb-3 grid grid-cols-2 gap-2">
      <div>
        <label className="label mb-1 block">Repeat</label>
        <select
          value={value?.freq ?? ''}
          onChange={(e) => {
            const freq = e.target.value as RecurrenceFreq | ''
            onChange(freq ? { freq, until: value?.until } : undefined)
          }}
          className="w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
        >
          <option value="">Doesn't repeat</option>
          {FREQS.map((f) => (
            <option key={f} value={f}>
              {RECURRENCE_LABEL[f]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label mb-1 block">Ends</label>
        <DateField
          value={value?.until}
          onChange={(d) => value && onChange({ ...value, until: d })}
          allowEmpty
          disabled={!value}
          className="w-full disabled:opacity-40"
        />
      </div>
    </div>
  )
}
