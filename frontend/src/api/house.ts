import type { House, LngLat } from './types'
import { findBuilding } from './buildings'
import { findDemoHouseNear, getDemoHouse, toHouse } from './houses'
import { extractHouseNumber } from '@/lib/addressNormalize'

// Данные о доме — только честные источники:
//  1) список домов src/data/demoHouses.json (реальные данные OSM, собраны
//     скриптом scripts/build-houses.ts) — мгновенно и без сети;
//  2) OpenStreetMap (Overpass): building:levels, start_date, building:material.
// Всё, чего нет в источнике, — null («нет данных»).

export interface HouseQuery extends LngLat {
  address: string
  /** Если адрес выбран из списка домов — его id. */
  houseId?: string
}

export async function getHouse(q: HouseQuery, signal?: AbortSignal): Promise<House> {
  const demo = getDemoHouse(q.houseId) ?? findDemoHouseNear(q)
  if (demo) return toHouse(demo)

  const b = await findBuilding(q, extractHouseNumber(q.address), signal)
  return {
    address: q.address,
    lat: q.lat,
    lng: q.lng,
    year: b?.year ?? null,
    yearApprox: b?.yearApprox,
    floors: b?.floors ?? null,
    material: b?.material ?? null,
    series: b?.series ?? null,
    source: b ? 'openstreetmap' : null,
    sourceRef: b?.ref ?? null,
    isDemo: false,
  }
}
