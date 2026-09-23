import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Куда уходят запросы /api при `npm run dev` и `npm run preview`.
  // По умолчанию — бэкенд команды на Render; локальный Django: http://127.0.0.1:8000
  const apiProxy = {
    '/api': {
      target: env.VITE_DEV_API_PROXY || 'https://hackathon-base.onrender.com',
      changeOrigin: true,
      secure: true,
    },
  }

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'robots.txt'],
        manifest: {
          name: 'Готов к толчку',
          short_name: 'Готов',
          description:
            'Подготовка жителей Алматы к землетрясению: риск дома, пеший маршрут до официального пункта приёма, семейный круг, чек-лист и учебная тревога.',
          lang: 'ru',
          dir: 'ltr',
          theme_color: '#F4F3EE',
          background_color: '#F4F3EE',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            { src: 'pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
            { src: 'pwa-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,woff2}'],
          // Лишние подмножества шрифтов не нужны офлайн (кириллица и латиница остаются)
          globIgnores: ['**/*-greek-*', '**/*-greek-ext-*', '**/*-vietnamese-*'],
          navigateFallbackDenylist: [/^\/admin/, /^\/accounts/, /^\/api/],
          runtimeCaching: [
            {
              // Карта OpenStreetMap (OpenFreeMap): стиль, векторные тайлы, шрифты подписей, спрайты —
              // просмотренные районы открываются и без сети.
              urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org',
              handler: 'CacheFirst',
              options: {
                cacheName: 'osm-map',
                expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 14 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Карта TomTom (если включена): тайлы, стиль, шрифты, спрайты.
              // Поиск (/search) и маршруты (/routing) НЕ кэшируем — иначе устаревшие ответы.
              urlPattern: ({ url }) =>
                url.hostname.endsWith('api.tomtom.com') &&
                (url.pathname.startsWith('/map/') ||
                  url.pathname.startsWith('/style/') ||
                  url.pathname.startsWith('/maps/orbis/')),
              handler: 'CacheFirst',
              options: {
                cacheName: 'tomtom-map',
                expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 14 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    server: { proxy: apiProxy },
    preview: { proxy: apiProxy },
    // Воркер MapLibre 6 — ES-модуль (создаётся как module worker)
    worker: { format: 'es' as const },
    // В dev MapLibre отдаётся как есть (без пребандла esbuild): основной поток
    // и воркер должны использовать одни и те же модули dist/, как в продакшене.
    optimizeDeps: { exclude: ['maplibre-gl'] },
    build: {
      // Самый большой чанк — ленивый MapLibre (только экраны с картой)
      chunkSizeWarningLimit: 1200,
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
