import type { Lang } from '@/i18n'

export type ChecklistCategory = 'bag' | 'docs' | 'home' | 'plan'

export interface ChecklistItem {
  id: string
  category: ChecklistCategory
  ru: string
  kk: string
}

export const CHECKLIST_CATEGORIES: ChecklistCategory[] = ['bag', 'docs', 'home', 'plan']

// 15 пунктов готовности. Текст пунктов хранится сразу двуязычно.
export const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'water', category: 'bag', ru: 'Запас воды: 3 литра на человека', kk: 'Су қоры: адамға 3 литр' },
  { id: 'food', category: 'bag', ru: 'Еда: консервы и батончики на 3 дня', kk: 'Тамақ: консерві мен батончик 3 күнге' },
  { id: 'flashlight', category: 'bag', ru: 'Фонарик и запасные батарейки', kk: 'Қол шам және қосымша батарея' },
  { id: 'powerbank', category: 'bag', ru: 'Заряженный повербанк', kk: 'Зарядталған повербанк' },
  { id: 'firstaid', category: 'bag', ru: 'Аптечка и личные лекарства', kk: 'Дәрі қобдиша және жеке дәрілер' },
  { id: 'whistle', category: 'bag', ru: 'Свисток, чтобы позвать на помощь', kk: 'Көмекке шақыратын ысқырық' },

  { id: 'docs', category: 'docs', ru: 'Копии документов (удостоверение, паспорт)', kk: 'Құжат көшірмелері (жеке куәлік, төлқұжат)' },
  { id: 'cash', category: 'docs', ru: 'Наличные мелкими купюрами', kk: 'Ұсақ купюрамен қолма-қол ақша' },
  { id: 'contacts', category: 'docs', ru: 'Список важных телефонов на бумаге', kk: 'Маңызды телефондар тізімі қағазда' },

  { id: 'shelf', category: 'home', ru: 'Закрепить шкафы и полки к стене', kk: 'Шкаф пен сөрелерді қабырғаға бекіту' },
  { id: 'heavy', category: 'home', ru: 'Убрать тяжёлое с верхних полок', kk: 'Ауыр заттарды жоғарғы сөреден алу' },
  { id: 'shutoff', category: 'home', ru: 'Знать, где перекрыть газ, воду и электричество', kk: 'Газ, су, токты қайдан жабуды білу' },
  { id: 'shoes', category: 'home', ru: 'Крепкая обувь и перчатки у кровати', kk: 'Төсек жанында берік аяқкиім мен қолғап' },

  { id: 'meeting', category: 'plan', ru: 'Договориться о точке встречи с семьёй', kk: 'Отбасымен кездесу орнын келісу' },
  { id: 'route', category: 'plan', ru: 'Знать маршрут до пункта сбора', kk: 'Жиналу орнына бағытты білу' },
]

export function itemText(item: ChecklistItem, lang: Lang): string {
  return lang === 'kk' ? item.kk : item.ru
}
