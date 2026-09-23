import type { RiskLevel } from '@/api/types'
import { useI18n } from '@/i18n'
import type { TranslationKey } from '@/i18n'

const STYLES: Record<RiskLevel, string> = {
  low: 'bg-risk-low/10 text-risk-low ring-risk-low/20',
  mid: 'bg-risk-mid/10 text-risk-mid ring-risk-mid/20',
  high: 'bg-risk-high/10 text-risk-high ring-risk-high/25',
}

const DOT: Record<RiskLevel, string> = {
  low: 'bg-risk-low',
  mid: 'bg-risk-mid',
  high: 'bg-risk-high',
}

const LABEL_KEY: Record<RiskLevel, TranslationKey> = {
  low: 'house.risk.low',
  mid: 'house.risk.mid',
  high: 'house.risk.high',
}

export function RiskBadge({ level, size = 'md' }: { level: RiskLevel; size?: 'sm' | 'md' }) {
  const { t } = useI18n()
  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full font-semibold ring-1 ring-inset ${STYLES[level]} ${pad}`}
    >
      <span className={`h-2 w-2 rounded-full ${DOT[level]} ${level === 'high' ? 'animate-alert-pulse' : ''}`} />
      {t(LABEL_KEY[level])}
    </span>
  )
}
