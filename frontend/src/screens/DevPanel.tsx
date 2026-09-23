import { useEffect, useState } from 'react'
import { getAnalyticsSummary, type AnalyticsSummary } from '@/api/analytics'
import { useI18n } from '@/i18n'
import { Odometer } from '@/components/ui/Odometer'
import { Spinner } from '@/components/ui/motion'

const ADMIN_URL = 'https://hackathon-base.onrender.com/admin/'

export function DevPanel() {
  const { t, lang } = useI18n()
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(false)
    getAnalyticsSummary()
      .then((res) => alive && setSummary(res))
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const byType = summary ? Object.entries(summary.byEventType).sort((a, b) => b[1] - a[1]) : []
  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU')
    } catch {
      return iso
    }
  }

  return (
    <div className="container-px py-8 md:py-12">
      <span className="cap">DEV · ANALYTICS</span>
      <h1 className="mt-2 font-display text-display font-bold">{t('dev.title')}</h1>
      <p className="mt-2 text-muted">{t('dev.subtitle')}</p>

      <a href={ADMIN_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ink mt-6">
        {t('dev.adminCta')}
      </a>

      {loading && (
        <div className="card mt-6 flex items-center gap-2 p-5 text-muted">
          <Spinner /> {t('dev.loading')}
        </div>
      )}
      {!loading && error && <div className="card mt-6 p-5 font-medium text-signal-ink">{t('dev.error')}</div>}

      {!loading && !error && summary && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="card p-5">
              <div className="cap">{t('dev.stats.total')}</div>
              <Odometer value={summary.totalEvents} className="mt-2 text-5xl font-semibold" />
            </div>
            <div className="card p-5">
              <div className="cap">{t('dev.stats.last24h')}</div>
              <Odometer value={summary.last24h} className="mt-2 text-5xl font-semibold" />
            </div>
          </div>
          <div className="card mt-4 p-5">
            <div className="cap">{t('dev.stats.byType')}</div>
            {byType.length === 0 ? (
              <p className="mt-2 text-sm text-muted">{t('dev.noEvents')}</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {byType.map(([event, count]) => (
                  <li key={event} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-mono">{event}</span>
                    <span className="font-mono font-semibold">{count}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="cap mt-3">
              {t('dev.generatedAt')} {fmtDate(summary.generatedAt)}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
