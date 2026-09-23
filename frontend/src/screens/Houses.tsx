import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { getDemoHouses, getHouseAnalysis, toHouse, type DemoHouse } from '@/api/houses'
import { getPointById } from '@/api'
import type { RiskLevel } from '@/api/types'
import { useI18n, type TranslationKey } from '@/i18n'
import { assessRisk } from '@/lib/risk'
import { formatDistance, formatMinutes, materialLabel, shortAddress } from '@/lib/format'
import { AiAnalysis } from '@/components/houses/AiAnalysis'
import { RISK_BADGE, RISK_DOT } from '@/components/houses/riskStyle'
import { Reveal } from '@/components/ui/motion'
import { IconArrowRight, IconChevronDown, IconSparkle, IconWalk } from '@/components/ui/icons'

type RiskFilter = 'all' | RiskLevel | 'none'
type Sort = 'risk' | 'floors' | 'route'

const LEVEL_KEY: Record<RiskLevel, TranslationKey> = {
  high: 'house.risk.high',
  mid: 'house.risk.mid',
  low: 'house.risk.low',
}
const RISK_ORDER: Record<string, number> = { high: 0, mid: 1, low: 2, none: 3 }

interface Row {
  house: DemoHouse
  level: RiskLevel | null
  score: number | null
  pointName: string | null
}

