/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        tajawal: ['Tajawal', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          green: '#1D9E75',
          'green-dark': '#15835F',
          'green-light': '#34D399',
          blue: '#1D6FA4',
          'blue-dark': '#155A87',
          'blue-light': '#38BDF8',
        },
        dark: {
          DEFAULT: '#071116',
          card: '#0E1B22',
          elevated: '#122734',
          3: '#1a2e45',
        },
        status: {
          open: '#22C55E',
          busy: '#F59E0B',
          emergency: '#EF4444',
          closed: '#6B7280',
        },
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'blob': 'blob 8s ease-in-out infinite',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-in': 'fadeIn 0.5s ease forwards',
        'glow': 'glow 2s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
        'particle': 'particle 6s ease-in-out infinite',
        'scan': 'scan 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotateY(-5deg)' },
          '50%': { transform: 'translateY(-20px) rotateY(-3deg)' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(30px,-30px) scale(1.05)' },
          '66%': { transform: 'translate(-20px,20px) scale(0.95)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(40px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(29,158,117,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(29,158,117,0.6)' },
        },
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
        },
        particle: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '20%': { opacity: '0.6' },
          '80%': { opacity: '0.4' },
          '100%': { opacity: '0', transform: 'translateY(-60px) rotate(20deg)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      backdropBlur: { xs: '2px' },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(ellipse 80% 50% at 20% 40%, rgba(29,111,164,0.25) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 60%, rgba(29,158,117,0.20) 0%, transparent 60%)',
        'grid-pattern': 'linear-gradient(rgba(29,111,164,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(29,111,164,0.07) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};
