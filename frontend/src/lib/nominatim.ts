import { useEffect, useRef, useState } from 'react'

// Поиск адреса через Nominatim (OpenStreetMap).
// Политика Nominatim: не чаще 1 запроса/сек → debounce >= 1000 мс + отмена
// предыдущего запроса. В браузере User-Agent задать нельзя, Referer уходит сам.

export interface AddressSuggestion {
  placeId: string
  label: string // полный display_name
  shortLabel: string // короткое имя (улица, дом)
  lat: number
  lon: number
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
// Больший Алматы: lon_min, lat_max, lon_max, lat_min
const ALMATY_VIEWBOX = '76.70,43.42,77.12,43.10'

interface NominatimItem {
  place_id: number | string
  display_name: string
  name?: string
  lat: string
  lon: string
  address?: Record<string, string>
}

export async function searchAddress(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const url = new URL(NOMINATIM_URL)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '6')
  url.searchParams.set('countrycodes', 'kz')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('accept-language', 'ru')
  url.searchParams.set('viewbox', ALMATY_VIEWBOX)
  url.searchParams.set('bounded', '1')

  const res = await fetch(url.toString(), {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  const data = (await res.json()) as NominatimItem[]

  return data.map((item) => {
    const a = item.address ?? {}
    const shortLabel =
      [a.road, a.house_number].filter(Boolean).join(', ') ||
      item.name ||
      item.display_name.split(',')[0]
    return {
      placeId: String(item.place_id),
      label: item.display_name,
      shortLabel,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    }
  })
}

/** Debounce-хук подсказок адреса (лимит Nominatim ≤ 1 запрос/сек). */
export function useAddressSearch(query: string, minLength = 3, debounceMs = 1000) {
  const [results, setResults] = useState<AddressSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < minLength) {
      abortRef.current?.abort()
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    const handle = window.setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const r = await searchAddress(q, controller.signal)
        setResults(r)
      } catch (e) {
        if ((e as { name?: string })?.name !== 'AbortError') {
          setError('Не удалось загрузить подсказки')
          setResults([])
        }
      } finally {
        setLoading(false)
      }
    }, debounceMs)

    return () => window.clearTimeout(handle)
  }, [query, minLength, debounceMs])

  return { results, loading, error }
}
