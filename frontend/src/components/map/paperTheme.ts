import type { StyleSpecification } from 'maplibre-gl'

// Подготовка стиля карты перед загрузкой в MapLibre — сразу, без вспышки
// чужих цветов:
//  • OpenFreeMap Liberty (OpenStreetMap, по умолчанию): тёплая «бумажная»
//    палитра, подписи на русском/казахском вместо латиницы, 3D-дома;
//  • TomTom basic_mono-light: чиним цвета «hsla(0, 0, 0, 0)» (без «%» — строгий
//    парсер MapLibre 6 отвергает весь стиль) и перекрашиваем так же.
// Слои, которых нет в стиле, просто не трогаются.

export const PAPER = '#F4F3EE'

const FILLS: Record<string, unknown> = {
  // TomTom
  'Landcover - Built-up area': '#ECEAE3',
  'Landuse - Urban': '#ECEAE3',
  'Landuse - Park': '#E3EBE1',
  'Landuse - Vegetation': '#E3EBE1',
  'Landcover - Natural': '#E6EBE2',
  'Landuse - Sport': '#E6ECE4',
  'Landuse - Recreation': '#E8ECE5',
  'Water - Fill': '#DCD8F1',
  'Water - Intermittent': '#E4E1F4',
  'Water - Shadow': '#CFCAE9',
  'Buildings - Fill': '#E7E4DB',
  'Buildings - Shadow': '#D6D2C7',
  // OpenFreeMap Liberty
  landuse_residential: 'rgba(233, 229, 219, 0.55)',
  park: '#DCEBD2',
  landcover_grass: '#DCEBD2',
  landcover_wood: 'rgba(196, 222, 181, 0.7)',
  landuse_pitch: '#DFE9D3',
  landuse_track: '#DFE9D3',
  landuse_cemetery: '#E2E6D4',
  landuse_hospital: '#F7E4E0',
  // школы и вузы — 44 из 50 пунктов приёма: подсвечиваем их территорию
  landuse_school: '#EEF3CF',
  water: '#BED3F0',
  aeroway_fill: '#E9E6DF',
  building: '#E3DED3',
}

const LINES: Record<string, string> = {
  waterway_river: '#A9C4EC',
  waterway_other: '#A9C4EC',
  waterway_tunnel: '#A9C4EC',
  park_outline: 'rgba(0,0,0,0)',
}

const HSL = /^(hsla?)\(\s*(-?[\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*(?:,\s*([\d.]+)\s*)?\)$/i

function fixColor(value: string): string {
  const m = value.match(HSL)
  if (!m) return value
  const [, , h, s, l, a] = m
  return a !== undefined ? `hsla(${h}, ${s}%, ${l}%, ${a})` : `hsl(${h}, ${s}%, ${l}%)`
}

function deepFix(value: unknown): unknown {
  if (typeof value === 'string') return fixColor(value)
  if (Array.isArray(value)) return value.map(deepFix)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deepFix(v)]))
  }
  return value
}

type LooseLayer = {
  id: string
  type: string
  source?: string
  paint?: Record<string, unknown>
  layout?: Record<string, unknown>
}

/** Подпись на языке интерфейса; если перевода нет — как в OSM. */
export const localName = (lang: 'ru' | 'kk') =>
  lang === 'kk'
    ? ['coalesce', ['get', 'name:kk'], ['get', 'name:ru'], ['get', 'name']]
    : ['coalesce', ['get', 'name:ru'], ['get', 'name']]

const usesLatinLabels = (field: unknown) => JSON.stringify(field ?? '').includes('name:latin')

export function paperizeStyle(style: StyleSpecification, lang: 'ru' | 'kk' = 'ru'): StyleSpecification {
  const layers = (style.layers as unknown as LooseLayer[]).map((layer) => {
    const paint = deepFix(layer.paint ?? {}) as Record<string, unknown>
    const layout = { ...(layer.layout ?? {}) }

    if (layer.type === 'background') paint['background-color'] = PAPER
    if (layer.type === 'fill' && FILLS[layer.id]) paint['fill-color'] = FILLS[layer.id]
    if (layer.type === 'line' && LINES[layer.id]) paint['line-color'] = LINES[layer.id]

    if (layer.type === 'fill-extrusion' && layer.id === 'building-3d') {
      // Чем выше дом, тем плотнее тон — этажность читается прямо с карты
      paint['fill-extrusion-color'] = [
        'interpolate',
        ['linear'],
        ['coalesce', ['get', 'render_height'], 0],
        0,
        '#E6E1D6',
        30,
        '#D9D2C4',
        80,
        '#C9C0AF',
      ]
      paint['fill-extrusion-opacity'] = 0.88
    }

    if (layer.type === 'symbol' && 'text-field' in layout) {
      if (usesLatinLabels(layout['text-field'])) layout['text-field'] = localName(lang)
      const font = layout['text-font']
      if (Array.isArray(font) && font.includes('Noto Sans Italic') && !layer.id.startsWith('water')) {
        layout['text-font'] = ['Noto Sans Regular']
      }
      paint['text-halo-color'] = PAPER
    }
    return { ...layer, paint, layout }
  })
  return { ...style, layers: layers as unknown as StyleSpecification['layers'] }
}
