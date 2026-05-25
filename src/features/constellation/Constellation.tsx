import { useMemo } from 'react'
import { buildBodies, sunPos, SUN_LINKS, VIEW_H, VIEW_W, type Body } from './layout'

interface Props {
  activeKey: string | null
  onHover: (b: Body | null) => void
  onSelect: (b: Body) => void
}

export function Constellation({ activeKey, onHover, onSelect }: Props) {
  const { suns, planets } = useMemo(() => buildBodies(), [])

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    >
      {/* constellation outline between suns */}
      <g opacity={0.25}>
        {SUN_LINKS.map(([a, b], i) => {
          const pa = sunPos(a)
          const pb = sunPos(b)
          return (
            <line
              key={i}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke="#36e0c8"
              strokeWidth={0.6}
              strokeDasharray="2 6"
            />
          )
        })}
      </g>

      {/* sun → planet tethers */}
      <g>
        {planets.map((p) => {
          const sp = sunPos(p.sectionId)
          return (
            <line
              key={`t-${p.key}`}
              x1={sp.x}
              y1={sp.y}
              x2={p.x}
              y2={p.y}
              stroke={p.accent}
              strokeWidth={0.5}
              opacity={activeKey === p.key ? 0.7 : 0.18}
            />
          )
        })}
      </g>

      {/* planets */}
      {planets.map((p) => (
        <BodyNode key={p.key} body={p} active={activeKey === p.key} onHover={onHover} onSelect={onSelect} />
      ))}

      {/* suns (drawn last so they sit on top) */}
      {suns.map((s) => (
        <BodyNode key={s.key} body={s} active={activeKey === s.key} onHover={onHover} onSelect={onSelect} />
      ))}
    </svg>
  )
}

function BodyNode({
  body,
  active,
  onHover,
  onSelect,
}: {
  body: Body
  active: boolean
  onHover: (b: Body | null) => void
  onSelect: (b: Body) => void
}) {
  const isSun = body.kind === 'sun'
  return (
    <g
      transform={`translate(${body.x} ${body.y})`}
      className="cursor-pointer"
      onMouseEnter={() => onHover(body)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(body)}
    >
      {/* hit area */}
      <circle r={isSun ? 34 : 18} fill="transparent" />
      {/* glow halo */}
      <circle
        r={isSun ? (active ? 30 : 24) : active ? 16 : 11}
        fill={body.accent}
        opacity={active ? 0.18 : 0.1}
        className="transition-all"
      />
      <circle
        r={body.r}
        fill={isSun ? body.accent : '#0a0c10'}
        stroke={body.accent}
        strokeWidth={isSun ? 0 : 1.5}
        style={{ filter: `drop-shadow(0 0 ${active ? 8 : 4}px ${body.accent})` }}
      />
      {isSun && <circle r={body.r - 6} fill="#0a0c10" opacity={0.35} />}
      <text
        x={0}
        y={isSun ? body.r + 16 : body.r + 11}
        textAnchor="middle"
        className="select-none font-mono uppercase"
        fill={active ? body.accent : '#8a96a3'}
        style={{ fontSize: isSun ? 11 : 8, letterSpacing: '0.12em' }}
      >
        {body.label}
      </text>
    </g>
  )
}
