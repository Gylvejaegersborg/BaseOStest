import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0c10',
        panel: '#11141b',
        'panel-2': '#161b24',
        line: '#1f2733',
        'line-2': '#2a3442',
        text: '#c8d2dc',
        dim: '#6b7785',
        accent: '#36e0c8',
        amber: '#f0a020',
        magenta: '#e0408a',
        'neon-green': '#46d369',
        danger: '#ff5566',
        // Claude-themed palette, scoped to the Sudoku app (warm cream + terracotta).
        'claude-bg': '#F0EEE6',
        'claude-surface': '#FAF9F5',
        'claude-ink': '#1F1E1C',
        'claude-ink-2': '#6B6862',
        'claude-clay': '#CC785C',
        'claude-clay-soft': '#E8C4B8',
        'claude-line': '#E3DFD3',
        'claude-sage': '#7A9471',
        'claude-sky': '#6B8AA6',
        // ISΛRK beat-store brand palette (dark, electric — distinct from the OS terminal theme).
        'isark-bg': '#0B0B0E',
        'isark-surface': '#141419',
        'isark-elevated': '#1C1C24',
        'isark-line': '#2A2A33',
        'isark-text': '#F4F3EE',
        'isark-dim': '#8C8C97',
        'isark-accent': '#A78BFA',
        'isark-accent-2': '#F4A8E8',
        'isark-mint': '#A8E6D0',
        'isark-lavender': '#B6A8FF',
        'isark-coral': '#FFB48A',
        // Elevation surface ramp (design tokens, Phase 0) — real luminance steps for the
        // new depth system, additive alongside bg/panel/panel-2. surface-0 mirrors `bg`.
        'surface-0': '#0a0c10',
        'surface-1': '#12151c',
        'surface-2': '#191d26',
        'surface-3': '#21262f',
        'surface-4': '#282e38',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        display: ['"Share Tech Mono"', 'monospace'],
        claude: ['"Lora"', 'Georgia', 'ui-serif', 'serif'],
        // Warm humanist sans for Notes/long-form content (design tokens, Phase 0).
        // System stack placeholder until a specific typeface is sourced.
        read: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // Radius scale (design tokens, Phase 0) — namespaced so existing `rounded-sm/md/lg`
      // usage across Lab's modules is untouched; new OS components consume these directly.
      borderRadius: {
        control: '4px',
        panel: '8px',
        docked: '14px',
      },
      // Type scale addition (design tokens, Phase 0) — only the one genuinely new step;
      // existing base/lg/xl/2xl sizes are left as-is to avoid rippling through the app.
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.02em' }],
      },
      // Motion tokens (design tokens, Phase 0) — namespaced durations/easings for the
      // navigation-model and shell motion work in later phases.
      transitionDuration: {
        instant: '80ms',
        fast: '150ms',
        settle: '220ms',
        deep: '280ms',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        forward: 'cubic-bezier(0.34, 1.2, 0.64, 1)',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(54,224,200,0.25), 0 0 14px -2px rgba(54,224,200,0.35)',
        'glow-magenta': '0 0 0 1px rgba(224,64,138,0.25), 0 0 14px -2px rgba(224,64,138,0.35)',
        // Elevation shadows (design tokens, Phase 0) — pairs with surface-3/surface-4 for
        // summoned and contained panels.
        'elevation-3': '0 8px 24px -8px rgba(0,0,0,0.45)',
        'elevation-4': '0 16px 40px -12px rgba(0,0,0,0.55)',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: '0.25' },
          '50%': { opacity: '1' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'module-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.12)' },
        },
        'wave-pulse': {
          '0%, 100%': { transform: 'scaleY(0.85)', filter: 'blur(0px)' },
          '50%': { transform: 'scaleY(1.15)', filter: 'blur(2px)' },
        },
        'dust-drift': {
          '0%': { transform: 'translate(0, 0)' },
          '100%': { transform: 'translate(-120px, -240px)' },
        },
        'dust-drift-reverse': {
          '0%': { transform: 'translate(0, 0)' },
          '100%': { transform: 'translate(140px, 200px)' },
        },
        'grid-flow': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 128px' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.06' },
          '50%': { opacity: '0.22' },
        },
        'breathe-strong': {
          '0%, 100%': { opacity: '0.18' },
          '50%': { opacity: '0.42' },
        },
        glow: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        'glow-soft': {
          '0%, 100%': { opacity: '0.25' },
          '50%': { opacity: '0.6' },
        },
        // Ambient agent-activity signal (design tokens, Phase 0) — distinct from the
        // interaction-motion durations above; this is atmosphere, not feedback.
        'ambient-pulse': {
          '0%, 100%': { opacity: '0.15' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        twinkle: 'twinkle 3s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
        'fade-in': 'fade-in 0.18s ease-out',
        scan: 'scan 6s linear infinite',
        'module-pulse': 'module-pulse 3.6s ease-in-out infinite',
        'wave-pulse': 'wave-pulse 1.4s ease-in-out infinite alternate',
        'dust-drift': 'dust-drift 30s linear infinite',
        'dust-drift-reverse': 'dust-drift-reverse 40s linear infinite',
        'grid-flow': 'grid-flow 8s linear infinite',
        'gradient-pan': 'gradient-pan 14s ease-in-out infinite',
        'float-slow': 'float-slow 6s ease-in-out infinite',
        breathe: 'breathe 5.2s ease-in-out infinite',
        'breathe-strong': 'breathe-strong 3.4s ease-in-out infinite',
        glow: 'glow 3.2s ease-in-out infinite',
        'glow-soft': 'glow-soft 6s ease-in-out infinite',
        'ambient-pulse': 'ambient-pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
