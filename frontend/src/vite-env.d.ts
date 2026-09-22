/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** 'true' — использовать локальные моки вместо реального API */
  readonly VITE_USE_MOCKS?: string
  /** Базовый URL бэкенда, например http://127.0.0.1:8000/api */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
