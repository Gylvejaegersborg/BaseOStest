import { useMemo } from 'react'
import { format } from 'date-fns'
import type { HourPoint } from './types'
import { WeatherSymbol } from './WeatherSymbol'
import { WEATHER_ACCENT } from './format'

const COL = 40 // px per hour
const H_SYMBOL = 30
const H_TEMP = 110
const H_PRECIP = 38
const H_AXIS = 22
const PAD_T = 14 // headroom inside temp band for value labels
const HEIGHT = H_SYMBOL + H_TEMP + H_PRECIP + H_AXIS

/** Meteogram: temperature curve, precipitation bars and weather symbols across
 *  the coming hours — the at-a-glance graph this app is built around. */
export function HourlyGraph({ hours }: { hours: HourPoint[] }) {
  const pts = hours.slice(0, 48)
  const width = pts.length * COL

  const { line, area, tMin, tMax, maxPrecip } = useMemo(() => {
    const temps = pts.map((p) => p.temp)
    const tMin = Math.min(...temps)
    const tMax = Math.max(...temps)
    const span = Math.max(1, tMax - tMin)
    const y = (t: number) => H_SYMBOL + PAD_T + (1 - (t - tMin) / span) * (H_TEMP - PAD_T * 2)
    const x = (i: number) => i * COL + COL / 2
    const line = pts.map((p, i) => `${x(i)},${y(p.temp)}`).join(' ')
    const area =
      `${x(0)},${H_SYMBOL + H_TEMP} ` + line + ` ${x(pts.length - 1)},${H_SYMBOL + H_TEMP}`
    const maxPrecip = Math.max(0.5, ...pts.map((p) => p.precip))
    return { line, area, tMin, tMax, maxPrecip }
  }, [pts])

  const span = Math.max(1, tMax - tMin)
  const yTemp = (t: number) => H_SYMBOL + PAD_T + (1 - (t - tMin) / span) * (H_TEMP - PAD_T * 2)
  const precipTop = H_SYMBOL + H_TEMP

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={HEIGHT} className="block" role="img" aria-label="Hourly forecast meteogram">
        {/* zero-degree reference line, when it falls inside the band */}
        {tMin < 0 && tMax > 0 && (
          <line x1={0} x2={width} y1={yTemp(0)} y2={yTemp(0)} stroke="#2a3442" strokeDasharray="2 4" />
        )}

        {/* day/night column shading + grid */}
        {pts.map((p, i) => {
          const hod = new Date(p.time).getHours()
          const night = hod < 5 || hod >= 22
          return (
            <g key={p.time}>
              {night && <rect x={i * COL} y={H_SYMBOL} width={COL} height={H_TEMP + H_PRECIP} fill="#0e1320" opacity={0.5} />}
              {i % 3 === 0 && <line x1={i * COL} x2={i * COL} y1={H_SYMBOL} y2={precipTop + H_PRECIP} stroke="#1f2733" strokeWidth={0.5} />}
            </g>
          )
        })}

        {/* precipitation bars */}
        {pts.map((p, i) => {
          if (p.precip <= 0) return null
          const h = (p.precip / maxPrecip) * (H_PRECIP - 4)
          return (
            <rect
              key={`p-${p.time}`}
              x={i * COL + COL * 0.2}
              y={precipTop + (H_PRECIP - h)}
              width={COL * 0.6}
              height={h}
              fill={WEATHER_ACCENT}
              opacity={0.55}
            />
          )
        })}

        {/* temperature area + line */}
        <polygon points={area} fill={WEATHER_ACCENT} opacity={0.07} />
        <polyline points={line} fill="none" stroke={WEATHER_ACCENT} strokeWidth={1.8} />

        {/* per-point dots + 3-hourly temp labels */}
        {pts.map((p, i) => (
          <g key={`d-${p.time}`}>
            <circle cx={i * COL + COL / 2} cy={yTemp(p.temp)} r={1.6} fill={WEATHER_ACCENT} />
            {i % 3 === 0 && (
              <text x={i * COL + COL / 2} y={yTemp(p.temp) - 6} textAnchor="middle" fontSize={10} fill="#c8d2dc">
                {Math.round(p.temp)}°
              </text>
            )}
          </g>
        ))}

        {/* symbols every 3 hours */}
        {pts.map((p, i) =>
          i % 3 === 0 ? (
            <foreignObject key={`s-${p.time}`} x={i * COL + COL / 2 - 11} y={4} width={22} height={22}>
              <WeatherSymbol code={p.symbol} size={20} />
            </foreignObject>
          ) : null,
        )}

        {/* precip mm labels (only where it rains, 3-hourly) */}
        {pts.map((p, i) =>
          i % 3 === 0 && p.precip > 0 ? (
            <text
              key={`pl-${p.time}`}
              x={i * COL + COL / 2}
              y={precipTop + H_PRECIP - 3}
              textAnchor="middle"
              fontSize={8}
              fill={WEATHER_ACCENT}
            >
              {p.precip.toFixed(1)}
            </text>
          ) : null,
        )}

        {/* hour axis */}
        {pts.map((p, i) =>
          i % 3 === 0 ? (
            <text
              key={`x-${p.time}`}
              x={i * COL + COL / 2}
              y={HEIGHT - 7}
              textAnchor="middle"
              fontSize={9}
              fill="#6b7785"
            >
              {format(new Date(p.time), 'HH')}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  )
}
