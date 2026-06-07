import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'

export interface SeriesPoint {
  time: string
  value: number
}

interface Props {
  points: SeriesPoint[]
  color: string
  kind?: 'line' | 'bar'
  unit?: string
  /** Force the y-axis to start at zero (good for precip/UV). */
  zeroFloor?: boolean
  height?: number
  col?: number
}

const PAD_T = 16
const AXIS = 20

/** Generic scrollable hourly chart used by the metric drill-down modals —
 *  line for continuous values, bars for accumulations. Marks day boundaries. */
export function SeriesChart({ points, color, kind = 'line', unit = '', zeroFloor = false, height = 150, col = 16 }: Props) {
  const width = Math.max(points.length * col, 200)
  const plotH = height - AXIS

  const { min, max } = useMemo(() => {
    const vals = points.map((p) => p.value)
    let lo = Math.min(...vals)
    let hi = Math.max(...vals)
    if (zeroFloor) lo = Math.min(0, lo)
    if (hi - lo < 1) hi = lo + 1
    return { min: lo, max: hi }
  }, [points, zeroFloor])

  const span = Math.max(1, max - min)
  const y = (v: number) => PAD_T + (1 - (v - min) / span) * (plotH - PAD_T)
  const x = (i: number) => i * col + col / 2

  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')
  const area = `${x(0)},${plotH} ${line} ${x(points.length - 1)},${plotH}`

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="block" role="img" aria-label="hourly series">
        {/* day boundaries + midday labels */}
        {points.map((p, i) => {
          const d = parseISO(p.time)
          const isMidnight = d.getHours() === 0
          return isMidnight ? (
            <g key={`b-${p.time}`}>
              <line x1={i * col} x2={i * col} y1={0} y2={plotH} stroke="#2a3442" strokeWidth={0.6} />
              <text x={i * col + 3} y={11} fontSize={9} fill="#6b7785">
                {format(d, 'EEE d')}
              </text>
            </g>
          ) : null
        })}

        {kind === 'bar'
          ? points.map((p, i) =>
              p.value > 0 ? (
                <rect
                  key={p.time}
                  x={i * col + col * 0.15}
                  y={y(p.value)}
                  width={col * 0.7}
                  height={Math.max(0, plotH - y(p.value))}
                  fill={color}
                  opacity={0.6}
                />
              ) : null,
            )
          : (
            <>
              <polygon points={area} fill={color} opacity={0.08} />
              <polyline points={line} fill="none" stroke={color} strokeWidth={1.6} />
            </>
          )}

        {/* value labels every 6h */}
        {points.map((p, i) =>
          i % 6 === 0 ? (
            <text key={`v-${p.time}`} x={x(i)} y={Math.max(10, y(p.value) - 5)} textAnchor="middle" fontSize={9} fill="#c8d2dc">
              {Math.round(p.value)}
              {unit}
            </text>
          ) : null,
        )}

        {/* hour axis every 6h */}
        {points.map((p, i) =>
          i % 6 === 0 ? (
            <text key={`x-${p.time}`} x={x(i)} y={height - 6} textAnchor="middle" fontSize={8} fill="#6b7785">
              {format(parseISO(p.time), 'HH')}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  )
}
