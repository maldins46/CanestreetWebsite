/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette — urban blacktop + accent orange
        court: {
          black:   '#0a0a0a',
          dark:    '#111111',
          surface: '#1a1a1a',
          border:  '#2a2a2a',
          muted:   '#444444',
          gray:    '#888888',
          light:   '#cccccc',
          white:   '#f5f5f0',
        },
        brand: {
          orange:  '#f26522',
          light:   '#ff8040',
          dim:     '#b34d18',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        hero:    ['var(--font-hero)', 'sans-serif'],
        body:    ['var(--font-body)',    'sans-serif'],
        mono:    ['var(--font-mono)',    'monospace'],
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease forwards',
        'slide-up':   'slideUp 0.5s ease forwards',
        'slide-down': 'slideDown 0.3s ease forwards',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideDown: { from: { opacity: 0, transform: 'translateY(-8px)' },  to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
