/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', 'Tahoma', 'system-ui', 'sans-serif'],
      },
      colors: {
        app: token('app'),
        card: token('card'),
        soft: token('soft'),
        ink: token('ink'),
        muted: token('muted'),
        line: token('line'),
        primary: {
          DEFAULT: token('p-600'),
          hover: token('p-700'),
          deep: token('p-800'),
          soft: token('p-soft'),
          ink: token('p-ink'),
        },
        success: { bg: token('success-bg'), fg: token('success-fg') },
        warn: { bg: token('warn-bg'), fg: token('warn-fg') },
        danger: { bg: token('danger-bg'), fg: token('danger-fg'), DEFAULT: token('danger-solid') },
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px rgb(15 23 42 / 0.05)',
        nav: '0 -4px 20px rgb(15 23 42 / 0.08)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
