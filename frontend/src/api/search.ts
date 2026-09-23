import type { AddressSuggestion } from './types'
import { ALMATY_BIAS, isAbort, tomtomGet } from './tomtom'
import { SEARCH_PROVIDER } from './geoConfig'
import { getDemoHouses } from './houses'
import { expandAbbreviations, queryVariants, stripGeneric } from '@/lib/addressNormalize'

// Поиск адреса:
//  1) демо-дома (мгновенно, без сети);
//  2) TomTom Search — если VITE_SEARCH_PROVIDER=tomtom;
//  3) Photon (OpenStreetMap, подсказки по мере ввода) с вариантами нормализации;
//  4) Nominatim (OpenStreetMap) — запасной.

const BBOX = { minLon: 76.6, minLat: 43.05, maxLon: 77.2, maxLat: 43.45 }

const norm = (s: string) =>
  stripGeneric(s)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,/#№«»"()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function localSearch(q: string): AddressSuggestion[] {
  const tokens = norm(q).split(' ').filter(Boolean)
  if (!tokens.length) return []
  return getDemoHouses()
    .filter((h) => {
      const hay = norm(`${h.address} ${h.district ?? ''}`)
      return tokens.every((t) => hay.includes(t))
    })
    .slice(0, 4)
    .map((h) => ({
      id: `demo-${h.id}`,
      title: h.address,
      subtitle: `${h.district ? `${h.district} р‑н · ` : ''}${h.floors ?? '?'} эт.${h.year ? ` · ${h.year}` : ''}`,
      district: h.district,
      lat: h.lat,
      lng: h.lng,
      kind: 'demo-house',
      source: 'demo' as const,
      houseId: h.id,
    }))
}

// ---------- TomTom ----------
interface TTSearchResult {
  id: string
  type: string
  poi?: { name?: string }
  address?: { streetName?: string; streetNumber?: string; municipalitySubdivision?: string; freeformAddress?: string }
  position: { lat: number; lon: number }
}

async function tomtomSearch(q: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  const data = await tomtomGet<{ results?: TTSearchResult[] }>(
    `/search/2/search/${encodeURIComponent(q)}.json`,
    {
      countrySet: 'KZ',
      language: 'ru-RU',
      typeahead: true,
      lat: ALMATY_BIAS.lat,
      lon: ALMATY_BIAS.lon,
      radius: ALMATY_BIAS.radius,
      idxSet: 'PAD,Addr,Str,POI',
      limit: 7,
    },
    signal,
  )
  return (data.results ?? []).map((r) => {
    const a = r.address ?? {}
    return {
      id: `tt-${r.id}`,
      title: r.poi?.name || [a.streetName, a.streetNumber].filter(Boolean).join(', ') || a.freeformAddress || q,
      subtitle: a.freeformAddress ?? '',
      district: a.municipalitySubdivision ?? null,
      lat: r.position.lat,
      lng: r.position.lon,
      kind: r.type,
      source: 'tomtom' as const,
    }
  })
}

// ---------- Photon (OSM) ----------
interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    osm_id: number
    osm_type: string
    name?: string
    housenumber?: string
    street?: string
    district?: string
    locality?: string
    city?: string
    type?: string
  }
}

async function photonSearch(q: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', `${q} Алматы`)
  url.searchParams.set('limit', '8')
  url.searchParams.set('lat', String(ALMATY_BIAS.lat))
  url.searchParams.set('lon', String(ALMATY_BIAS.lon))
  url.searchParams.set('bbox', `${BBOX.minLon},${BBOX.minLat},${BBOX.maxLon},${BBOX.maxLat}`)
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Photon ${res.status}`)
  const data = (await res.json()) as { features?: PhotonFeature[] }
  return (data.features ?? [])
    .filter((f) => /алматы|almaty/i.test(f.properties.city ?? '') || !f.properties.city)
    .slice(0, 7)
    .map((f) => {
      const p = f.properties
      const street = [p.street, p.housenumber].filter(Boolean).join(', ')
      const title = street && p.housenumber ? street : p.name || street || q
      const district = p.district ?? p.locality ?? null
      return {
        id: `ph-${p.osm_type}${p.osm_id}`,
        title,
        subtitle: [p.name && p.name !== title ? p.name : null, district, p.city].filter(Boolean).join(', '),
        district,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        kind: p.type ?? 'osm',
        source: 'photon' as const,
      }
    })
}

// ---------- Nominatim (OSM), не чаще 1 запроса в секунду ----------
let lastNominatimAt = 0
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface NominatimItem {
  place_id: number
  display_name: string
  name?: string
  type?: string
  lat: string
  lon: string
  address?: Record<string, string>
}

async function nominatimSearch(q: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  const wait = lastNominatimAt + 1100 - Date.now()
  if (wait > 0) await sleep(wait)
  if (signal?.aborted) throw new DOMException('aborted', 'AbortError')
  lastNominatimAt = Date.now()
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('q', `${q}, Алматы`)
  url.searchParams.set('limit', '7')
  url.searchParams.set('countrycodes', 'kz')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('accept-language', 'ru')
  url.searchParams.set('viewbox', `${BBOX.minLon},${BBOX.maxLat},${BBOX.maxLon},${BBOX.minLat}`)
  url.searchParams.set('bounded', '1')
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  return ((await res.json()) as NominatimItem[]).map((item) => {
    const a = item.address ?? {}
    const street = [a.road, a.house_number].filter(Boolean).join(', ')
    return {
      id: `osm-${item.place_id}`,
      title: street || item.name || item.display_name.split(',')[0],
      subtitle: item.display_name,
      district: a.city_district ?? a.suburb ?? null,
      lat: Number(item.lat),
      lng: Number(item.lon),
      kind: item.type ?? 'osm',
      source: 'nominatim' as const,
    }
  })
}

export interface SearchOutcome {
  items: AddressSuggestion[]
  source: 'demo' | 'tomtom' | 'photon' | 'nominatim' | 'none'
}

export async function searchAddress(query: string, signal?: AbortSignal): Promise<SearchOutcome> {
  const local = localSearch(query)
  const withLocal = (items: AddressSuggestion[]) => {
    const seen = new Set(local.map((l) => `${l.lat.toFixed(4)},${l.lng.toFixed(4)}`))
    return [...local, ...items.filter((i) => !seen.has(`${i.lat.toFixed(4)},${i.lng.toFixed(4)}`))].slice(0, 8)
  }

  if (SEARCH_PROVIDER === 'tomtom') {
    for (const variant of queryVariants(query)) {
      try {
        const items = await tomtomSearch(variant, signal)
        if (items.length) return { items: withLocal(items), source: 'tomtom' }
      } catch (e) {
        if (isAbort(e)) throw e
        break // ключ без Search API / сеть — к OpenStreetMap
      }
    }
  }

  let lastError: unknown = null
  for (const variant of queryVariants(query)) {
    try {
      const items = await photonSearch(variant, signal)
      if (items.length) return { items: withLocal(items), source: 'photon' }
    } catch (e) {
      if (isAbort(e)) throw e
      lastError = e
      break
    }
  }

  try {
    const items = await nominatimSearch(expandAbbreviations(query), signal)
    if (items.length) return { items: withLocal(items), source: 'nominatim' }
  } catch (e) {
    if (isAbort(e)) throw e
    lastError = lastError ?? e
  }

  if (local.length) return { items: local, source: 'demo' }
  if (lastError) throw lastError
  return { items: [], source: 'none' }
}
