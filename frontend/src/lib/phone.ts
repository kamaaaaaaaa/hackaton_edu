// Телефоны Казахстана: маска «+7 (7XX) XXX-XX-XX». Храним 10 цифр
// национального номера, на сервер отправляем в формате +7XXXXXXXXXX.

const PREFIX = '+7 ('

/**
 * Цифры национального номера (10 шт.) из того, что ввели или вставили:
 * «+7 (701) 234», «8 701 234 56 78», «+7 701 2345678», «7012345678».
 */
export function nationalDigits(raw: string): string {
  let d: string
  if (raw.startsWith(PREFIX)) {
    // Поле уже с маской: код страны в ней, берём цифры после «+7 (»
    d = raw.slice(PREFIX.length).replace(/\D/g, '')
    if (d.length === 11 && /^[78]/.test(d)) d = d.slice(1) // вставили номер целиком
  } else {
    d = raw.replace(/\D/g, '')
    if (raw.trimStart().startsWith('+7')) d = d.slice(1)
    else if (d.length === 11 && /^[78]/.test(d)) d = d.slice(1)
  }
  if (d.startsWith('8')) d = d.slice(1) // «8» — междугородний префикс, номера Казахстана начинаются с 7
  return d.slice(0, 10)
}

/** «7012345678» → «+7 (701) 234-56-78»; неполный номер — частично. */
export function formatNational(d: string): string {
  if (!d) return ''
  let s = PREFIX + d.slice(0, 3)
  if (d.length > 3) s += `) ${d.slice(3, 6)}`
  if (d.length > 6) s += `-${d.slice(6, 8)}`
  if (d.length > 8) s += `-${d.slice(8, 10)}`
  return s
}

/** Позиция курсора сразу после n-й цифры национального номера. */
export function caretAfterDigit(display: string, n: number): number {
  if (!display) return 0
  if (n <= 0) return PREFIX.length
  let count = 0
  for (let i = PREFIX.length; i < display.length; i++) {
    if (/\d/.test(display[i])) {
      count += 1
      if (count === n) return i + 1
    }
  }
  return display.length
}

/** Сколько цифр национального номера стоит до позиции pos. */
export function digitsBefore(display: string, pos: number): number {
  let count = 0
  for (let i = PREFIX.length; i < Math.min(pos, display.length); i++) if (/\d/.test(display[i])) count += 1
  return count
}

export const isCompletePhone = (d: string) => d.length === 10

export const toE164 = (d: string) => (isCompletePhone(d) ? `+7${d}` : '')

/** Любой сохранённый номер → красивый вид, если это номер Казахстана. */
export function formatPhone(raw: string): string {
  const all = raw.replace(/\D/g, '')
  if (all.length === 11 && /^[78]/.test(all)) return formatNational(all.slice(1))
  if (all.length === 10) return formatNational(all)
  return raw
}
