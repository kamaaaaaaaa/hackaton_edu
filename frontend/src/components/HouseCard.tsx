import type { House, RiskLevel } from '@/api/types'
import { useI18n, type TranslationKey } from '@/i18n'
import { RiskBadge } from './RiskBadge'

const SCORE_COLOR: Record<RiskLevel, string> = {
  low: 'bg-risk-low',
  mid: 'bg-risk-mid',
  high: 'bg-risk-high',
}

export function HouseCard({ house }: { house: House }) {
  const { t } = useI18n()

  const rows: { key: TranslationKey; value: string }[] = [
    {
      key: 'house.floors',
      value: house.floors != null ? `${house.floors} ${t('house.floorsUnit')}` : t('house.unknown'),
    },
    {
      key: 'house.year',
      value: house.yearBuilt != null ? String(house.yearBuilt) : t('house.unknown'),
    },
    { key: 'house.type', value: house.buildingType ?? t('house.unknown') },
  ]

  return (
    <div className="card p-5 animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{t('house.title')}</p>
          <h3 className="mt-1 line-clamp-2 font-display text-lg font-bold text-ink">{house.address}</h3>
        </div>
        <RiskBadge level={house.risk} />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2.5">
        {rows.map((r) => (
          <div key={r.key} className="rounded-2xl bg-mist px-3 py-2.5">
            <dt className="text-[11px] uppercase tracking-wide text-subink">{t(r.key)}</dt>
            <dd className="mt-0.5 text-sm font-bold text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-semibold text-subink">
          <span>{t('house.riskScore')}</span>
          <span>{house.riskScore}/100</span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-line">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${SCORE_COLOR[house.risk]}`}
            style={{ width: `${house.riskScore}%` }}
          />
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-subink">{house.riskReason}</p>
      {house.estimated && (
        <p className="mt-2 text-[11px] leading-snug text-subink/80">{t('house.estimated')}</p>
      )}
    </div>
  )
}
