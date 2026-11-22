/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      xs: '420px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        ink: {
          950: '#06090F', // Obsidian canvas
          900: 'rgba(15, 23, 36, 0.72)', // Frosted glass card surface
          850: 'rgba(21, 29, 44, 0.65)', // Inset / subcard surface
          800: '#161e2e', // Raised surface / input
          750: '#1d273a',
          700: '#253248', // Quiet border
          600: '#344460', // Subtle hover border
          500: '#64748b', // Muted text and icons
          400: '#94a3b8', // Secondary text
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f8fafc', // Primary crisp text
        },
        accent: {
          DEFAULT: '#38bdf8',
          hover: '#0ea5e9',
          muted: '#0284c7',
        },
        aqi: {
          good: '#4cc38a',
          moderate: '#eab308',
          sensitive: '#f97316',
          unhealthy: '#e5484d',
          veryUnhealthy: '#a855f7',
          hazardous: '#991b1b',
        },
        vayu: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        '2xl': '16px',
        'xl': '12px',
        'lg': '10px',
        'md': '8px',
        'sm': '6px',
      },
      boxShadow: {
        'subtle': '0 1px 2px rgba(0, 0, 0, 0.3)',
        'panel': '0 8px 32px rgba(0, 0, 0, 0.45)',
      }
    },
  },
  plugins: [],
}
