import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAlert } from '@/store/alert'
import { useI18n, type TranslationKey } from '@/i18n'
import { readStoredHouse } from '@/store/house'
import { IconAlert, IconRoute } from './icons'

const RULES: TranslationKey[] = ['alert.rule1', 'alert.rule2', 'alert.rule3']

/** Полноэкранный баннер тревоги. Показывается поверх всего при active. */
export function AlertBanner() {
  const { active, dismiss } = useAlert()
  const { t } = useI18n()
  const navigate = useNavigate()

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    try {
      navigator.vibrate?.([300, 120, 300, 120, 600])
    } catch {
      /* нет поддержки вибрации */
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [active, dismiss])

  if (!active) return null
  const hasHouse = Boolean(readStoredHouse())

  const goRoute = () => {
    dismiss()
    navigate('/map', { state: { showRoute: true } })
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={t('alert.title')}
      className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto px-5 py-8 text-white animate-fade-in"
    >
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,#ef4444_0%,#c81e1e_58%,#7f1d1d_100%)]" />
      <div className="relative w-full max-w-lg text-center animate-scale-in">
        <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 animate-alert-pulse">
          <IconAlert width={34} height={34} strokeWidth={2} />
        </div>
        <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
          {t('alert.title')}
        </h1>
        <p className="mt-3 text-lg font-semibold text-white/95">{t('alert.instruction')}</p>

        <ul className="mx-auto mt-6 max-w-sm space-y-2.5 text-left text-[15px] text-white/95">
          {RULES.map((rule) => (
            <li key={rule} className="flex items-start gap-2.5 rounded-2xl bg-white/10 px-4 py-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
              {t(rule)}
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-col gap-3">
          <button
            type="button"
            onClick={goRoute}
            className="btn bg-white text-risk-high hover:bg-white/90"
          >
            <IconRoute width={20} height={20} />
            {t('alert.routeCta')}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="btn border border-white/40 text-white hover:bg-white/10"
          >
            {t('alert.dismiss')}
          </button>
        </div>

        {!hasHouse && <p className="mt-3 text-xs text-white/80">{t('alert.noPoint')}</p>}
        <p className="mt-5 text-[11px] uppercase tracking-[0.2em] text-white/70">
          {t('alert.source')}
        </p>
      </div>
    </div>
  )
}
