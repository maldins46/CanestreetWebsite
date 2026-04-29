/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette — urban blacktop + accent orange
        court: {
          black:   'rgb(var(--color-court-black)   / <alpha-value>)',
          dark:    'rgb(var(--color-court-dark)    / <alpha-value>)',
          surface: 'rgb(var(--color-court-surface) / <alpha-value>)',
          border:  'rgb(var(--color-court-border)  / <alpha-value>)',
          muted:   'rgb(var(--color-court-muted)   / <alpha-value>)',
          gray:    'rgb(var(--color-court-gray)    / <alpha-value>)',
          light:   'rgb(var(--color-court-light)   / <alpha-value>)',
          white:   'rgb(var(--color-court-white)   / <alpha-value>)',
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
  plugins: [require('@tailwindcss/typography')],
}
