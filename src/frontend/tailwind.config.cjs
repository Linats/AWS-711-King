/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./sites/**/*.{html,ts,tsx}', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: { extend: { colors: { brand: '#1677ff' }, borderRadius: { card: '16px' } } },
  plugins: []
};
