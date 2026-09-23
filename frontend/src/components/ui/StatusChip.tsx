import type { FamilyStatus } from '@/api/types'
import { useI18n, type TranslationKey } from '@/i18n'

const STYLE: Record<FamilyStatus, string> = {
  safe: 'bg-safe-soft text-safe-ink',
  no_contact: 'bg-signal-soft text-signal-ink',
  unknown: 'bg-paper text-muted',
}
const DOT: Record<FamilyStatus, string> = {
  safe: 'bg-safe',
  no_contact: 'bg-signal animate-blink',
  unknown: 'bg-faint',
}
const KEY: Record<FamilyStatus, TranslationKey> = {
  safe: 'family.status.safe',
  no_contact: 'family.status.no_contact',
  unknown: 'family.status.unknown',
}

export function StatusChip({ status }: { status: FamilyStatus }) {
  const { t } = useI18n()
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] ${STYLE[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} />
      {t(KEY[status])}
    </span>
  )
}

export const STATUS_RING: Record<FamilyStatus, string> = {
  safe: '#1FCB8B',
  no_contact: '#FF3B1F',
  unknown: '#9A9AA0',
}
