import { useChecklist } from '@/store/checklist'
import {
  CHECKLIST_CATEGORIES,
  CHECKLIST_ITEMS,
  itemText,
  type ChecklistCategory,
} from '@/data/checklist'
import { useI18n, type TranslationKey } from '@/i18n'

const CAT_KEY: Record<ChecklistCategory, TranslationKey> = {
  bag: 'checklist.cat.bag',
  docs: 'checklist.cat.docs',
  home: 'checklist.cat.home',
  plan: 'checklist.cat.plan',
}

function CheckMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12 4.5 4.5L19 7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Checklist() {
  const { t, lang } = useI18n()
  const { checked, toggle, reset, doneCount, total, percent } = useChecklist()

  return (
    <div className="container-px py-6 md:py-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
          {t('checklist.title')}
        </h1>
        <p className="mt-2 text-subink">{t('checklist.subtitle')}</p>
      </header>

      {/* Индекс готовности */}
      <div className="mt-6 card overflow-hidden">
        <div className="grid gap-5 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-5xl font-extrabold text-navy-700">{percent}</span>
            <span className="font-display text-xl font-bold text-navy-300">%</span>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm font-semibold text-subink">
              <span>{t('checklist.index')}</span>
              <span>
                {doneCount} {t('checklist.of')} {total}
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-navy-sheen transition-[width] duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
        {percent === 100 && (
          <div className="border-t border-line bg-risk-low/5 px-6 py-4">
            <p className="font-display font-bold text-risk-low">{t('checklist.done.title')}</p>
            <p className="mt-1 text-sm text-subink">{t('checklist.done.body')}</p>
          </div>
        )}
      </div>

      {/* Категории */}
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {CHECKLIST_CATEGORIES.map((cat) => {
          const items = CHECKLIST_ITEMS.filter((i) => i.category === cat)
          return (
            <section key={cat} className="card p-5">
              <h2 className="font-display text-base font-bold text-ink">{t(CAT_KEY[cat])}</h2>
              <div className="mt-3 space-y-2">
                {items.map((item) => {
                  const isChecked = Boolean(checked[item.id])
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      onClick={() => toggle(item.id)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-left transition hover:border-navy-300"
                    >
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition ${
                          isChecked ? 'border-navy-700 bg-navy-700' : 'border-line bg-white'
                        }`}
                      >
                        {isChecked && <CheckMark />}
                      </span>
                      <span
                        className={`text-sm ${isChecked ? 'text-subink line-through' : 'text-ink'}`}
                      >
                        {itemText(item, lang)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-[11px] text-subink/80">{t('checklist.stored')}</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-subink transition hover:text-risk-high"
        >
          {t('checklist.reset')}
        </button>
      </div>
    </div>
  )
}
