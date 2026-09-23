import type { House, RiskLevel } from '@/api/types'
import { assessRisk, type FactorKey } from '@/lib/risk'
import { useI18n, type TranslationKey } from '@/i18n'
import { RiskGauge } from '@/components/ui/RiskGauge'
import { Spinner } from '@/components/ui/motion'
import { IconBuilding } from '@/components/ui/icons'
import { getHouseAnalysis } from '@/api/houses'
import { materialLabel } from '@/lib/format'
import { AiAnalysis } from '@/components/houses/AiAnalysis'

const LEVEL_KEY: Record<RiskLevel, TranslationKey> = {
  low: 'house.risk.low',
  mid: 'house.risk.mid',
  high: 'house.risk.high',
}
const FACTOR_KEY: Record<FactorKey, TranslationKey> = {
  year: 'house.factor.year',
  material: 'house.factor.material',
  floors: 'house.factor.floors',
}

export function HousePanel({
  house,
  loading,
  unavailable = false,
  onRetry,
}: {
  house: House | null
  loading: boolean
  /** Источник (OpenStreetMap) не ответил — это не «здания нет». */
  unavailable?: boolean
  onRetry?: () => void
}) {
  const { t } = useI18n()

  if (loading) {
    return (
      <div className="card flex items-center gap-2 p-4 text-muted">
        <Spinner />
        <span className="cap">{t('house.loading')}</span>
      </div>
    )
  }
  if (unavailable) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2">
          <IconBuilding width={16} height={16} className="text-muted" />
          <span className="cap">{t('house.cap')}</span>
        </div>
        <p className="mt-2 text-sm text-muted">{t('house.unavailable')}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn btn-ghost btn-sm mt-3">
            {t('misc.retry')}
          </button>
        )}
      </div>
    )
  }
  if (!house) return null

  const risk = assessRisk(house)
  const analysis = getHouseAnalysis(house.houseId)
  const noData = t('misc.noData')
  const rows: { key: TranslationKey; value: string | null }[] = [
    { key: 'house.year', value: house.year !== null ? `${house.yearApprox ? '≈' : ''}${house.year}` : null },
    { key: 'house.floors', value: house.floors !== null ? `${house.floors} ${t('unit.floors')}` : null },
    { key: 'house.material', value: materialLabel(house.material) },
    { key: 'house.series', value: house.series },
  ]
  const source =
    house.source === 'openstreetmap'
      ? `${t('house.source.osm')}${house.sourceRef ? ` · ${house.sourceRef}` : ''}`
      : house.source === 'demo'
        ? t('house.source.demo')
        : t('house.source.none')
  const hasData = [house.year, house.floors, house.material].some((v) => v !== null)

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line px-3.5 py-2">
        <IconBuilding width={15} height={15} className="text-muted" />
        <span className="cap">{t('house.cap')}</span>
      </div>

      <dl className="grid grid-cols-2 gap-px bg-line">
        {rows.map((r) => (
          <div key={r.key} className="bg-surface px-3.5 py-2.5">
            <dt className="cap">{t(r.key)}</dt>
            <dd className={`mt-0.5 font-mono text-[15px] font-semibold ${r.value ? 'text-ink' : 'text-faint'}`}>
              {r.value ?? noData}
            </dd>
          </div>
        ))}
      </dl>
      <p className="cap border-t border-line px-3.5 py-2">
        {t('house.source')}: {source}
      </p>

      <div className="border-t border-line px-3.5 pb-3.5 pt-4">
        <div className="cap mb-1.5 text-center">{t('house.risk.cap')}</div>
        <RiskGauge
          compact
          score={risk.score}
          max={risk.maxScore}
          level={risk.level}
          levelLabel={risk.level ? t(LEVEL_KEY[risk.level]) : t('house.risk.insufficient')}
        />
        {risk.level === null && (
          <p className="mt-3 text-center text-sm text-muted">{t('house.risk.insufficientBody')}</p>
        )}

        <div className="mt-3">
          <div className="cap">{t('house.risk.how')}</div>
          <ul className="mt-2 divide-y divide-line rounded-2xl border border-line">
            {risk.factors.map((f) => (
              <li key={f.key} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-semibold text-ink">{t(FACTOR_KEY[f.key])}</span>
                  <span className="block truncate text-xs text-muted">
                    {f.value ? `${f.value} · ` : ''}
                    {f.labelKey ? t(f.labelKey) : t('house.factor.notCounted')}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-xs font-bold ${
                    f.points === null ? 'bg-paper text-faint' : f.points > 0 ? 'bg-ink text-white' : 'bg-safe-soft text-safe-ink'
                  }`}
                >
                  {f.points === null ? '—' : `+${f.points}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="cap mt-2">{t('house.scale')}</p>
          <p className="mt-2 text-xs font-medium text-muted">{t('house.risk.disclaimer')}</p>
        </div>
      </div>

      {(analysis || hasData) && (
        <div className="border-t border-line p-3.5">
          {analysis ? <AiAnalysis analysis={analysis} compact /> : <p className="text-xs text-muted">{t('ai.onlyList')}</p>}
        </div>
      )}
    </section>
  )
}
