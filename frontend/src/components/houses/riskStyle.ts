import type { RiskLevel } from '@/api/types'

// Цвета уровней риска — одинаковые на карте, в списке домов и в панели.
export const RISK_DOT: Record<RiskLevel, string> = {
  high: 'bg-signal',
  mid: 'bg-warn',
  low: 'bg-safe',
}

export const RISK_BADGE: Record<RiskLevel, string> = {
  high: 'bg-signal text-ink',
  mid: 'bg-warn text-ink',
  low: 'bg-safe text-ink',
}
