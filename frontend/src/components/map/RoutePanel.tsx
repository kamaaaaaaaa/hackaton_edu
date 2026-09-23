import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { EvacuationPlan } from '@/store/plan'
import type { MappedPoint } from '@/api/types'
import { useI18n } from '@/i18n'
import { formatDistance, formatEta, formatMinutes } from '@/lib/format'
import { turnKind } from '@/lib/maneuver'
import { Odometer } from '@/components/ui/Odometer'
import { Spinner } from '@/components/ui/motion'
import { IconCheck, IconExternal, IconTimer, IconWalk } from '@/components/ui/icons'
import { TurnIcon } from './TurnIcon'

export type RouteStatus = 'idle' | 'loading' | 'done' | 'error'

/** Ссылка «открыть в навигаторе»: Google Maps, пешком. */
function navigatorUrl(plan: EvacuationPlan) {
  const u = new URL('https://www.google.com/maps/dir/')
  u.searchParams.set('api', '1')
  u.searchParams.set('origin', `${plan.from.lat},${plan.from.lng}`)
  u.searchParams.set('destination', `${plan.to.lat},${plan.to.lng}`)
  u.searchParams.set('travelmode', 'walking')
  return u.toString()
}

/** «Прибытие в 21:14» — пересчитываем раз в минуту. */
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

