/** @type {import('tailwindcss').Config} */
// Scoped to the WorkDrive module only. Preflight is disabled so Tailwind's
// global reset never touches the existing NeuzenAI HRMS styles, and every
// utility is emitted under `.wd-root` so classes can never leak.
export default {
  content: ['./src/workdrive/**/*.{js,jsx}'],
  important: '.wd-root',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        wd: {
          blue: '#ff4500',
          navy: '#0b0b0f',
          sky: '#fff1ea',
          bg: '#fffaf6',
          line: '#e5e7eb',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(31,56,100,0.08), 0 1px 2px rgba(31,56,100,0.06)',
        pop: '0 8px 28px rgba(31,56,100,0.16)',
      },
    },
  },
  plugins: [],
};
