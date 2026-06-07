import { symbolInfo } from './symbols'

interface Props {
  code: string | undefined
  size?: number
  className?: string
  /** Override the symbol's tone with a fixed colour. */
  color?: string
}

/** Renders the lucide icon for a MET symbol code, tinted to its weather tone. */
export function WeatherSymbol({ code, size = 24, className, color }: Props) {
  const { Icon, label, tone } = symbolInfo(code)
  return <Icon size={size} strokeWidth={1.6} className={className} color={color ?? tone} aria-label={label} />
}

export { symbolInfo }
