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
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        display: ['"Share Tech Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(54,224,200,0.25), 0 0 14px -2px rgba(54,224,200,0.35)',
        'glow-magenta': '0 0 0 1px rgba(224,64,138,0.25), 0 0 14px -2px rgba(224,64,138,0.35)',
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
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      animation: {
        twinkle: 'twinkle 3s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
        'fade-in': 'fade-in 0.18s ease-out',
        scan: 'scan 6s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
