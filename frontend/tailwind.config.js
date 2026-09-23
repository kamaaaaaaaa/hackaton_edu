/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Основной бренд — глубокий navy. Один яркий акцент на приложение.
        navy: {
          50: '#EEF1FA',
          100: '#D7DEF2',
          200: '#B0BEE6',
          300: '#8093D2',
          400: '#4E68BE',
          500: '#2E49A2', // интерактив (hover/active светлее фона)
          600: '#1E3576',
          700: '#16265C', // основной бренд
          800: '#101B45',
          900: '#0B1437', // самый глубокий (шапка тревоги-контраст, тема)
        },
        // «Искра» — чуть более яркий синий только для микро-акцентов
        spark: '#3B6BFF',
        // Семантика статусов/риска
        risk: {
          low: '#16A34A', // зелёный — низкий риск / «в безопасности»
          mid: '#D97706', // янтарный — средний риск
          high: '#DC2626', // красный — высокий риск / тревога
        },
        // Нейтральная гамма
        ink: '#0E1526', // основной текст
        subink: '#5A6478', // приглушённый текст
        line: '#E6E9F2', // тонкие линии/границы
        mist: '#F4F6FB', // очень светлый серо-синий фон
        cloud: '#FAFBFE', // почти белый фон-подложка
      },
      fontFamily: {
        display: ['Manrope', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['clamp(2.6rem, 7vw, 4.75rem)', { lineHeight: '1.02', letterSpacing: '-0.03em' }],
        'display-lg': ['clamp(2rem, 5vw, 3.25rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        xl2: '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(11,20,55,0.04), 0 8px 24px -12px rgba(11,20,55,0.12)',
        lift: '0 2px 4px rgba(11,20,55,0.05), 0 18px 40px -16px rgba(11,20,55,0.22)',
        glass: '0 1px 0 rgba(255,255,255,0.6) inset, 0 10px 30px -14px rgba(11,20,55,0.22)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(to right, rgba(22,38,92,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(22,38,92,0.05) 1px, transparent 1px)',
        'navy-sheen':
          'radial-gradient(120% 120% at 0% 0%, #1E3576 0%, #16265C 42%, #0B1437 100%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'sheen': {
          '0%': { backgroundPosition: '-160% 0' },
          '100%': { backgroundPosition: '260% 0' },
        },
        'alert-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.72' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.5s ease both',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        'sheen': 'sheen 2.4s linear infinite',
        'alert-pulse': 'alert-pulse 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
