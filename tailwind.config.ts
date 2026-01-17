import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Banking dashboard theme - professional dark theme (matching Bye.bank)
        background: '#0a0e1a', // Very dark background (almost black)
        foreground: '#ffffff',
        primary: {
          DEFAULT: '#60a5fa', // Light blue accent (muted, professional)
          dark: '#3b82f6',
          light: '#93c5fd',
          glow: '#60a5fa',
        },
        accent: {
          DEFAULT: '#60a5fa',
          dark: '#3b82f6',
        },
        card: {
          DEFAULT: '#151821', // Darker card background (more subtle)
          hover: '#1a1f2e', // Subtle hover
          elevated: '#0f1217', // Even darker for elevated cards
        },
        border: '#1f2937', // Very subtle borders (almost invisible)
        muted: '#9ca3af', // More muted text (lighter grey)
        success: '#10b981', // Green for success
        warning: '#f59e0b', // Amber for warnings
        error: '#ef4444', // Red for errors
        // Additional card accent colors (like the bills section)
        purple: {
          light: '#a78bfa', // Light purple for cards
          DEFAULT: '#8b5cf6',
        },
        teal: {
          light: '#5eead4', // Light teal for cards
          DEFAULT: '#14b8a6',
        },
        gray: {
          light: '#9ca3af', // Light grey for cards
          DEFAULT: '#6b7280',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display': ['4.5rem', { lineHeight: '1.1', fontWeight: '800' }],
        'display-sm': ['3.5rem', { lineHeight: '1.1', fontWeight: '800' }],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(251, 191, 36, 0.3)',
        'glow-sm': '0 0 10px rgba(251, 191, 36, 0.2)',
      },
    },
  },
  plugins: [],
}
export default config

