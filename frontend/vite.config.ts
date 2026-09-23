import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'Готов к толчку',
        short_name: 'Готов',
        description:
          'Подготовка жителей Алматы к землетрясению: риск дома, ближайший пункт сбора, семейный круг и чек-лист.',
        lang: 'ru',
        dir: 'ltr',
        theme_color: '#0B1437',
        background_color: '#F7F8FC',
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
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2}'],
        navigateFallbackDenylist: [/^\/admin/, /^\/accounts/, /^\/api/],
        runtimeCaching: [
          {
            // Тайлы TomTom Maps — кэшируем, чтобы карта открывалась быстрее
            // и частично работала офлайн.
            urlPattern: ({ url }) => url.host.includes('api.tomtom.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'tomtom-basemap-tiles',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
