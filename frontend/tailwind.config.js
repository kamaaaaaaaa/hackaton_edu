/** @type {import('tailwindcss').Config} */
// Дизайн-токены «Готов к толчку» · концепция «сейсмограф».
// Палитра задана целиком (theme.colors, не extend) — чтобы в интерфейс
// не просачивались случайные цвета из стандартной палитры Tailwind.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      black: '#000000',

      paper: '#F4F3EE', // тёплый «бумажный» фон
      surface: '#FFFFFF', // поверхности
      ink: '#111113', // основной текст
      muted: '#6B6B70', // вторичный текст (AA на paper и white)
      faint: '#9A9AA0', // только декоративное / крупное
      line: 'rgba(17,17,19,0.09)', // 1px линии

      // Главный акцент — электрический фиолетовый (текст на белом: 6.1:1)
      accent: {
        DEFAULT: '#5B3DF5',
        hover: '#4A2EE0',
        press: '#3D24C2',
        soft: '#EFECFF',
      },
      // Кислотный лайм — ТОЛЬКО заливкой с чёрным текстом
      acid: {
        DEFAULT: '#D4FF3A',
        deep: '#C2EE1F',
      },
      // Тревога / высокий риск. Для мелкого текста — signal-ink (5.6:1).
      signal: {
        DEFAULT: '#FF3B1F',
        ink: '#C8260E',
        soft: '#FFECE8',
      },
      // Средний риск. Заливка + ink-текст; для текста — warn-ink.
      warn: {
        DEFAULT: '#FFB020',
        ink: '#9A5B00',
        soft: '#FFF4DE',
      },
      // Низкий риск / «в безопасности». Для текста — safe-ink.
      safe: {
        DEFAULT: '#1FCB8B',
        ink: '#0B7A52',
        soft: '#E2F8EF',
      },
    },
    extend: {
      fontFamily: {
        display: ['"Unbounded Variable"', 'Unbounded', 'system-ui', 'sans-serif'],
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        hero: ['clamp(2.15rem, 7.2vw, 5.75rem)', { lineHeight: '1.02', letterSpacing: '-0.035em' }],
        mega: ['clamp(3.25rem, 11vw, 8.5rem)', { lineHeight: '0.9', letterSpacing: '-0.04em' }],
        display: ['clamp(1.6rem, 3.6vw, 2.75rem)', { lineHeight: '1.08', letterSpacing: '-0.025em' }],
        cap: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.14em' }],
      },
      borderRadius: {
        card: '1.125rem',
        sheet: '1.5rem',
      },
      boxShadow: {
        card: '0 1px 0 rgba(17,17,19,0.03), 0 1px 3px rgba(17,17,19,0.04)',
        lift: '0 18px 40px -18px rgba(17,17,19,0.28)',
        glass: 'inset 0 1px 0 rgba(255,255,255,0.75), 0 18px 44px -20px rgba(17,17,19,0.35)',
        accent: '0 10px 28px -10px rgba(91,61,245,0.55)',
      },
      keyframes: {
        ring: {
          '0%': { transform: 'scale(0.35)', opacity: '0.6' },
          '100%': { transform: 'scale(2.8)', opacity: '0' },
        },
        'marker-in': {
          '0%': { transform: 'translateY(6px) scale(0.5)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translate3d(0,0,0)' },
          '10%': { transform: 'translate3d(-7px, 2px, 0) rotate(-0.4deg)' },
          '20%': { transform: 'translate3d(6px, -3px, 0) rotate(0.4deg)' },
          '30%': { transform: 'translate3d(-5px, 3px, 0)' },
          '40%': { transform: 'translate3d(5px, -2px, 0) rotate(-0.3deg)' },
          '50%': { transform: 'translate3d(-4px, 2px, 0)' },
          '60%': { transform: 'translate3d(3px, -1px, 0)' },
          '70%': { transform: 'translate3d(-2px, 1px, 0)' },
          '80%': { transform: 'translate3d(2px, 0, 0)' },
          '90%': { transform: 'translate3d(-1px, 0, 0)' },
        },
        'signal-pulse': {
          '0%, 100%': { opacity: '0' },
          '50%': { opacity: '0.55' },
        },
        jitter: {
          '0%, 88%, 100%': { transform: 'translateY(0)' },
          '91%': { transform: 'translateY(-1.5px)' },
          '94%': { transform: 'translateY(1px)' },
          '97%': { transform: 'translateY(-0.5px)' },
        },
        buzz: {
          '0%, 100%': { transform: 'translateX(0) rotate(0)' },
          '25%': { transform: 'translateX(-1px) rotate(-4deg)' },
          '50%': { transform: 'translateX(1px) rotate(3deg)' },
          '75%': { transform: 'translateX(-0.5px) rotate(-2deg)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.25' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        ring: 'ring 2.4s cubic-bezier(0.2, 0.6, 0.35, 1) infinite',
        'marker-in': 'marker-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        shake: 'shake 0.7s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
        'signal-pulse': 'signal-pulse 1.2s ease-in-out infinite',
        jitter: 'jitter 2.6s ease-in-out infinite',
        buzz: 'buzz 0.35s linear',
        blink: 'blink 1.4s ease-in-out infinite',
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
