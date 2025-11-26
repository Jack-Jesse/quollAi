/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['Courier New', 'Courier', 'monospace'],
        system: ['Times New Roman', 'Times', 'serif'],
      },
      colors: {
        'web-safe-cyan': '#00FFFF',
        'web-safe-magenta': '#FF00FF',
        'web-safe-lime': '#00FF00',
        'terminal-green': '#33FF33',
      },
    },
  },
  plugins: [],
}
