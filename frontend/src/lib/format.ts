/** Время как на табло: «07:42», от часа — «1:02:03». */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Расстояние: «380 м», «1,24 км». */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} м`
  const km = meters / 1000
  return `${km.toFixed(km < 10 ? 2 : 1).replace('.', ',')} км`
}

/** Координата для технических подписей: «43.2380». */
export function formatCoord(value: number, digits = 4): string {
  return value.toFixed(digits)
}

/** Инициалы для аватарки: «Айгерим Н.» → «АН». */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '')
  return letters.join('') || '·'
}

/** Минуты пешком для крупной цифры: не меньше 1. */
export function formatMinutes(totalSec: number): string {
  return String(Math.max(1, Math.round(totalSec / 60)))
}

/** Время прибытия «21:14», если выйти сейчас. */
export function formatEta(totalSec: number, from: Date = new Date()): string {
  const d = new Date(from.getTime() + totalSec * 1000)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Компактный адрес: «улица Сатпаева, 24» → «ул. Сатпаева, 24». */
export function shortAddress(address: string): string {
  return address
    .replace(/(^|\s)улица\s/gi, '$1ул. ')
    .replace(/(^|\s)проспект\s/gi, '$1пр. ')
    .replace(/(^|\s)переулок\s/gi, '$1пер. ')
    .replace(/(^|\s)бульвар\s/gi, '$1б-р ')
    .replace(/(^|\s)микрорайон(\s|,|$)/gi, '$1мкр$2')
}

const MATERIALS: Record<string, string> = {
  brick: 'кирпич',
  stone: 'камень',
  concrete: 'бетон',
  reinforced_concrete: 'железобетон',
  panel: 'панели',
  panels: 'панели',
  concrete_panels: 'бетонные панели',
  block: 'блоки',
  concrete_block: 'бетонные блоки',
  wood: 'дерево',
  adobe: 'саман',
  mud: 'глина',
  metal: 'металл',
  steel: 'сталь',
  plaster: 'штукатурка',
  glass: 'стекло',
}

/** Материал из OSM по-русски, исходное значение — в скобках: «бетон (concrete)». */
export function materialLabel(raw: string | null): string | null {
  if (!raw) return null
  const ru = MATERIALS[raw.trim().toLowerCase()]
  return ru ? `${ru} (${raw})` : raw
}
