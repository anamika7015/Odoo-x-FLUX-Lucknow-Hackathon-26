/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          obsidian: '#17172E',
          'obsidian-dark': '#10101D',
          'obsidian-surface': '#19192C',
          indigo: '#5145CD',
          'indigo-deep': '#4035AF',
          'indigo-bright': '#7565E8',
          violet: '#9065EF',
          'violet-light': '#B8A8F8',
          lavender: '#DCD5FF',
          'soft-purple': '#B8A8F8',
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
          violet: 'var(--color-violet)',
          border: 'var(--color-border)',
          'border-subtle': 'var(--color-border-subtle)',
          ring: 'var(--color-ring)',
          'btn-primary': 'var(--color-primary-button)',
          'btn-primary-hover': 'var(--color-primary-button-hover)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'Geist Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(23, 23, 46, 0.04), 0 1px 2px -1px rgba(23, 23, 46, 0.04)',
        card: '0 4px 12px -2px rgba(23, 23, 46, 0.05), 0 2px 6px -2px rgba(23, 23, 46, 0.03)',
        elevated: '0 12px 24px -4px rgba(23, 23, 46, 0.08), 0 4px 10px -4px rgba(23, 23, 46, 0.04)',
        modal: '0 25px 60px -15px rgba(16, 16, 29, 0.5), 0 0 0 1px var(--color-border)',
        glow: '0 0 20px -2px rgba(144, 101, 239, 0.3)',
        'btn-primary': '0 2px 10px -1px rgba(81, 69, 205, 0.35)',
        'btn-primary-dark': '0 2px 14px -1px rgba(117, 101, 232, 0.45)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-subtle': 'pulseSubtle 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};
