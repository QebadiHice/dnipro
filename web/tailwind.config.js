/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        // "River" palette — deep water teal/navy as the base, warm wheat/copper
        // as the accent. References the Dnipro river at dusk rather than a
        // generic SaaS blue-on-black.
        dnipro: {
          50:  '#eef9f7',
          100: '#d3f0ea',
          200: '#a6e1d6',
          300: '#6cc9bc',
          400: '#3aab9e',
          500: '#258f85',
          600: '#1c7269',
          700: '#1a5b56',
          800: '#194946',
          900: '#163d3b',
          950: '#0a1f1f',
        },
        // Warm accent — wheat field / sunset copper
        wheat: {
          50:  '#fdf8ec',
          100: '#faecc8',
          200: '#f4d68d',
          300: '#edbd56',
          400: '#e6a431',
          500: '#d6871f',
          600: '#b3681a',
          700: '#8f4f19',
          800: '#763f19',
          900: '#643418',
        },
        river: {
          ink:   '#06120f',
          deep:  '#0b1f1c',
          surface: '#0f2a26',
          mist:  '#9fb8b3',
        },
        green: {
          400: '#4ade80',
          500: '#22c55e',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        serif: ['"Fraunces"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        'fade-in': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'river-flow': {
          '0%':   { strokeDashoffset: '0' },
          '100%': { strokeDashoffset: '-200' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%':      { transform: 'translate(12px, -8px)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'river-flow': 'river-flow 12s linear infinite',
        drift: 'drift 8s ease-in-out infinite',
        'drift-slow': 'drift 14s ease-in-out infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern':
          'linear-gradient(rgba(52,97,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(52,97,255,0.05) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '40px 40px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