export function RoutePanel({
  status,
  plan,
  straight,
  reason = 'routing',
  activeStep = null,
  onStep,
  onPickCandidate,
}: {
  status: RouteStatus
  plan: EvacuationPlan | null
  straight: { point: MappedPoint; straightM: number } | null
  /** Почему маршрута нет: пункты ещё без координат или не ответил сервис маршрутов. */
  reason?: 'noPoints' | 'routing'
  activeStep?: number | null
  onStep?: (index: number | null) => void
  onPickCandidate?: (id: string) => void
}) {
  const { t } = useI18n()
  const now = useNow()

  if (status === 'loading') {
    return (
      <div className="card p-4" aria-live="polite">
        <div className="flex items-center gap-2 text-accent">
          <Spinner />
          <span className="cap !text-accent">{t('map.routing')}</span>
        </div>
        <div className="mt-4 space-y-2" aria-hidden>
          <div className="h-12 w-40 animate-pulse rounded-xl bg-paper" />
          <div className="h-4 w-56 animate-pulse rounded bg-paper" />
          <div className="h-4 w-44 animate-pulse rounded bg-paper" />
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="card p-4">
        <div className="cap !text-signal-ink">{t('map.route.unavailable')}</div>
        <p className="mt-1.5 text-sm text-muted">
          {reason === 'noPoints' ? t('map.route.reason.noPoints') : t('map.route.reason.routing')}
        </p>
        {straight && (
          <div className="mt-3 rounded-2xl border border-line p-3">
            <div className="cap">{t('map.route.straight')}</div>
            <div className="mt-1 font-display text-[15px] font-semibold">{straight.point.name}</div>
            <div className="text-xs text-muted">
              {straight.point.address} · {formatDistance(straight.straightM)}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (status !== 'done' || !plan) return null

  const steps = plan.maneuvers ?? []
  const others = plan.candidates.filter((c) => c.id !== plan.to.id)

  return (
    <section className="card overflow-hidden" aria-label={t('map.route.cap')}>
      <div className="flex items-center gap-2 border-b border-line px-3.5 py-2">
        <IconWalk width={16} height={16} className="text-accent" />
        <span className="cap">{t('map.route.cap')}</span>
        {plan.provider === 'cache' && <span className="chip ml-auto !py-0.5 text-[10px]">{t('map.route.cached')}</span>}
      </div>

      {/* Время · расстояние · прибытие */}
      <div className="px-3.5 pt-3">
        <div className="flex items-end gap-2">
          <Odometer
            value={formatMinutes(plan.timeSec)}
            className="text-[2.6rem] font-semibold leading-none tracking-tight text-ink"
          />
          <span className="mb-1 font-display text-base font-semibold text-ink">{t('unit.min')}</span>
          <div className="mb-1 ml-auto text-right">
            <div className="font-mono text-sm font-bold text-ink">{formatDistance(plan.lengthM)}</div>
            <div className="text-xs text-muted">
              {t('map.route.eta')} {formatEta(plan.timeSec, now)}
            </div>
          </div>
        </div>
        {plan.candidates.length > 1 && (
          <span className="badge-acid mt-2.5 inline-flex">
            {t('map.route.fastest')} {plan.candidates.length} {t('map.route.nearest')}
          </span>
        )}

        {/* Куда идём */}
        <div className="mt-2.5 flex gap-2.5 rounded-2xl bg-paper p-3">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-ink bg-acid">
            <TurnIcon kind="finish" className="h-3.5 w-3.5 text-ink" />
          </span>
          <div className="min-w-0">
            <div className="font-display text-[15px] font-semibold leading-snug text-ink">{plan.to.name}</div>
            <div className="text-[13px] text-muted">
              {plan.to.address} · {plan.to.district} р‑н
            </div>
            <div className="mt-1 text-[11px] font-semibold text-safe-ink">{t('map.point.official')}</div>
          </div>
        </div>
      </div>

      {/* Другие пункты — как «варианты маршрута» */}
      {others.length > 0 && (
        <div className="pt-3">
          <div className="cap px-3.5">{t('map.route.alternatives')}</div>
          <div className="mt-1.5 flex gap-2 overflow-x-auto px-3.5 pb-1 [scrollbar-width:none]">
            {plan.candidates.map((c) => {
              const active = c.id === plan.to.id
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={active}
                  onClick={() => onPickCandidate?.(c.id)}
                  className={`shrink-0 rounded-xl border px-2.5 py-1.5 text-left transition-colors ${
                    active ? 'border-ink bg-ink text-white' : 'border-line bg-surface hover:border-ink'
                  }`}
                >
                  <div className={`font-mono text-sm font-bold ${active ? 'text-acid' : 'text-ink'}`}>
                    {formatMinutes(c.timeSec)} {t('unit.min')}
                  </div>
                  <div className={`max-w-[130px] truncate text-[11px] ${active ? 'text-white/80' : 'text-muted'}`}>{c.name}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Пошагово */}
      {steps.length > 0 && (
        <div className="pt-3">
          <div className="flex items-center justify-between px-3.5">
            <span className="cap">
              {t('map.route.steps')} · {steps.length}
            </span>
            {activeStep !== null && (
              <button type="button" className="cap !text-accent" onClick={() => onStep?.(null)}>
                {t('map.route.showAll')}
              </button>
            )}
          </div>
          <ol className="mt-1.5">
            {steps.map((s, i) => {
              const kind = turnKind(s.type)
              const active = activeStep === i
              return (
                <li key={`${s.beginIndex}-${i}`}>
                  <button
                    type="button"
                    onClick={() => onStep?.(active ? null : i)}
                    aria-current={active ? 'step' : undefined}
                    className={`flex w-full items-center gap-2.5 border-l-[3px] px-3.5 py-2 text-left transition-colors ${
                      active ? 'border-accent bg-accent/5' : 'border-transparent hover:bg-paper'
                    }`}
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                        kind === 'finish' ? 'bg-acid text-ink' : active ? 'bg-accent text-white' : 'bg-paper text-ink'
                      }`}
                    >
                      <TurnIcon kind={kind} />
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] leading-snug text-ink">{s.instruction}</span>
                    {s.lengthM > 0 && (
                      <span className="shrink-0 font-mono text-xs font-semibold text-muted">{formatDistance(s.lengthM)}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      <div className="flex flex-col gap-2 p-3.5">
        <div className="grid grid-cols-2 gap-2">
          <Link to="/drill" className="btn btn-ink btn-sm">
            <IconTimer width={17} height={17} />
            {t('map.route.drillShort')}
          </Link>
          <a href={navigatorUrl(plan)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
            <IconExternal width={16} height={16} />
            {t('map.route.navigator')}
          </a>
        </div>
        <p className="cap flex items-center gap-1.5 !text-safe-ink">
          <IconCheck width={14} height={14} />
          {t('map.route.saved')}
        </p>
        <p className="text-[11px] text-faint">
          {plan.provider === 'tomtom' ? t('map.route.byTomtom') : t('map.route.byOsm')}
        </p>
      </div>
    </section>
  )
}
