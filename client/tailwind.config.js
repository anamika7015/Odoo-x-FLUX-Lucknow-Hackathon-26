/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          midnight: '#111B35',
          navy: '#182641',
          teal: '#176B68',
          'teal-light': '#3D8981',
          'teal-dark': '#135855',
          gold: '#C5A46D',
          'gold-light': '#D4BA88',
          platinum: '#EAEFF4',
          pearl: '#F7F8FA',
          slate: '#26344B',
          muted: '#718096',
        },
        app: {
          background: 'var(--color-background)',
          surface: 'var(--color-surface)',
          'surface-elevated': 'var(--color-surface-elevated)',
          secondary: 'var(--color-surface-secondary)',
          text: 'var(--color-text)',
          'text-muted': 'var(--color-text-muted)',
          accent: 'var(--color-accent)',
          'accent-hover': 'var(--color-accent-hover)',
          gold: 'var(--color-gold)',
          border: 'var(--color-border)',
          'border-subtle': 'var(--color-border-subtle)',
          ring: 'var(--color-ring)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Geist Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(17, 27, 53, 0.05), 0 1px 2px -1px rgba(17, 27, 53, 0.05)',
        card: '0 4px 6px -1px rgba(17, 27, 53, 0.06), 0 2px 4px -2px rgba(17, 27, 53, 0.04)',
        elevated: '0 10px 15px -3px rgba(17, 27, 53, 0.08), 0 4px 6px -4px rgba(17, 27, 53, 0.04)',
        modal: '0 25px 50px -12px rgba(17, 27, 53, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