export function Houses() {
  const { t } = useI18n()
  const [risk, setRisk] = useState<RiskFilter>('all')
  const [district, setDistrict] = useState<string>('all')
  const [sort, setSort] = useState<Sort>('risk')
  const [open, setOpen] = useState<string | null>(null)

  const rows = useMemo<Row[]>(
    () =>
      getDemoHouses().map((house) => {
        const a = assessRisk(toHouse(house))
        return {
          house,
          level: a.level,
          score: a.score,
          pointName: house.route ? (getPointById(house.route.pointId)?.name ?? null) : null,
        }
      }),
    [],
  )
  const districts = useMemo(
    () => [...new Set(rows.map((r) => r.house.district).filter((d): d is string => Boolean(d)))].sort(),
    [rows],
  )
  const counts = useMemo(() => {
    const c: Record<RiskFilter, number> = { all: rows.length, high: 0, mid: 0, low: 0, none: 0 }
    rows.forEach((r) => (c[r.level ?? 'none'] += 1))
    return c
  }, [rows])

  const visible = rows
    .filter((r) => risk === 'all' || (r.level ?? 'none') === risk)
    .filter((r) => district === 'all' || r.house.district === district)
    .sort((a, b) => {
      if (sort === 'floors') return (b.house.floors ?? 0) - (a.house.floors ?? 0)
      if (sort === 'route') return (a.house.route?.timeSec ?? 1e9) - (b.house.route?.timeSec ?? 1e9)
      return RISK_ORDER[a.level ?? 'none'] - RISK_ORDER[b.level ?? 'none'] || (b.score ?? -1) - (a.score ?? -1)
    })

  const riskChips: { key: RiskFilter; label: string; dot?: string }[] = [
    { key: 'all', label: t('houses.filter.all') },
    { key: 'high', label: t('house.risk.high'), dot: RISK_DOT.high },
    { key: 'mid', label: t('house.risk.mid'), dot: RISK_DOT.mid },
    { key: 'low', label: t('house.risk.low'), dot: RISK_DOT.low },
    { key: 'none', label: t('houses.filter.none'), dot: 'bg-faint' },
  ]
  const sorts: { key: Sort; label: string }[] = [
    { key: 'risk', label: t('houses.sort.risk') },
    { key: 'floors', label: t('houses.sort.floors') },
    { key: 'route', label: t('houses.sort.route') },
  ]

  const chip = (active: boolean) =>
    `inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors ${
      active ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink hover:border-ink'
    }`

  return (
    <div className="container-px py-8 md:py-12">
      <p className="cap">{t('houses.cap')}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-display font-semibold leading-none">{t('houses.title')}</h1>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-5xl font-semibold leading-none">{rows.length}</span>
          <span className="cap">{t('houses.count')}</span>
        </div>
      </div>
      <p className="mt-3 max-w-2xl text-muted">{t('houses.subtitle')}</p>

      {/* ---------- Фильтры ---------- */}
      <div className="mt-6 space-y-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
          {riskChips.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={risk === c.key}
              disabled={counts[c.key] === 0}
              onClick={() => setRisk(c.key)}
              className={`${chip(risk === c.key)} disabled:cursor-default disabled:opacity-40`}
            >
              {c.dot && <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />}
              {c.label}
              <span className={`font-mono text-xs ${risk === c.key ? 'text-acid' : 'text-muted'}`}>{counts[c.key]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="district">
            {t('houses.district')}
          </label>
          <select
            id="district"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="field !min-h-[40px] !w-auto !rounded-full !py-1.5 text-sm font-semibold"
          >
            <option value="all">{t('houses.district.all')}</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <div
            className="flex max-w-full overflow-x-auto rounded-full border border-line bg-surface p-0.5 [scrollbar-width:none]"
            role="group"
            aria-label={t('houses.sort')}
          >
            {sorts.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={sort === s.key}
                onClick={() => setSort(s.key)}
                className={`min-h-[36px] shrink-0 whitespace-nowrap rounded-full px-3 text-xs font-semibold transition-colors ${
                  sort === s.key ? 'bg-ink text-white' : 'text-muted hover:text-ink'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Карточки ---------- */}
      {visible.length === 0 ? (
        <p className="card mt-6 p-6 text-center text-muted">{t('houses.empty')}</p>
      ) : (
        <m.ul layout className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {visible.map((r, i) => {
              const h = r.house
              const analysis = getHouseAnalysis(h.id)
              const expanded = open === h.id
              return (
                <m.li
                  key={h.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.03 }}
                  className="card flex flex-col overflow-hidden"
                >
                  <div className={`h-1.5 ${r.level ? RISK_DOT[r.level] : 'bg-line'}`} />
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="cap">{h.district ? `${h.district} р‑н` : '—'}</div>
                        <h2 className="mt-1 font-display text-lg font-semibold leading-snug">{shortAddress(h.address)}</h2>
                        {h.addressKk && <div className="truncate text-xs text-faint">{h.addressKk}</div>}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] font-bold uppercase ${
                          r.level ? RISK_BADGE[r.level] : 'bg-paper text-muted'
                        }`}
                      >
                        {r.level ? t(LEVEL_KEY[r.level]) : t('houses.filter.none')}
                      </span>
                    </div>

                    <dl className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-2xl bg-paper px-3 py-2.5">
                        <dt className="cap">{t('house.floors')}</dt>
                        <dd className="mt-0.5 font-display text-3xl font-semibold leading-none">{h.floors ?? '—'}</dd>
                      </div>
                      <div className="rounded-2xl bg-paper px-3 py-2.5">
                        <dt className="cap">{t('house.year')}</dt>
                        <dd className={`mt-1 font-mono text-base font-bold ${h.year ? 'text-ink' : 'text-faint'}`}>
                          {h.year ? `${h.yearApprox ? '≈' : ''}${h.year}` : '—'}
                        </dd>
                      </div>
                      <div className="rounded-2xl bg-paper px-3 py-2.5">
                        <dt className="cap">{t('house.material')}</dt>
                        <dd className={`mt-1 truncate text-sm font-semibold ${h.material ? 'text-ink' : 'text-faint'}`}>
                          {materialLabel(h.material)?.split(' (')[0] ?? '—'}
                        </dd>
                      </div>
                    </dl>

                    {h.route && (
                      <div className="mt-3 flex items-center gap-2.5 text-sm">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-acid text-ink">
                          <IconWalk width={17} height={17} />
                        </span>
                        <span className="min-w-0">
                          <span className="font-semibold text-ink">
                            {formatMinutes(h.route.timeSec)} {t('unit.min')}
                          </span>
                          <span className="text-muted">
                            {' '}
                            · {formatDistance(h.route.lengthM)} {t('houses.toPoint')}
                          </span>
                          {r.pointName && <span className="block truncate text-xs text-muted">{r.pointName}</span>}
                        </span>
                      </div>
                    )}

                    {analysis && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setOpen(expanded ? null : h.id)}
                          aria-expanded={expanded}
                          className="flex w-full items-start gap-2 rounded-2xl border border-accent/20 bg-accent/[0.04] p-3 text-left"
                        >
                          <IconSparkle width={16} height={16} className="mt-0.5 shrink-0 text-accent" />
                          <span className={`flex-1 text-sm text-ink ${expanded ? '' : 'line-clamp-2'}`}>
                            {expanded ? t('houses.hide') : analysis.summary}
                          </span>
                          <IconChevronDown
                            width={16}
                            height={16}
                            className={`mt-0.5 shrink-0 text-accent transition-transform ${expanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                        <AnimatePresence initial={false}>
                          {expanded && (
                            <m.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-2">
                                <AiAnalysis analysis={analysis} compact />
                              </div>
                            </m.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                      <a
                        href={`https://www.openstreetmap.org/${h.sourceRef}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[11px] text-faint underline-offset-2 hover:text-ink hover:underline"
                      >
                        OSM {h.sourceRef}
                      </a>
                      <Link to={`/map?house=${encodeURIComponent(h.id)}`} className="btn btn-ink btn-sm">
                        {t('houses.onMap')}
                        <IconArrowRight width={16} height={16} />
                      </Link>
                    </div>
                  </div>
                </m.li>
              )
            })}
          </AnimatePresence>
        </m.ul>
      )}

      <Reveal className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <div className="cap">{t('houses.how')}</div>
          <p className="mt-2 text-sm text-muted">{t('houses.how.body')}</p>
        </div>
        <div className="card p-5">
          <div className="cap">{t('house.risk.how')}</div>
          <p className="mt-2 text-sm text-muted">{t('house.scale')}</p>
          <p className="mt-2 text-xs font-medium text-muted">{t('house.risk.disclaimer')}</p>
          <p className="mt-3 text-xs text-faint">{t('houses.source')}</p>
        </div>
      </Reveal>
    </div>
  )
}
