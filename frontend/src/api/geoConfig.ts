// Какие геосервисы использует приложение. По умолчанию — открытый стек
// OpenStreetMap: работает без ключей (жюри запускает «из коробки»), а тайлы,
// поиск и пешие маршруты берутся из одних данных — маршрут ложится ровно по
// тротуарам и дворам. TomTom включается переменными окружения.
//
//   VITE_MAP_PROVIDER     osm (OpenFreeMap) | tomtom | tomtom-orbis
//   VITE_SEARCH_PROVIDER  osm (Photon → Nominatim) | tomtom (→ OSM как запасной)
//   VITE_ROUTING_PROVIDER osm (Valhalla, FOSSGIS) | tomtom
import { TOMTOM_KEY } from './tomtom'

type MapProvider = 'osm' | 'tomtom' | 'tomtom-orbis'
type Provider = 'osm' | 'tomtom'

const env = import.meta.env

export const MAP_PROVIDER: MapProvider =
  env.VITE_MAP_PROVIDER === 'tomtom' || env.VITE_MAP_PROVIDER === 'tomtom-orbis'
    ? env.VITE_MAP_PROVIDER
    : 'osm'
export const SEARCH_PROVIDER: Provider = env.VITE_SEARCH_PROVIDER === 'tomtom' ? 'tomtom' : 'osm'
export const ROUTING_PROVIDER: Provider = env.VITE_ROUTING_PROVIDER === 'tomtom' ? 'tomtom' : 'osm'

/** Стиль карты для MapLibre. */
export function mapStyleUrl(): string {
  if (MAP_PROVIDER === 'tomtom-orbis') {
    return `https://api.tomtom.com/maps/orbis/assets/styles/0.6.0-0/style.json?apiVersion=1&map=basic_mono-light&key=${TOMTOM_KEY}`
  }
  if (MAP_PROVIDER === 'tomtom') {
    return `https://api.tomtom.com/style/1/style/22.2.1-*?map=2/basic_mono-light&key=${TOMTOM_KEY}`
  }
  // OpenFreeMap Liberty: открытые векторные тайлы OSM, без ключа, с 3D-зданиями
  return 'https://tiles.openfreemap.org/styles/liberty'
}

export const MAP_ATTRIBUTION = MAP_PROVIDER === 'osm' ? 'OpenStreetMap · OpenFreeMap' : 'TomTom'
