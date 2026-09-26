import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Base neutral scale (design tokens, revised) — shifted off the original
        // blue-leaning grays toward true neutral-warm per direct feedback; the
        // "general blue-ish tint" was the base itself, not just a weak context
        // wash fighting it. Same lightness steps as before, hue removed. Nudged
        // a touch cool again afterward — pure neutral-warm read as flat/dusty;
        // this is a few points of blue back in, not a reversal of that decision.
        bg: '#0a0b0d',
        panel: '#141518',
        'panel-2': '#1a1b1d',
        line: '#26272a',
        'line-2': '#313337',
        text: '#c8d2dc',
        dim: '#6b7785',
        // Accent (revised) — moved off the teal/cyan that had become the de
        // facto color of every button, border and highlight in the app,
        // toward a desaturated rose (purple/pink/red family) per direct
        // feedback. Per-agent/per-section/category colors elsewhere are
        // untouched — those are deliberate differentiation, not this fatigue.
        accent: '#c77591',
        // Accent tonal ramp — the follow-up fix: a flat single accent tone
        // used everywhere still read as monotonous even off teal. Same hue
        // family, varying only lightness/saturation, so hover/active states,
        // glows and washes can use real tonal depth instead of one flat
        // color at different opacities. accent-3 === accent above.
        'accent-1': '#e0b8c5',
        'accent-2': '#d496ad',
        'accent-3': '#c77591',
        'accent-4': '#ba4568',
        'accent-5': '#91304a',
        // Purple and red get the same tonal-ramp treatment as the accent,
        // so the ambient/decorative layer (nebula, washes) can lean on them
        // more without either being a single flat tone.
        'violet-1': '#c4b5e3',
        'violet-2': '#ac92d9',
        'violet-3': '#946ecf',
        'violet-4': '#773dc2',
        'violet-5': '#5d2c96',
        'crimson-1': '#e8b0b5',
        'crimson-2': '#e3878f',
        'crimson-3': '#e05c67',
        'crimson-4': '#db2433',
        'crimson-5': '#aa1824',

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
        // Same warm-neutral revision as the base scale above, then the same small
        // cool-again nudge.
        'surface-0': '#0a0b0d',
        'surface-1': '#17181a',
        'surface-2': '#1e1f22',
        'surface-3': '#25262a',
        'surface-4': '#2c2d32',
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
        // Two tones from the accent ramp (a light ring, a deeper blur)
        // instead of one flat hue at two opacities — real tonal depth.
        glow: '0 0 0 1px rgba(212,150,173,0.35), 0 0 18px -2px rgba(145,48,74,0.5)',
        'glow-magenta': '0 0 0 1px rgba(224,64,138,0.3), 0 0 18px -2px rgba(224,64,138,0.42)',
        // Elevation shadows (design tokens, Phase 0) — pairs with surface-3/surface-4 for
        // summoned and contained panels.
        'elevation-3': '0 8px 26px -8px rgba(0,0,0,0.5)',
        'elevation-4': '0 18px 44px -12px rgba(0,0,0,0.6)',
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
        // Stronger sibling for small controls (Glow): a button-sized wash at
        // ambient-pulse's opacity is barely visible.
        'glow-pulse': {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '1' },
        },
        // Section cross-fade (navigation model, Phase 3) — the "you moved
        // to a different room" orientation cue on top-level route changes.
        'cross-fade': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        // "Going deeper within a section" — a slight forward settle rather
        // than a lateral move, per the navigation model's depth language.
        'settle-forward': {
          from: { opacity: '0', transform: 'scale(0.98)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        // Mobile's dock-zone mechanism (Phase 6, responsive pass) — the
        // same summoned-panel role as desktop's side pane, entering from
        // the bottom instead since there's no edge to drag to on a narrow
        // screen.
        'sheet-up': {
          from: { opacity: '0', transform: 'translateY(100%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
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
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
        'cross-fade': 'cross-fade 220ms cubic-bezier(0.2, 0, 0, 1)',
        'settle-forward': 'settle-forward 280ms cubic-bezier(0.34, 1.2, 0.64, 1)',
        'sheet-up': 'sheet-up 220ms cubic-bezier(0.2, 0, 0, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config
