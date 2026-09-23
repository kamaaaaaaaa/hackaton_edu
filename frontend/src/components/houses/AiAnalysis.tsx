import type { HouseAnalysis } from '@/api/houses'
import { useI18n } from '@/i18n'
import { IconSparkle } from '@/components/ui/icons'

/** ИИ-разбор дома: интерпретация открытых данных, не официальное заключение. */
export function AiAnalysis({ analysis, compact = false }: { analysis: HouseAnalysis; compact?: boolean }) {
  const { t } = useI18n()
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-accent/25 bg-accent/[0.04] ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-white">
          <IconSparkle width={15} height={15} />
        </span>
        <span className="cap !text-accent">{t('ai.cap')}</span>
      </div>
      <p className={`mt-2 text-ink ${compact ? 'text-[13px] leading-relaxed' : 'text-[15px] leading-relaxed'}`}>
        {analysis.summary}
      </p>
      <div className="cap mt-3">{t('ai.actions')}</div>
      <ol className="mt-1.5 space-y-1.5">
        {analysis.actions.map((a, i) => (
          <li key={a} className={`flex gap-2.5 text-ink ${compact ? 'text-[13px]' : 'text-sm'}`}>
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink font-mono text-[10px] font-bold text-acid">
              {i + 1}
            </span>
            <span>{a}</span>
          </li>
        ))}
      </ol>
      {!compact && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {analysis.basis.map((b) => (
            <span key={b} className="rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[10.5px] text-muted">
              {b}
            </span>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] leading-snug text-muted">
        {t('ai.disclaimer')} · {analysis.model} · {analysis.generatedAt}
      </p>
    </div>
  )
}
