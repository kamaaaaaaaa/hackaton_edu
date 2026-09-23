import type { AddressSuggestion, LngLat } from './types'
import { isAbort, tomtomGet } from './tomtom'
import { SEARCH_PROVIDER } from './geoConfig'
import { findDemoHouseNear } from './houses'
import { formatCoord } from '@/lib/format'

// Адрес по координатам — для «Моё местоположение» и выбора дома на карте:
// дом из списка (≤ 25 м) → TomTom (если включён) → Nominatim → Photon → координаты.

interface TTReverse {
  addresses?: {
    address?: {
      streetName?: string
      streetNumber?: string
      municipalitySubdivision?: string
      freeformAddress?: string
    }
  }[]
}

async function tomtomReverse(p: LngLat, signal?: AbortSignal) {
  const data = await tomtomGet<TTReverse>(`/search/2/reverseGeocode/${p.lat},${p.lng}.json`, { language: 'ru-RU' }, signal)
  const a = data.addresses?.[0]?.address
  if (!a?.freeformAddress) return null
  const street = [a.streetName, a.streetNumber].filter(Boolean).join(', ')
  return { title: street || a.freeformAddress, subtitle: a.freeformAddress, district: a.municipalitySubdivision ?? null }
}

async function nominatimReverse(p: LngLat, signal?: AbortSignal) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', String(p.lat))
  url.searchParams.set('lon', String(p.lng))
  url.searchParams.set('zoom', '18')
  url.searchParams.set('accept-language', 'ru')
  url.searchParams.set('addressdetails', '1')
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  const d = (await res.json()) as { display_name?: string; address?: Record<string, string> }
  if (!d.display_name) return null
  const a = d.address ?? {}
  const street = [a.road, a.house_number].filter(Boolean).join(', ')
  return {
    title: street || d.display_name.split(',')[0],
    subtitle: d.display_name,
    district: a.city_district?.replace(/\s*район$/i, '') ?? a.suburb ?? null,
  }
}

async function photonReverse(p: LngLat, signal?: AbortSignal) {
  const url = new URL('https://photon.komoot.io/reverse')
  url.searchParams.set('lat', String(p.lat))
  url.searchParams.set('lon', String(p.lng))
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Photon ${res.status}`)
  const d = (await res.json()) as {
    features?: { properties: { name?: string; street?: string; housenumber?: string; district?: string; city?: string } }[]
  }
  const f = d.features?.[0]?.properties
  if (!f) return null
  const street = [f.street, f.housenumber].filter(Boolean).join(', ')
  const title = street || f.name
  if (!title) return null
  return { title, subtitle: [f.name, f.district, f.city].filter(Boolean).join(', '), district: f.district ?? null }
}

export async function reverseGeocode(
  p: LngLat,
  source: 'geolocation' | 'map',
  signal?: AbortSignal,
): Promise<AddressSuggestion> {
  const base = { id: `${source}-${p.lat},${p.lng}`, lat: p.lat, lng: p.lng, source, kind: source }

  const demo = findDemoHouseNear(p, 25)
  if (demo) {
    return {
      ...base,
      id: `demo-${demo.id}`,
      lat: demo.lat,
      lng: demo.lng,
      title: demo.address,
      subtitle: `${demo.district ? `${demo.district} р‑н, ` : ''}Алматы`,
      district: demo.district,
      houseId: demo.id,
    }
  }

  const providers = [
    ...(SEARCH_PROVIDER === 'tomtom' ? [tomtomReverse] : []),
    nominatimReverse,
    photonReverse,
  ]
  for (const provider of providers) {
    try {
      const r = await provider(p, signal)
      if (r) return { ...base, ...r }
    } catch (e) {
      if (isAbort(e)) throw e
    }
  }

  const coords = `${formatCoord(p.lat, 5)}, ${formatCoord(p.lng, 5)}`
  return { ...base, title: coords, subtitle: coords, district: null }
}
