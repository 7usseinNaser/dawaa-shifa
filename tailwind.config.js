/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'brand-green': '#1D9E75',
        'brand-green-light': '#2BB88A',
        'brand-green-dark': '#157A57',
        'brand-blue': '#1D6FA4',
        'brand-blue-light': '#3A8FC8',
        'brand-blue-dark': '#15547E',
        'brand-accent': '#F5A623',
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        tajawal: ['Tajawal', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
