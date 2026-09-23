import { useEffect, useState } from 'react'
import { getAnalyticsSummary, type AnalyticsSummary } from '@/api/analytics'
import { useI18n } from '@/i18n'

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
      .then((res) => {
        if (alive) setSummary(res)
      })
      .catch(() => {
        if (alive) setError(true)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const byType = summary ? Object.entries(summary.byEventType) : []

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU')
    } catch {
      return iso
    }
  }

  return (
    <div className="container-px py-6 md:py-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
          {t('dev.title')}
        </h1>
        <p className="mt-2 text-subink">{t('dev.subtitle')}</p>
      </header>

      <div className="card mt-6 p-5">
        <a
          href={ADMIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary w-full sm:w-auto"
        >
          {t('dev.adminCta')}
        </a>
      </div>

      {loading && <div className="card mt-4 p-6 text-sm text-subink">{t('dev.loading')}</div>}

      {!loading && error && (
        <div className="card mt-4 p-6 text-sm text-risk-high">{t('dev.error')}</div>
      )}

      {!loading && !error && summary && (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="card p-5">
              <p className="eyebrow">{t('dev.stats.total')}</p>
              <p className="mt-1 font-display text-3xl font-extrabold text-navy-700">
                {summary.totalEvents}
              </p>
            </div>
            <div className="card p-5">
              <p className="eyebrow">{t('dev.stats.last24h')}</p>
              <p className="mt-1 font-display text-3xl font-extrabold text-navy-700">
                {summary.last24h}
              </p>
            </div>
          </div>

          <div className="card mt-4 p-5">
            <p className="eyebrow">{t('dev.stats.byType')}</p>
            {byType.length === 0 ? (
              <p className="mt-2 text-sm text-subink">{t('dev.noEvents')}</p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {byType.map(([event, count]) => (
                  <li
                    key={event}
                    className="flex items-center justify-between rounded-2xl bg-mist px-4 py-2 text-sm"
                  >
                    <span className="font-medium text-ink">{event}</span>
                    <span className="font-semibold text-navy-700">{count}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-subink/80">
              {t('dev.generatedAt')} {fmtDate(summary.generatedAt)}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
