import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { usePlan } from '@/store/plan'
import { readDrillBest } from '@/store/readiness'
import { writeJSON, STORAGE_KEYS } from '@/lib/storage'
import { formatClock } from '@/lib/format'
import { trackEvent } from '@/api/analytics'
import { useI18n, type TranslationKey } from '@/i18n'
import { Odometer } from '@/components/ui/Odometer'
import { Magnetic } from '@/components/ui/Magnetic'
import { OfflinePlan } from '@/components/map/OfflinePlan'
import { IconArrowRight, IconCheck, IconMap, IconRoute, IconTimer } from '@/components/ui/icons'

type Phase = 'intro' | 'prep' | 'choose' | 'walk' | 'result'
const PREP_LIMIT = 60
const STEPS: TranslationKey[] = ['drill.step.cover', 'drill.step.bag', 'drill.step.out']

/** Тикающие секунды с момента start (null — стоп). */
function useElapsed(start: number | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (start === null) return
    const id = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [start])
  return start === null ? 0 : Math.max(0, (now - start) / 1000)
}

const slide = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
}

export function Drill() {
  const { t } = useI18n()
  const plan = usePlan()
  const [phase, setPhase] = useState<Phase>('intro')
  const [prepStart, setPrepStart] = useState<number | null>(null)
  const [prepSec, setPrepSec] = useState(0)
  const [timeUp, setTimeUp] = useState(false)
  const [steps, setSteps] = useState<Record<string, boolean>>({})
  const [mode, setMode] = useState<'walk' | 'estimate'>('estimate')
  const [walkStart, setWalkStart] = useState<number | null>(null)
  const [roadSec, setRoadSec] = useState(0)
  const [best, setBest] = useState<number | null>(() => readDrillBest())
  const [prevBest, setPrevBest] = useState<number | null>(null)
  const finished = useRef(false)

  const prepElapsed = useElapsed(phase === 'prep' ? prepStart : null)
  const walkElapsed = useElapsed(phase === 'walk' ? walkStart : null)
  const prepLeft = Math.max(0, PREP_LIMIT - prepElapsed)

  const start = () => {
    setSteps({})
    setTimeUp(false)
    setPrepStart(Date.now())
    setPhase('prep')
    finished.current = false
    try {
      navigator.vibrate?.([200, 100, 200])
    } catch {
      /* нет вибрации */
    }
    trackEvent('drill_started')
  }

  const leaveBuilding = (limitReached = false) => {
    setPrepSec(limitReached ? PREP_LIMIT : Math.min(PREP_LIMIT, prepElapsed))
    setTimeUp(limitReached)
    setPhase('choose')
  }

  useEffect(() => {
    if (phase === 'prep' && prepLeft <= 0) leaveBuilding(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, prepLeft])

  const finish = (road: number, chosen: 'walk' | 'estimate') => {
    if (finished.current) return
    finished.current = true
    setMode(chosen)
    setRoadSec(road)
    const total = prepSec + road
    setPrevBest(best)
    if (best === null || total < best) {
      setBest(total)
      writeJSON(STORAGE_KEYS.drillBest, total)
    }
    setPhase('result')
    trackEvent('drill_finished', { mode: chosen, seconds: Math.round(total) })
  }

  const total = prepSec + roadSec
  const isNewBest = prevBest === null || total < prevBest

  return (
    <div className="container-px py-8 md:py-12">
      <header className="max-w-2xl">
        <span className="cap">{t('drill.cap')}</span>
      </header>

      <AnimatePresence mode="wait">
        {/* ---------- Вступление ---------- */}
        {phase === 'intro' && (
          <m.section key="intro" {...slide} className="mt-4">
            <h1 className="font-display text-mega font-bold">{t('drill.title')}</h1>
            <p className="mt-4 max-w-xl text-lg text-muted">{t('drill.subtitle')}</p>
            {plan ? (
              <div className="mt-8 grid gap-4 md:grid-cols-[1fr_1fr] md:items-start">
                <OfflinePlan plan={plan} />
                <div className="flex flex-col gap-3">
                  <Magnetic className="w-full">
                    <button type="button" onClick={start} className="btn btn-signal min-h-[64px] w-full text-lg">
                      <IconTimer width={22} height={22} />
                      {t('drill.start')}
                    </button>
                  </Magnetic>
                  <p className="cap">
                    {t('drill.result.routeClean')}: {formatClock(plan.timeSec)}
                  </p>
                  {best !== null && (
                    <p className="cap">
                      {t('drill.result.best')}: {formatClock(best)}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="card mt-8 max-w-xl p-5">
                <p className="text-[15px]">{t('drill.needRoute')}</p>
                <Link to="/map" className="btn btn-primary mt-4">
                  <IconMap width={18} height={18} />
                  {t('action.openMap')}
                </Link>
              </div>
            )}
          </m.section>
        )}

        {/* ---------- 60 секунд в здании ---------- */}
        {phase === 'prep' && (
          <m.section key="prep" {...slide} className="mx-auto mt-4 max-w-xl">
            <div className="cap">{t('drill.phase1')}</div>
            <div
              className={`mt-2 font-mono text-[clamp(5rem,26vw,10rem)] font-semibold leading-none tracking-tight tabular-nums ${
                prepLeft <= 10 ? 'text-signal-ink' : 'text-ink'
              }`}
              aria-live="polite"
            >
              {formatClock(Math.ceil(prepLeft))}
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-paper">
              <div
                className="h-full rounded-full bg-ink"
                style={{ width: '100%', transform: `translateX(${-(prepElapsed / PREP_LIMIT) * 100}%)` }}
              />
            </div>
            <div className="mt-6 space-y-2">
              {STEPS.map((key) => {
                const on = Boolean(steps[key])
                return (
                  <button
                    key={key}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => setSteps((s) => ({ ...s, [key]: !s[key] }))}
                    className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 text-left"
                  >
                    <span className={`grid h-7 w-7 place-items-center rounded-lg border-2 ${on ? 'border-ink bg-acid' : 'border-line'}`}>
                      {on && <IconCheck width={17} height={17} strokeWidth={2.6} />}
                    </span>
                    <span className="text-[15px] font-medium">{t(key)}</span>
                  </button>
                )
              })}
            </div>
            <button type="button" onClick={() => leaveBuilding(false)} className="btn btn-acid mt-6 min-h-[64px] w-full text-lg">
              {t('drill.outside')}
              <IconArrowRight width={22} height={22} />
            </button>
          </m.section>
        )}

        {/* ---------- Как считаем дорогу ---------- */}
        {phase === 'choose' && plan && (
          <m.section key="choose" {...slide} className="mx-auto mt-4 max-w-xl">
            <div className="cap">{t('drill.phase2')}</div>
            {timeUp && <p className="mt-2 text-sm font-semibold text-signal-ink">{t('drill.timeUp')}</p>}
            <div className="mt-2 font-mono text-5xl font-semibold">{formatClock(prepSec)}</div>
            <div className="cap">{t('drill.result.prep')}</div>
            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={() => {
                  setWalkStart(Date.now())
                  setPhase('walk')
                }}
                className="btn btn-primary min-h-[60px] w-full"
              >
                <IconRoute width={20} height={20} />
                {t('drill.walk')}
              </button>
              <button type="button" onClick={() => finish(plan.timeSec, 'estimate')} className="btn btn-ghost min-h-[60px] w-full">
                <IconTimer width={20} height={20} />
                {t('drill.estimate')} · {formatClock(plan.timeSec)}
              </button>
            </div>
          </m.section>
        )}

        {/* ---------- Иду по маршруту ---------- */}
        {phase === 'walk' && plan && (
          <m.section key="walk" {...slide} className="mx-auto mt-4 max-w-xl">
            <div className="cap">{t('drill.walking')}</div>
            <div className="mt-2 font-mono text-[clamp(5rem,26vw,10rem)] font-semibold leading-none tabular-nums" aria-live="off">
              {formatClock(walkElapsed)}
            </div>
            <div className="mt-4">
              <OfflinePlan plan={plan} />
            </div>
            <button type="button" onClick={() => finish(walkElapsed, 'walk')} className="btn btn-acid mt-6 min-h-[64px] w-full text-lg">
              <IconCheck width={22} height={22} />
              {t('drill.arrived')}
            </button>
          </m.section>
        )}

        {/* ---------- Результат ---------- */}
        {phase === 'result' && plan && (
          <m.section key="result" {...slide} className="mt-4">
            <div className="cap">{t('drill.result.cap')}</div>
            <h1 className="mt-2 font-display text-display font-bold">
              {mode === 'walk' ? t('drill.result.real') : t('drill.result.would')}
            </h1>
            <Odometer value={formatClock(total)} className="mt-3 text-[clamp(4.5rem,22vw,9rem)] font-semibold tracking-tight" />
            <div className="mt-3">
              {isNewBest ? (
                <span className="badge-acid">{prevBest === null ? t('drill.result.first') : t('drill.result.newBest')}</span>
              ) : (
                <span className="chip">
                  {t('drill.result.best')}: {formatClock(prevBest ?? 0)}
                </span>
              )}
            </div>

            <div className="mt-8 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
              {(
                [
                  ['drill.result.prep', prepSec],
                  ['drill.result.road', roadSec],
                  ['drill.result.routeClean', plan.timeSec],
                ] as const
              ).map(([key, sec]) => (
                <div key={key} className="bg-surface p-5">
                  <div className="cap">{t(key)}</div>
                  <div className="mt-1 font-mono text-3xl font-semibold">{formatClock(sec)}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={start} className="btn btn-ink">
                <IconTimer width={18} height={18} />
                {t('action.again')}
              </button>
              <Link to="/map" className="btn btn-ghost">
                <IconMap width={18} height={18} />
                {t('action.openMap')}
              </Link>
            </div>
          </m.section>
        )}
      </AnimatePresence>
    </div>
  )
}
