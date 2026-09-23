/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** 'true' — использовать локальные моки вместо реального API */
  readonly VITE_USE_MOCKS?: string
  /** Базовый URL бэкенда, например http://127.0.0.1:8000/api */
  readonly VITE_API_URL?: string
  /** Ключ TomTom: карта (Map Display API), Search API, Routing API */
  readonly VITE_TOMTOM_KEY?: string
  /** Карта: osm (по умолчанию) | tomtom | tomtom-orbis */
  readonly VITE_MAP_PROVIDER?: string
  /** Поиск адреса: osm (по умолчанию) | tomtom */
  readonly VITE_SEARCH_PROVIDER?: string
  /** Пешие маршруты: osm (Valhalla, по умолчанию) | tomtom */
  readonly VITE_ROUTING_PROVIDER?: string
  /** Куда dev-сервер проксирует /api (по умолчанию — бэкенд на Render) */
  readonly VITE_DEV_API_PROXY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
