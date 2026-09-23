import { useI18n, type Lang } from '@/i18n'

const OPTIONS: { code: Lang; labelKey: 'lang.ru' | 'lang.kk' }[] = [
  { code: 'ru', labelKey: 'lang.ru' },
  { code: 'kk', labelKey: 'lang.kk' },
]

/** Переключатель языка RU ↔ ҚАЗ. */
export function LangSwitch() {
  const { lang, setLang, t } = useI18n()
  return (
    <div
      className="inline-flex items-center rounded-full border border-line bg-white p-0.5"
      role="group"
      aria-label={t('lang.switch')}
    >
      {OPTIONS.map((opt) => {
        const active = lang === opt.code
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => setLang(opt.code)}
            aria-pressed={active}
            className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
              active ? 'bg-navy-700 text-white' : 'text-subink hover:text-navy-700'
            }`}
          >
            {t(opt.labelKey)}
          </button>
        )
      })}
    </div>
  )
}
