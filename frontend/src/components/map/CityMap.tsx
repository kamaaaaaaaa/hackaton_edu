import { useEffect, useRef, useState } from 'react'
import {
  AttributionControl,
  Map as MLMap,
  Marker,
  Popup,
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
  type MapGeoJSONFeature,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre 6 ищет воркер рядом со своим модулем — после сборки его там нет.
// Собираем воркер силами Vite и явно передаём URL (работает и в dev, и в prod).
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { AssemblyPointType, LngLat, MappedPoint, RiskLevel } from '@/api/types'
import { MAP_PROVIDER, mapStyleUrl } from '@/api/geoConfig'
import { useI18n } from '@/i18n'
import { ALMATY_CENTER, boundsOf } from '@/lib/geo'
import { IconCompass, IconCrosshair, IconMinus, IconPlus } from '@/components/ui/icons'
import { Spinner } from '@/components/ui/motion'
import { localName, paperizeStyle } from './paperTheme'

setWorkerUrl(maplibreWorkerUrl)

const ACCENT = '#5B3DF5'
const ACID = '#D4FF3A'
const INK = '#111113'
const HIDDEN = 'rgba(0,0,0,0)'
export const RISK_COLOR: Record<RiskLevel, string> = { high: '#FF3B1F', mid: '#FFB020', low: '#1FCB8B' }
const NO_RISK = '#8E8E93'
const BUILDING_LAYERS = ['building-3d', 'building']
const EMPTY = { type: 'FeatureCollection' as const, features: [] }

type Padding = { top: number; right: number; bottom: number; left: number }

/** Дом из списка — точка на карте с этажностью и цветом риска. */
export interface MapHouse {
  id: string
  lat: number
  lng: number
  floors: number | null
  risk: RiskLevel | null
}

export interface CityMapProps {
  points: MappedPoint[]
  houses?: MapHouse[]
  selectedHouseId?: string | null
  home?: LngLat | null
  /** Цвет подсвеченного 3D-дома по уровню риска. */
  homeRisk?: RiskLevel | null
  fastestId?: string | null
  candidateIds?: string[]
  /** Геометрия маршрута [lng, lat] — рисуется анимированно. */
  route?: [number, number][] | null
  /** Точки начала шагов маршрута. */
  stepPoints?: [number, number][]
  /** Выбранный шаг — подсвечивается и попадает в кадр. */
  highlight?: [number, number][] | null
  meeting?: LngLat | null
  /** Аватарки вокруг точки встречи (схема, не геолокация). */
  avatars?: { id: string; label: string; ring: string }[]
  padding?: Padding
  /** Сколько снизу закрыто панелями (px) — туда же поднимаем атрибуцию карты. */
  bottomInset?: number
  /** Кнопки масштаба, 3D, компас, «где я». */
  controls?: boolean
  controlsClassName?: string
  /** Нажатие на здание или долгое нажатие на карту. */
  onPick?: (p: LngLat) => void
  onHouseClick?: (id: string) => void
  onRouteToPoint?: (id: string) => void
  onLocate?: () => void
  locating?: boolean
  onError?: () => void
  className?: string
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Видимая часть линии: до progress — цвет, дальше — прозрачно. */
const drawn = (progress: number, color: string): ExpressionSpecification => [
  'step',
  ['line-progress'],
  color,
  Math.min(Math.max(progress, 0.0001), 1.0001),
  HIDDEN,
]

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const line = (coordinates: [number, number][]) => ({
  type: 'Feature' as const,
  properties: {},
  geometry: { type: 'LineString' as const, coordinates },
})

const POINT_ICON: Record<AssemblyPointType, string> = {
  school: '<path d="M3 9.5 12 5l9 4.5-9 4.5-9-4.5Z"/><path d="M7 11.5V16c1.5 1.3 3.2 2 5 2s3.5-.7 5-2v-4.5"/>',
  kindergarten: '<path d="M3 9.5 12 5l9 4.5-9 4.5-9-4.5Z"/><path d="M7 11.5V16c1.5 1.3 3.2 2 5 2s3.5-.7 5-2v-4.5"/>',
  university: '<path d="M4 9h16L12 4 4 9Z"/><path d="M6 9v8M10 9v8M14 9v8M18 9v8M4 19h16"/>',
  college: '<path d="M4 9h16L12 4 4 9Z"/><path d="M6 9v8M10 9v8M14 9v8M18 9v8M4 19h16"/>',
  stadium: '<rect x="3" y="6.5" width="18" height="11" rx="5.5"/><path d="M12 6.5v11"/><circle cx="12" cy="12" r="2"/>',
  arena: '<rect x="3" y="6.5" width="18" height="11" rx="5.5"/><path d="M12 6.5v11"/><circle cx="12" cy="12" r="2"/>',
}

/** Шеврон для стрелок направления вдоль маршрута. */
function addArrowImage(map: MLMap) {
  if (map.hasImage('route-arrow')) return
  const size = 48
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(17, 12)
  ctx.lineTo(30, 24)
  ctx.lineTo(17, 36)
  ctx.stroke()
  map.addImage('route-arrow', ctx.getImageData(0, 0, size, size), { pixelRatio: 2 })
}

type Ring = [number, number][]

function inRing(p: [number, number], ring: Ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Контур здания чуть шире исходного — подсветка не мерцает со стенами оригинала. */
function inflate(rings: Ring[], k: number): Ring[] {
  const outer = rings[0]
  const cx = outer.reduce((s, c) => s + c[0], 0) / outer.length
  const cy = outer.reduce((s, c) => s + c[1], 0) / outer.length
  return rings.map((r) => r.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k] as [number, number]))
}

function outerRings(f: MapGeoJSONFeature): Ring[][] {
  const g = f.geometry
  if (g.type === 'Polygon') return [g.coordinates as Ring[]]
  if (g.type === 'MultiPolygon') return g.coordinates as Ring[][]
  return []
}

export default function CityMap({
  points,
  houses = [],
  selectedHouseId = null,
  home = null,
  homeRisk = null,
  fastestId = null,
  candidateIds = [],
  route = null,
  stepPoints = [],
  highlight = null,
  meeting = null,
  avatars = [],
  padding = { top: 80, right: 40, bottom: 80, left: 40 },
  bottomInset = 0,
  controls = true,
  controlsClassName = 'right-3 top-3',
  onPick,
  onHouseClick,
  onRouteToPoint,
  onLocate,
  locating = false,
  onError,
  className = '',
}: CityMapProps) {
  const { t, lang } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const [ready, setReady] = useState(false)
  const [camera, setCamera] = useState({ bearing: 0, pitch: 0 })
  const localizedLayers = useRef<string[]>([])
  const langRef = useRef(lang)
  langRef.current = lang

  // Колбэки через ref — чтобы не пересоздавать карту
  const cb = useRef({ onPick, onHouseClick, onRouteToPoint, onError, padding })
  cb.current = { onPick, onHouseClick, onRouteToPoint, onError, padding }

  // ---------- Инициализация ----------
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const map = new MLMap({
      container,
      center: [ALMATY_CENTER.lng, ALMATY_CENTER.lat],
      zoom: 11.2,
      minZoom: 9,
      maxZoom: 19,
      maxPitch: 65,
      attributionControl: false,
    })
    // Стиль правим до загрузки: палитра, подписи на языке интерфейса (paperTheme.ts)
    map.setStyle(mapStyleUrl(), { transformStyle: (_previous, next) => paperizeStyle(next, langRef.current) })
    // Атрибуция OpenStreetMap / TomTom обязательна
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left')
    if (!window.matchMedia('(min-width: 768px)').matches) {
      map.once('load', () =>
        container.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'),
      )
    }

    const setZoomClass = () => {
      container.dataset.zoom = map.getZoom() < 12.3 ? 'far' : 'near'
    }
    setZoomClass()
    map.on('zoom', setZoomClass)
    const syncCamera = () => setCamera({ bearing: map.getBearing(), pitch: map.getPitch() })
    map.on('rotate', syncCamera)
    map.on('pitch', syncCamera)

    map.on('style.load', () => {
      if (map.getSource('route')) return
      addArrowImage(map)
      const style = map.getStyle()
      localizedLayers.current = style.layers
        .filter((l) => l.type === 'symbol' && JSON.stringify(l.layout?.['text-field'] ?? '').includes('name:ru'))
        .map((l) => l.id)
      // Наши слои — под подписями улиц, чтобы названия читались поверх маршрута
      const beforeLabels = style.layers.find((l) => l.type === 'symbol')?.id
      const width = (a: number, b: number) => ['interpolate', ['linear'], ['zoom'], 11, a, 17, b]

      // Выбранный дом — поднимается в 3D цветом уровня риска
      map.addSource('sel-bldg', { type: 'geojson', data: EMPTY })
      if (map.getLayer('building-3d')) {
        map.addLayer(
          {
            id: 'sel-bldg',
            type: 'fill-extrusion',
            source: 'sel-bldg',
            paint: {
              'fill-extrusion-color': ACCENT,
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'base'],
              'fill-extrusion-opacity': 0.92,
            },
          },
          beforeLabels,
        )
      }

      map.addSource('route', { type: 'geojson', lineMetrics: true, data: line([]) })
      map.addLayer(
        {
          id: 'route-casing',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-width': width(7, 15) as never, 'line-gradient': drawn(0, '#FFFFFF') as never },
        },
        beforeLabels,
      )
      map.addLayer(
        {
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-width': width(4, 9) as never, 'line-gradient': drawn(0, ACCENT) as never },
        },
        beforeLabels,
      )
      map.addLayer(
        {
          id: 'route-arrows',
          type: 'symbol',
          source: 'route',
          minzoom: 13,
          layout: {
            'symbol-placement': 'line',
            'symbol-spacing': 70,
            'icon-image': 'route-arrow',
            'icon-size': ['interpolate', ['linear'], ['zoom'], 13, 0.5, 17, 0.85] as never,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-rotation-alignment': 'map',
          },
          paint: { 'icon-opacity': 0 },
        },
        beforeLabels,
      )

      // Шаг маршрута, выбранный в списке
      map.addSource('route-step', { type: 'geojson', data: line([]) })
      map.addLayer({
        id: 'route-step-casing',
        type: 'line',
        source: 'route-step',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': INK, 'line-width': width(9, 16) as never },
      })
      map.addLayer({
        id: 'route-step',
        type: 'line',
        source: 'route-step',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ACID, 'line-width': width(5, 10) as never },
      })
      map.addSource('route-steps', { type: 'geojson', data: EMPTY })
      map.addLayer({
        id: 'route-steps',
        type: 'circle',
        source: 'route-steps',
        minzoom: 13.5,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 13.5, 3, 17, 5.5] as never,
          'circle-color': '#FFFFFF',
          'circle-stroke-color': ACCENT,
          'circle-stroke-width': 2.5,
        },
      })

      // Дома из списка: цвет — уровень риска, цифра — этажность
      map.addSource('houses', { type: 'geojson', data: EMPTY })
      map.addLayer({
        id: 'houses-halo',
        type: 'circle',
        source: 'houses',
        filter: ['==', ['get', 'id'], ''],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 9, 15, 17] as never,
          'circle-color': 'rgba(91, 61, 245, 0.16)',
          'circle-stroke-color': ACCENT,
          'circle-stroke-width': 2.5,
        },
      })
      map.addLayer({
        id: 'houses-dot',
        type: 'circle',
        source: 'houses',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4.5, 13, 8, 16, 11] as never,
          'circle-color': ['get', 'color'] as never,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 2,
        },
      })
      if (MAP_PROVIDER === 'osm') {
        map.addLayer({
          id: 'houses-label',
          type: 'symbol',
          source: 'houses',
          minzoom: 12.5,
          layout: {
            'text-field': ['get', 'floors'] as never,
            'text-font': ['Noto Sans Bold'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 12.5, 9, 16, 12] as never,
            'text-allow-overlap': true,
            'text-ignore-placement': true,
          },
          paint: { 'text-color': ['get', 'text'] as never },
        })
      }

      map.on('click', 'houses-dot', (e) => {
        const id = e.features?.[0]?.properties?.id
        if (typeof id === 'string') cb.current.onHouseClick?.(id)
      })
      map.on('mouseenter', 'houses-dot', () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', 'houses-dot', () => (map.getCanvas().style.cursor = ''))
      setReady(true)
    })

    map.on('error', (e) => {
      const status = (e.error as { status?: number } | undefined)?.status
      if (status === 401 || status === 403) cb.current.onError?.()
    })

    // Нажатие на здание — выбрать его; долгое нажатие / правый клик — любая точка
    let timer = 0
    let start: { x: number; y: number } | null = null
    let skipClick = false
    let rotated = false
    const cancel = () => {
      window.clearTimeout(timer)
      start = null
    }
    const arm = (point: { x: number; y: number }, lngLat: { lng: number; lat: number }, ms: number) => {
      start = point
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        start = null
        skipClick = true
        cb.current.onPick?.({ lng: lngLat.lng, lat: lngLat.lat })
      }, ms)
    }
    const moved = (p: { x: number; y: number }, limit: number) =>
      start !== null && Math.hypot(p.x - start.x, p.y - start.y) > limit

    map.on('touchstart', (e) => (e.points.length === 1 ? arm(e.point, e.lngLat, 550) : cancel()))
    map.on('touchmove', (e) => moved(e.point, 10) && cancel())
    map.on('touchend', cancel)
    map.on('mousedown', (e) => {
      rotated = false
      if (e.originalEvent.button === 0) arm(e.point, e.lngLat, 650)
    })
    map.on('mousemove', (e) => moved(e.point, 6) && cancel())
    map.on('mouseup', cancel)
    map.on('dragstart', cancel)
    map.on('zoomstart', cancel)
    map.on('rotatestart', () => {
      rotated = true
      cancel()
    })
    map.on('contextmenu', (e) => {
      e.preventDefault()
      if (!rotated) cb.current.onPick?.({ lng: e.lngLat.lng, lat: e.lngLat.lat })
    })
    map.on('click', (e) => {
      if (skipClick) {
        skipClick = false
        return
      }
      if (e.originalEvent.target !== map.getCanvas()) return // клик по маркеру или попапу
      if (map.getLayer('houses-dot') && map.queryRenderedFeatures(e.point, { layers: ['houses-dot'] }).length) return
      const layers = BUILDING_LAYERS.filter((id) => map.getLayer(id))
      if (layers.length && map.queryRenderedFeatures(e.point, { layers }).length) {
        cb.current.onPick?.({ lng: e.lngLat.lng, lat: e.lngLat.lat })
      }
    })

    mapRef.current = map
    if (import.meta.env.DEV) {
      map.on('error', (e) => console.error('[map]', (e.error as Error | undefined)?.message ?? e))
      ;(window as unknown as { __map?: MLMap }).__map = map // отладка в dev
    }
    return () => {
      cancel()
      map.remove()
      mapRef.current = null
      setReady(false)
    }
  }, [])

  // ---------- Язык подписей ----------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    for (const id of localizedLayers.current) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'text-field', localName(lang) as ExpressionSpecification)
    }
  }, [lang, ready])

  // ---------- Пункты приёма (каскадом) ----------
  const pointMarkers = useRef(new Map<string, { marker: Marker; el: HTMLDivElement }>())
  const labels = { official: t('map.point.official'), routeHere: t('map.route.toHere'), osmObject: t('map.point.osmObject') }
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const store = pointMarkers.current
    points.forEach((p, i) => {
      if (store.has(p.id)) return
      // Внешний элемент двигает MapLibre (transform), анимируем только внутренний
      const root = document.createElement('div')
      root.className = 'pt-root'
      const el = document.createElement('div')
      el.className = 'pt'
      el.style.setProperty('--d', `${Math.min(i, 40) * 22}ms`)
      el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${POINT_ICON[p.type] ?? POINT_ICON.school}</svg>`
      root.appendChild(el)
      root.setAttribute('role', 'button')
      root.setAttribute('aria-label', p.name)

      const content = document.createElement('div')
      content.className = 'w-64 p-4'
      content.innerHTML =
        `<div class="cap">${esc(p.district)} р‑н</div>` +
        `<div class="mt-1 font-display text-sm font-semibold leading-snug text-ink">${esc(p.name)}</div>` +
        `<div class="mt-0.5 text-xs text-muted">${esc(p.address)}</div>` +
        `<div class="mt-2 text-[11px] font-medium text-safe-ink">${esc(labels.official)}</div>` +
        (p.geocodeMethod === 'osm-object' ? `<div class="mt-1 text-[10.5px] text-faint">${esc(labels.osmObject)}</div>` : '')
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn btn-ink btn-sm mt-3 w-full'
      btn.textContent = labels.routeHere
      content.appendChild(btn)

      const popup = new Popup({ closeButton: false, offset: 18, maxWidth: '280px' }).setDOMContent(content)
      btn.addEventListener('click', () => {
        popup.remove()
        cb.current.onRouteToPoint?.(p.id)
      })
      const marker = new Marker({ element: root }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map)
      store.set(p.id, { marker, el })
    })
    for (const [id, { marker }] of store) {
      if (!points.some((p) => p.id === id)) {
        marker.remove()
        store.delete(id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, labels.official, labels.routeHere, labels.osmObject])

  useEffect(() => {
    for (const [id, { el, marker }] of pointMarkers.current) {
      el.classList.toggle('is-fastest', id === fastestId)
      el.classList.toggle('is-candidate', id !== fastestId && candidateIds.includes(id))
      marker.getElement().style.zIndex = id === fastestId ? '3' : candidateIds.includes(id) ? '2' : '1'
    }
  }, [fastestId, candidateIds, points])

  // ---------- Дома из списка ----------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    ;(map.getSource('houses') as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: houses.map((h) => ({
        type: 'Feature' as const,
        properties: {
          id: h.id,
          floors: h.floors !== null ? String(h.floors) : '',
          color: h.risk ? RISK_COLOR[h.risk] : NO_RISK,
          text: h.risk === 'high' || !h.risk ? '#FFFFFF' : INK,
        },
        geometry: { type: 'Point' as const, coordinates: [h.lng, h.lat] },
      })),
    })
  }, [houses, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !map.getLayer('houses-halo')) return
    map.setFilter('houses-halo', ['==', ['get', 'id'], selectedHouseId ?? ''])
  }, [selectedHouseId, ready])

  // ---------- Дом-эпицентр + 3D-подсветка здания ----------
  const homeMarker = useRef<Marker | null>(null)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    homeMarker.current?.remove()
    homeMarker.current = null
    if (!home) return
    const el = document.createElement('div')
    el.className = 'epicenter'
    el.innerHTML = '<span class="wave"></span><span class="wave"></span><span class="wave"></span><span class="core"></span>'
    homeMarker.current = new Marker({ element: el }).setLngLat([home.lng, home.lat]).addTo(map)
    if (!route) map.flyTo({ center: [home.lng, home.lat], zoom: 16, duration: reducedMotion() ? 0 : 900 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home?.lng, home?.lat])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const src = map.getSource('sel-bldg') as GeoJSONSource | undefined
    src?.setData(EMPTY)
    if (!home || !src || !map.getLayer('sel-bldg')) return
    let cancelled = false
    const detect = () => {
      if (cancelled) return
      const layers = BUILDING_LAYERS.filter((id) => map.getLayer(id))
      const p = map.project([home.lng, home.lat])
      const found = map.queryRenderedFeatures(
        [
          [p.x - 14, p.y - 14],
          [p.x + 14, p.y + 14],
        ],
        { layers },
      )
      const hit = found.find((f) => outerRings(f).some((poly) => inRing([home.lng, home.lat], poly[0])))
      if (!hit) return
      const height = Number(hit.properties?.render_height ?? 10)
      const base = Number(hit.properties?.render_min_height ?? 0)
      src.setData({
        type: 'FeatureCollection',
        features: outerRings(hit).map((poly) => ({
          type: 'Feature' as const,
          properties: { height: height + 0.8, base },
          geometry: { type: 'Polygon' as const, coordinates: inflate(poly, 1.04) },
        })),
      })
    }
    // Здание можно найти, когда камера долетела и тайлы отрисованы
    map.once('idle', detect)
    return () => {
      cancelled = true
      map.off('idle', detect)
    }
  }, [home?.lng, home?.lat, ready]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !map.getLayer('sel-bldg')) return
    map.setPaintProperty('sel-bldg', 'fill-extrusion-color', homeRisk ? RISK_COLOR[homeRisk] : ACCENT)
  }, [homeRisk, ready])

  // ---------- Маршрут: прорисовка + кадрирование ----------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const src = map.getSource('route') as GeoJSONSource | undefined
    if (!src) return
    map.setPaintProperty('route-arrows', 'icon-opacity', 0)
    if (!route || route.length < 2) {
      src.setData(line([]))
      return
    }
    src.setData(line(route))
    map.fitBounds(boundsOf(home ? [...route, [home.lng, home.lat]] : route), {
      padding: cb.current.padding,
      maxZoom: 16.5,
      duration: reducedMotion() ? 0 : 900,
    })

    const duration = reducedMotion() ? 0 : 1400
    const t0 = performance.now()
    let raf = 0
    const frame = (now: number) => {
      const p = duration ? Math.min(1, (now - t0) / duration) : 1
      const eased = 1 - (1 - p) ** 3
      map.setPaintProperty('route-casing', 'line-gradient', drawn(eased * 1.0001, '#FFFFFF'))
      map.setPaintProperty('route-line', 'line-gradient', drawn(eased * 1.0001, ACCENT))
      if (p < 1) raf = requestAnimationFrame(frame)
      else map.setPaintProperty('route-arrows', 'icon-opacity', 0.95)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    ;(map.getSource('route-steps') as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: stepPoints.map((c) => ({
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'Point' as const, coordinates: c },
      })),
    })
  }, [stepPoints, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    ;(map.getSource('route-step') as GeoJSONSource | undefined)?.setData(line(highlight ?? []))
    if (!highlight || highlight.length < 2) return
    map.fitBounds(boundsOf(highlight), {
      padding: cb.current.padding,
      maxZoom: 17.5,
      duration: reducedMotion() ? 0 : 700,
    })
  }, [highlight, ready])

  // ---------- Точка встречи и аватарки семьи ----------
  const familyMarkers = useRef<Marker[]>([])
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    familyMarkers.current.forEach((m) => m.remove())
    familyMarkers.current = []
    if (!meeting) return

    const pinRoot = document.createElement('div')
    pinRoot.className = 'pt-root'
    pinRoot.innerHTML = '<div class="pt is-meeting"></div>'
    familyMarkers.current.push(new Marker({ element: pinRoot }).setLngLat([meeting.lng, meeting.lat]).addTo(map))

    const n = avatars.length
    avatars.forEach((a, i) => {
      const root = document.createElement('div')
      const el = document.createElement('div')
      el.className = 'avatar-pin'
      el.style.setProperty('--d', `${150 + i * 90}ms`)
      el.style.background = '#FFFFFF'
      el.style.boxShadow = `0 0 0 3px ${a.ring}`
      el.textContent = a.label
      root.appendChild(el)
      const angle = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2
      const offset: [number, number] = [Math.cos(angle) * 46, Math.sin(angle) * 46]
      familyMarkers.current.push(new Marker({ element: root, offset }).setLngLat([meeting.lng, meeting.lat]).addTo(map))
    })
    map.flyTo({ center: [meeting.lng, meeting.lat], zoom: 15, duration: reducedMotion() ? 0 : 800 })
  }, [meeting?.lng, meeting?.lat, avatars]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Кнопки ----------
  const is3d = camera.pitch > 5
  const rotatedView = Math.abs(camera.bearing) > 1 || is3d
  const toggle3d = () => {
    const map = mapRef.current
    if (!map) return
    map.easeTo({
      pitch: is3d ? 0 : 58,
      bearing: is3d ? 0 : -20,
      zoom: is3d ? map.getZoom() : Math.max(map.getZoom(), 15.6),
      duration: reducedMotion() ? 0 : 900,
    })
  }
  const resetNorth = () => mapRef.current?.easeTo({ bearing: 0, pitch: 0, duration: reducedMotion() ? 0 : 600 })
  const ctrlBtn =
    'grid h-11 w-11 place-items-center bg-surface text-ink transition-colors hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

  return (
    <div
      className={`city-map relative h-full w-full ${className}`}
      style={{ ['--map-inset-bottom' as string]: `${bottomInset}px` }}
    >
      <div ref={containerRef} data-lenis-prevent className="h-full w-full" />
      {controls && (
        <div className={`absolute z-10 flex flex-col items-end gap-2 ${controlsClassName}`}>
          <div className="flex flex-col overflow-hidden rounded-2xl border border-line shadow-card">
            <button type="button" className={ctrlBtn} aria-label={t('map.ctrl.zoomIn')} onClick={() => mapRef.current?.zoomIn()}>
              <IconPlus width={20} height={20} />
            </button>
            <span className="h-px bg-line" />
            <button type="button" className={ctrlBtn} aria-label={t('map.ctrl.zoomOut')} onClick={() => mapRef.current?.zoomOut()}>
              <IconMinus width={20} height={20} />
            </button>
          </div>
          <button
            type="button"
            onClick={toggle3d}
            aria-pressed={is3d}
            aria-label={t('map.ctrl.3d')}
            className={`grid h-11 w-11 place-items-center rounded-2xl border font-mono text-[13px] font-bold shadow-card transition-colors ${
              is3d ? 'border-ink bg-ink text-acid' : 'border-line bg-surface text-ink hover:bg-paper'
            }`}
          >
            3D
          </button>
          {rotatedView && (
            <button
              type="button"
              onClick={resetNorth}
              aria-label={t('map.ctrl.north')}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-line bg-surface shadow-card"
            >
              <IconCompass width={22} height={22} style={{ transform: `rotate(${-camera.bearing}deg)` }} />
            </button>
          )}
          {onLocate && (
            <button
              type="button"
              onClick={onLocate}
              aria-label={t('map.locate')}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-line bg-surface text-accent shadow-card hover:bg-paper"
            >
              {locating ? <Spinner /> : <IconCrosshair width={20} height={20} />}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
