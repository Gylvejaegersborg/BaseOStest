import {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  Cloudy,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSunRain,
  CloudMoonRain,
  CloudSnow,
  Snowflake,
  CloudLightning,
  CloudHail,
  type LucideIcon,
} from 'lucide-react'

// MET Norway symbol codes look like "partlycloudy_day", "lightrainshowers_night",
// "heavysnowandthunder". We strip the day/night suffix, then classify by the
// keywords in the base. Day/night only changes the clear/fair/partly icons.

export interface SymbolInfo {
  Icon: LucideIcon
  label: string
  /** Accent tone for the symbol, in the OS palette. */
  tone: string
}

type DayPart = 'day' | 'night'

function splitCode(code: string): { base: string; part: DayPart } {
  const m = code.match(/_(day|night|polartwilight)$/)
  const part: DayPart = m && m[1] === 'night' ? 'night' : 'day'
  const base = code.replace(/_(day|night|polartwilight)$/, '')
  return { base, part }
}

const TONE = {
  sun: '#f0c020',
  moon: '#9bb0c8',
  cloud: '#8a96a3',
  rain: '#58b6f0',
  snow: '#cfe6ff',
  thunder: '#b58bff',
  fog: '#9aa6b2',
}

// Humanise a base code into a readable label.
function humanLabel(base: string): string {
  const map: Record<string, string> = {
    clearsky: 'Clear sky',
    fair: 'Fair',
    partlycloudy: 'Partly cloudy',
    cloudy: 'Cloudy',
    fog: 'Fog',
    lightrain: 'Light rain',
    rain: 'Rain',
    heavyrain: 'Heavy rain',
    lightrainshowers: 'Light showers',
    rainshowers: 'Rain showers',
    heavyrainshowers: 'Heavy showers',
    lightsleet: 'Light sleet',
    sleet: 'Sleet',
    heavysleet: 'Heavy sleet',
    lightsleetshowers: 'Light sleet showers',
    sleetshowers: 'Sleet showers',
    heavysleetshowers: 'Heavy sleet showers',
    lightsnow: 'Light snow',
    snow: 'Snow',
    heavysnow: 'Heavy snow',
    lightsnowshowers: 'Light snow showers',
    snowshowers: 'Snow showers',
    heavysnowshowers: 'Heavy snow showers',
  }
  if (map[base]) return map[base]
  if (base.includes('thunder')) return 'Thunder'
  // Fallback: prettify the raw token.
  return base.charAt(0).toUpperCase() + base.slice(1)
}

export function symbolInfo(code: string | undefined): SymbolInfo {
  if (!code) return { Icon: Cloud, label: 'Unknown', tone: TONE.cloud }
  const { base, part } = splitCode(code)
  const label = humanLabel(base)
  const isDay = part === 'day'

  // Order matters: most specific first.
  if (base.includes('thunder'))
    return { Icon: CloudLightning, label: label + (base.includes('thunder') ? ' + thunder' : ''), tone: TONE.thunder }
  if (base.includes('snow'))
    return {
      Icon: base.includes('showers') ? CloudSnow : base.startsWith('heavy') ? CloudSnow : Snowflake,
      label,
      tone: TONE.snow,
    }
  if (base.includes('sleet')) return { Icon: CloudHail, label, tone: TONE.snow }
  if (base.includes('rain') || base.includes('drizzle')) {
    if (base.includes('showers'))
      return { Icon: isDay ? CloudSunRain : CloudMoonRain, label, tone: TONE.rain }
    if (base.startsWith('light')) return { Icon: CloudDrizzle, label, tone: TONE.rain }
    return { Icon: CloudRain, label, tone: TONE.rain }
  }
  if (base === 'fog') return { Icon: CloudFog, label, tone: TONE.fog }
  if (base === 'cloudy') return { Icon: Cloudy, label, tone: TONE.cloud }
  if (base === 'partlycloudy')
    return { Icon: isDay ? CloudSun : CloudMoon, label, tone: TONE.cloud }
  if (base === 'fair') return { Icon: isDay ? CloudSun : CloudMoon, label, tone: isDay ? TONE.sun : TONE.moon }
  if (base === 'clearsky') return { Icon: isDay ? Sun : Moon, label, tone: isDay ? TONE.sun : TONE.moon }

  return { Icon: Cloud, label, tone: TONE.cloud }
}
