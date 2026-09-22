import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useFamily } from '@/store/family'
import { getAssemblyPoints, type AssemblyPoint, type FamilyStatus } from '@/api'
import { useI18n, type TranslationKey } from '@/i18n'

const STATUS_STYLE: Record<FamilyStatus, string> = {
  safe: 'bg-risk-low/10 text-risk-low ring-risk-low/25',
  no_contact: 'bg-risk-high/10 text-risk-high ring-risk-high/25',
  unknown: 'bg-mist text-subink ring-line',
}
const STATUS_KEY: Record<FamilyStatus, TranslationKey> = {
  safe: 'family.status.safe',
  no_contact: 'family.status.no_contact',
  unknown: 'family.status.unknown',
}

function StatusPill({ status }: { status: FamilyStatus }) {
  const { t } = useI18n()
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLE[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === 'safe' ? 'bg-risk-low' : status === 'no_contact' ? 'bg-risk-high' : 'bg-subink'
        }`}
      />
      {t(STATUS_KEY[status])}
    </span>
  )
}

export function FamilyCircle() {
  const { t, lang } = useI18n()
  const { members, add, remove, setStatus, meetingPointId, setMeetingPoint } = useFamily()
  const [points, setPoints] = useState<AssemblyPoint[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    let alive = true
    getAssemblyPoints()
      .then((p) => alive && setPoints(p))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  const meetingPoint = useMemo(
    () => points.find((p) => p.id === meetingPointId) ?? null,
    [points, meetingPointId],
  )
  const self = members.find((m) => m.isSelf) ?? members[0]
  const others = members.filter((m) => !m.isSelf)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    add(name, phone)
    setName('')
    setPhone('')
  }

  const fmtTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  return (
    <div className="container-px py-6 md:py-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
          {t('family.title')}
        </h1>
        <p className="mt-2 text-subink">{t('family.subtitle')}</p>
      </header>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_1.15fr]">
        {/* Левая колонка */}
        <div className="space-y-4">
          {/* Я в порядке */}
          <div className="card overflow-hidden">
            <div className="bg-navy-sheen p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                    {t('family.you')}
                  </p>
                  <p className="mt-1 font-display text-lg font-bold">
                    {self.name?.trim() ? self.name : t('family.you')}
                  </p>
                </div>
                <StatusPill status={self.status} />
              </div>
              <button
                type="button"
                onClick={() => setStatus(self.id, 'safe')}
                className="btn mt-4 w-full bg-white text-navy-800 hover:bg-white/90"
              >
                {t('family.imOk')}
              </button>
            </div>
          </div>

          {/* Точка встречи */}
          <div className="card p-5">
            <p className="eyebrow">{t('family.meeting.title')}</p>
            <label className="mt-3 block">
              <span className="sr-only">{t('family.meeting.choose')}</span>
              <select
                className="field"
                value={meetingPointId ?? ''}
                onChange={(e) => setMeetingPoint(e.target.value || null)}
              >
                <option value="">{t('family.meeting.none')}</option>
                {points.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.district ? ` — ${p.district}` : ''}
                  </option>
                ))}
              </select>
            </label>
            {meetingPoint && (
              <div className="mt-3 rounded-2xl bg-mist px-4 py-3 text-sm">
                <div className="font-semibold text-ink">{meetingPoint.name}</div>
                {meetingPoint.address && <div className="text-subink">{meetingPoint.address}</div>}
              </div>
            )}
          </div>

          {/* Добавить */}
          <form onSubmit={submit} className="card p-5">
            <p className="eyebrow">{t('family.add.title')}</p>
            <div className="mt-3 space-y-2.5">
              <input
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('family.add.namePlaceholder')}
                aria-label={t('family.add.name')}
                required
              />
              <input
                className="field"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('family.add.phonePlaceholder')}
                aria-label={t('family.add.phone')}
                inputMode="tel"
              />
            </div>
            <button type="submit" className="btn btn-primary mt-3 w-full">
              {t('action.add')}
            </button>
          </form>
        </div>

        {/* Правая колонка — список */}
        <div className="space-y-3">
          {others.length === 0 && (
            <div className="card p-6 text-sm text-subink">{t('family.empty')}</div>
          )}
          {others.map((m) => (
            <div key={m.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-ink">{m.name}</div>
                  {m.phone && <div className="text-xs text-subink">{m.phone}</div>}
                  <div className="mt-0.5 text-[11px] text-subink/70">
                    {t('family.updated')} {fmtTime(m.updatedAt)}
                  </div>
                </div>
                <StatusPill status={m.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStatus(m.id, 'safe')}
                  className="rounded-full bg-risk-low/10 px-3 py-1.5 text-xs font-semibold text-risk-low transition hover:bg-risk-low/20"
                >
                  {t('family.mark.safe')}
                </button>
                <button
                  type="button"
                  onClick={() => setStatus(m.id, 'no_contact')}
                  className="rounded-full bg-risk-high/10 px-3 py-1.5 text-xs font-semibold text-risk-high transition hover:bg-risk-high/20"
                >
                  {t('family.mark.no_contact')}
                </button>
                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  className="ml-auto rounded-full px-3 py-1.5 text-xs font-semibold text-subink transition hover:text-risk-high"
                >
                  {t('action.remove')}
                </button>
              </div>
            </div>
          ))}
          <p className="px-1 pt-1 text-[11px] text-subink/80">{t('family.stored')}</p>
        </div>
      </div>
    </div>
  )
}
