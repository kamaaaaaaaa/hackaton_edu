import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { useAlert } from '@/store/alert'
import { usePlan } from '@/store/plan'
import { useI18n, type TranslationKey } from '@/i18n'
import { formatClock, formatMinutes } from '@/lib/format'
import { IconRoute } from '@/components/ui/icons'
import { FitText } from '@/components/ui/FitText'

const RULES: TranslationKey[] = ['alert.rule1', 'alert.rule2', 'alert.rule3']

/**
 * Экран тревоги: интерфейс встряхивается (класс .quake на оболочке — в Layout),
 * затем красный экран с пульсом, крупным таймером и маршрутом к пункту.
 */
export function AlertOverlay() {
  const { active, startedAt, dismiss } = useAlert()
  const plan = usePlan()
  const navigate = useNavigate()
  const { t } = useI18n()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    try {
      navigator.vibrate?.([400, 150, 400, 150, 900])
    } catch {
      /* вибрация не поддерживается */
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismiss()
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearInterval(id)
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [active, dismiss])

  const elapsed = startedAt ? (now - startedAt) / 1000 : 0

  const goRoute = () => {
    dismiss()
    navigate('/map')
  }

  return (
    <AnimatePresence>
      {active && (
        <m.div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="alert-title"
          className="fixed inset-0 z-[1000] overflow-y-auto bg-signal text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.35, duration: 0.25 } }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          {/* Пульс фона: только opacity */}
          <div className="pointer-events-none absolute inset-0 bg-[#9E1406] animate-signal-pulse" />
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          <div
            className="relative mx-auto flex min-h-full max-w-lg flex-col px-4 pb-6 pt-5 sm:px-5"
            style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}
          >
            <div className="flex items-center gap-2 self-start rounded-full bg-black/25 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-white animate-blink" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em]">{t('alert.cap')}</span>
            </div>

            {/* «ЗЕМЛЕТРЯСЕНИЕ» — 13 букв широкого Unbounded: всегда одной строкой,
                шрифт сам уменьшается под ширину экрана (FitText) */}
            <FitText
              id="alert-title"
              className="mt-4 font-display text-[clamp(20px,7vw,40px)] font-extrabold uppercase leading-none"
            >
              {t('alert.title')}
            </FitText>
            <p className="mt-2.5 text-lg font-semibold leading-snug sm:text-xl">{t('alert.instruction')}</p>

            <div className="mt-5 rounded-sheet bg-black/25 p-4">
              <div className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white/85">
                {t('alert.elapsed')}
              </div>
              <div className="mt-1 font-mono text-5xl font-semibold leading-none tabular-nums sm:text-6xl" aria-live="off">
                {formatClock(elapsed)}
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {RULES.map((rule) => (
                <li key={rule} className="flex items-start gap-3 rounded-2xl bg-black/25 px-4 py-2.5 text-sm font-medium">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                  {t(rule)}
                </li>
              ))}
            </ul>

            <div className="mt-auto flex flex-col gap-2.5 pt-6">
              <button
                type="button"
                onClick={goRoute}
                className="btn min-h-[52px] flex-wrap gap-x-2 gap-y-0.5 bg-white px-4 text-[15px] text-ink hover:bg-white/90"
              >
                <IconRoute width={19} height={19} />
                {t('alert.routeCta')}
                {plan && (
                  <span className="font-mono text-sm text-muted">
                    · {formatMinutes(plan.timeSec)} {t('unit.min')}
                  </span>
                )}
              </button>
              {!plan && (
                <p className="rounded-2xl bg-black/25 px-4 py-2.5 text-sm font-medium">{t('alert.noPlan')}</p>
              )}
              <button type="button" onClick={dismiss} className="btn border border-white/60 text-white hover:bg-white/10">
                {t('alert.dismiss')}
              </button>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
