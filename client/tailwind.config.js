/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors - Official Neighborhood National palette
        'brand': {
          'black': '#020c05',             // Official brand black (dark green-black)
          'white': '#ffffff',             // Official brand white
          'neon-green': '#77dd3c',        // Official neon green accent
          'dark-green': '#01422c',        // Official primary dark green
          'muted-green': '#255946',       // Official muted green
          'highlight-green': '#416d5c',   // Official highlight green
        },

        // Neutral Colors - Official Neighborhood National palette
        'neutral': {
          50: '#f5f7f8',
          100: '#eaeaea',
          200: '#d5d6d5',
          300: '#bfc1c0',
          400: '#aaacab',
          500: '#959896',
          600: '#808381',
          700: '#6a6e6c',
          800: '#555a57',
          900: '#404542',
          950: '#2f3331'
        },

        // System Colors - Official Neighborhood National palette
        'success': {
          DEFAULT: '#256a33',             // Official success green
          50: '#f0faf2',                  // Official success lightest
          200: '#a3d9b1',                 // Official success light border
          light: '#f0faf2',               // Official success light (alias)
          500: '#2d7a3e',                 // Official success medium
          600: '#256a33',                 // Official success standard (same as DEFAULT)
          700: '#1d5527',                 // Official success dark
        },
        'error': {
          DEFAULT: '#dc2626',             // Official error red (updated to brighter red)
          50: '#fef2f2',                  // Official error lightest
          light: '#ffeeeb',               // Official error light
          600: '#dc2626',                 // Official error standard
          700: '#b91c1c',                 // Official error dark
        },

        // Keep standard warning/info for UI flexibility
        'warning': {
          DEFAULT: '#f59e0b',
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309'
        },
        'info': {
          DEFAULT: '#3b82f6',
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8'
        },

        // Extended Gray Scale (keep for Tailwind compatibility)
        'gray': {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827'
        },

        // Golf-specific Colors
        'golf': {
          'fairway': '#2d7a4f',
          'rough': '#5a7c65',
          'sand': '#daa520',
          'water': '#1e40af',
          'flag': '#dc2626'
        }
      },

      // Typography
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace']
      },
      fontSize: {
        // Display sizes
        'display-xl': ['4.5rem', { lineHeight: '1.1', fontWeight: '700' }],
        'display-lg': ['3.75rem', { lineHeight: '1.1', fontWeight: '700' }],
        'display-md': ['3rem', { lineHeight: '1.2', fontWeight: '700' }],

        // Heading sizes
        'heading-xl': ['2.25rem', { lineHeight: '1.2', fontWeight: '700' }],
        'heading-lg': ['1.875rem', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-md': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-sm': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'heading-xs': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
      },

      // Spacing (extending default)
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem'
      },

      // Shadows
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'green': '0 4px 14px 0 rgba(26, 95, 60, 0.15)',
        'neon': '0 0 20px 0 rgba(119, 221, 60, 0.3)',
        'focus': '0 0 0 3px rgba(119, 221, 60, 0.3)',
        'inner-sm': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      },

      // Border Radius
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem'
      },

      // Animation
      animation: {
        'shimmer': 'shimmer 2s infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-subtle': 'bounceSubtle 0.5s ease-out',
        'badge-pop': 'badgePop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' }
        },
        badgePop: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        }
      },

      // Transitions
      transitionDuration: {
        '400': '400ms',
        '600': '600ms'
      },
      transitionTimingFunction: {
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} 