import { lazy, Suspense, useMemo, useState } from 'react'
import { useChecklist } from '@/store/checklist'
import { computeReadiness, readFamilyFlags, READINESS_WEIGHTS } from '@/store/readiness'
import { CHECKLIST_CATEGORIES, CHECKLIST_ITEMS, itemText, type ChecklistCategory } from '@/data/checklist'
import { useI18n, type TranslationKey } from '@/i18n'
import { Odometer } from '@/components/ui/Odometer'
import { Magnetic } from '@/components/ui/Magnetic'
import { IconCheck, IconShare } from '@/components/ui/icons'

const ShareDialog = lazy(() =>
  import('@/components/share/ShareDialog').then((m) => ({ default: m.ShareDialog })),
)

const CAT_KEY: Record<ChecklistCategory, TranslationKey> = {
  bag: 'checklist.cat.bag',
  docs: 'checklist.cat.docs',
  home: 'checklist.cat.home',
  plan: 'checklist.cat.plan',
}

export function Checklist() {
  const { t, lang } = useI18n()
  const { checked, toggle, reset, doneCount, total } = useChecklist()
  const [shareOpen, setShareOpen] = useState(false)
  const flags = useMemo(() => readFamilyFlags(), [])
  const readiness = computeReadiness(checked, flags.hasGroup, flags.hasMeeting)

  const parts: { key: TranslationKey; value: number; max: number }[] = [
    { key: 'readiness.part.checklist', value: readiness.checklist, max: READINESS_WEIGHTS.checklist },
    { key: 'readiness.part.group', value: readiness.group, max: READINESS_WEIGHTS.group },
    { key: 'readiness.part.meeting', value: readiness.meeting, max: READINESS_WEIGHTS.meeting },
  ]

  return (
    <div className="container-px py-8 md:py-12">
      <header className="max-w-2xl">
        <span className="cap">{t('checklist.cap')}</span>
        <h1 className="mt-2 font-display text-display font-bold">{t('checklist.title')}</h1>
        <p className="mt-2 text-muted">{t('checklist.subtitle')}</p>
      </header>

      {/* Индекс готовности */}
      <section className="card mt-8 overflow-hidden">
        <div className="grid gap-6 p-5 md:grid-cols-[auto_1fr] md:items-end md:p-7">
          <div>
            <div className="cap">{t('readiness.cap')}</div>
            <Odometer value={readiness.total} suffix="%" className="mt-2 text-[clamp(4.5rem,18vw,8.5rem)] font-semibold tracking-tight" />
          </div>
          <div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-paper" role="progressbar" aria-valuenow={readiness.total} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="h-full rounded-full bg-acid transition-transform duration-700 ease-out"
                style={{ width: '100%', transform: `translateX(${readiness.total - 100}%)` }}
              />
            </div>
            <div className="mt-4 cap">{t('readiness.how')}</div>
            <ul className="mt-2 grid gap-2 sm:grid-cols-3">
              {parts.map((p) => (
                <li key={p.key} className="rounded-2xl border border-line px-3.5 py-2.5">
                  <div className="text-sm font-semibold">{t(p.key)}</div>
                  <div className="font-mono text-lg">
                    {p.value}
                    <span className="text-faint">/{p.max}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 md:px-7">
          <span className="cap">
            {doneCount} {t('checklist.of')} {total}
          </span>
          <Magnetic>
            <button type="button" onClick={() => setShareOpen(true)} className="btn btn-primary btn-sm">
              <IconShare width={17} height={17} />
              {t('share.cta')}
            </button>
          </Magnetic>
        </div>
        {readiness.total === 100 && (
          <p className="border-t border-line bg-acid px-5 py-3 text-sm font-semibold text-ink md:px-7">{t('readiness.done')}</p>
        )}
      </section>

      {/* Пункты */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {CHECKLIST_CATEGORIES.map((cat) => (
          <section key={cat} className="card p-5">
            <h2 className="font-display text-base font-semibold">{t(CAT_KEY[cat])}</h2>
            <div className="mt-3 space-y-2">
              {CHECKLIST_ITEMS.filter((i) => i.category === cat).map((item) => {
                const on = Boolean(checked[item.id])
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(item.id)}
                    className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-ink/25"
                  >
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition-colors ${
                        on ? 'border-ink bg-acid' : 'border-line bg-surface'
                      }`}
                    >
                      {on && <IconCheck width={16} height={16} strokeWidth={2.6} className="text-ink" />}
                    </span>
                    <span className={`text-[15px] ${on ? 'text-muted line-through' : 'text-ink'}`}>
                      {itemText(item, lang)}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="cap">{t('checklist.stored')}</p>
        <button type="button" onClick={reset} className="text-xs font-semibold text-muted hover:text-signal-ink">
          {t('checklist.reset')}
        </button>
      </div>

      {shareOpen && (
        <Suspense fallback={null}>
          <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} percent={readiness.total} />
        </Suspense>
      )}
    </div>
  )
}
