// Пошаговые подсказки маршрута (Valhalla, язык ru-RU): приводим текст в
// порядок и определяем, какую стрелку рисовать для шага.

// \b в JS не работает с кириллицей — границы слов задаём пробелами
const CARDINAL = /^Идите (северо-восток|северо-запад|юго-восток|юго-запад|север|восток|юг|запад)(?=\s|$)/
const STREET_TYPES: [RegExp, string][] = [
  [/(^|\s)(по|на) улица\s/g, '$1$2 ул. '],
  [/(^|\s)(по|на) проспект\s/g, '$1$2 пр. '],
  [/(^|\s)(по|на) переулок\s/g, '$1$2 пер. '],
  [/(^|\s)(по|на) бульвар\s/g, '$1$2 б-р '],
  [/(^|\s)(по|на) микрорайон\s/g, '$1$2 мкр '],
]

/** «Идите запад по улица Пятницкого.» → «Идите на запад по ул. Пятницкого» */
export function prettifyInstruction(text: string): string {
  let s = text.trim().replace(/\.\s*$/, '')
  s = s.replace(CARDINAL, 'Идите на $1')
  for (const [re, to] of STREET_TYPES) s = s.replace(re, to)
  return s
}

export type TurnKind =
  | 'start'
  | 'finish'
  | 'straight'
  | 'slight-right'
  | 'right'
  | 'sharp-right'
  | 'slight-left'
  | 'left'
  | 'sharp-left'
  | 'uturn'
  | 'stairs'

/** Тип манёвра Valhalla → вид стрелки. */
export function turnKind(type: number): TurnKind {
  switch (type) {
    case 1:
    case 2:
    case 3:
      return 'start'
    case 4:
    case 5:
    case 6:
      return 'finish'
    case 9:
    case 23:
      return 'slight-right'
    case 10:
    case 18:
    case 20:
    case 36:
      return 'right'
    case 11:
      return 'sharp-right'
    case 16:
    case 24:
      return 'slight-left'
    case 15:
    case 19:
    case 21:
    case 37:
      return 'left'
    case 14:
      return 'sharp-left'
    case 12:
    case 13:
      return 'uturn'
    case 39:
    case 40:
    case 41:
      return 'stairs'
    default:
      return 'straight'
  }
}
