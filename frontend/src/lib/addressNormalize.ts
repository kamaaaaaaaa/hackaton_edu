// Нормализация адресов Алматы для поиска и геокодирования.
// Чистый модуль без импортов: его используют и приложение (поиск),
// и Node-скрипт scripts/geocode-points.ts (запускается без сборки).

// \b в JS не работает с кириллицей, поэтому границы слова — через \p{L}.
const L = '\\p{L}'
const word = (body: string) => new RegExp(`(?<![${L}])(?:${body})(?![${L}])`, 'giu')

const MICRO = word('микрорайон|микр\\.|мкрн\\.?|мкр\\.?|м-н|шағын\\s+аудан[ыі]?|ш\\.\\s?а\\.')
const STREET = word('улица|ул\\.?')
const AVENUE = word('проспект|просп\\.?|пр-т\\.?|пр\\.?')
const BOULEVARD = word('бульвар|б-р\\.?')
const HOUSE = word('дом|д\\.')
// Казахские родовые слова: «Абай даңғылы», «Төле би көшесі»
const KZ_STREET = word('көшесі|к-сі')
const KZ_AVENUE = word('даңғылы|даң\\.')

function squash(s: string): string {
  return s
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/№\s*/g, '')
    .replace(/[«»"“”]/g, '')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .trim()
}

/** Базовая чистка ввода: пробелы, тире, «№», кавычки. */
export function cleanQuery(q: string): string {
  return squash(q)
}

/** Раскрывает сокращения: «мкр.» → «микрорайон», «ул.» → «улица», «пр.» → «проспект». */
export function expandAbbreviations(q: string): string {
  return squash(
    q
      .replace(MICRO, 'микрорайон ')
      .replace(STREET, 'улица ')
      .replace(AVENUE, 'проспект ')
      .replace(BOULEVARD, 'бульвар ')
      .replace(HOUSE, ' ')
      .replace(KZ_STREET, ' ')
      .replace(KZ_AVENUE, ' '),
  )
}

/** Убирает родовые слова целиком: «ул. Гоголя, 133» → «Гоголя, 133». */
export function stripGeneric(q: string): string {
  return squash(
    q
      .replace(MICRO, ' ')
      .replace(STREET, ' ')
      .replace(AVENUE, ' ')
      .replace(BOULEVARD, ' ')
      .replace(HOUSE, ' ')
      .replace(KZ_STREET, ' ')
      .replace(KZ_AVENUE, ' '),
  )
}

/** Варианты запроса по убыванию приоритета, без дублей и пустых. */
export function queryVariants(q: string): string[] {
  const out: string[] = []
  for (const v of [cleanQuery(q), expandAbbreviations(q), stripGeneric(q)]) {
    if (v && !out.some((x) => x.toLowerCase() === v.toLowerCase())) out.push(v)
  }
  return out
}

/** Номер дома в конце адреса: «12а», «93/79», «135А», «126/1». */
export function extractHouseNumber(address: string): string | null {
  const m = squash(address).match(/(\d+\s?[\p{L}]?(?:\/\d+\s?[\p{L}]?)?)$/u)
  return m ? m[1] : null
}

/** Номер дома в сравнимом виде: без пробелов, строчными, латиница→кириллица. */
export function normalizeHouseNumber(n: string | null | undefined): string {
  if (!n) return ''
  const latToCyr: Record<string, string> = { a: 'а', b: 'б', v: 'в', g: 'г', e: 'е' }
  return n
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[abvge]/g, (c) => latToCyr[c] ?? c)
}

/** Название улицы/микрорайона перед номером дома, без родовых слов. */
export function extractStreetName(address: string): string | null {
  const parts = squash(address)
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  const withoutNumber = parts.filter((p) => !/^\d+\s?[\p{L}]?(?:\/\d+\s?[\p{L}]?)?$/u.test(p))
  const last = withoutNumber[withoutNumber.length - 1]
  if (!last) return null
  // «Абая 10» без запятой — отрезаем номер дома с конца
  const name = last.replace(/\s+\d+\s?[\p{L}]?(?:\/\d+\s?[\p{L}]?)?$/u, '')
  return stripGeneric(name) || null
}
