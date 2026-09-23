import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useFamilyGroup } from '@/store/familyGroup'
import { useMeetingPoint } from '@/store/family'
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

/** Две карточки выбора, пока пользователь ещё не в группе: создать новую
 *  семью или присоединиться по коду, который дал родственник. */
function GroupOnboarding({
  create,
  join,
  loading,
  error,
}: {
  create: (name: string, phone: string) => Promise<void>
  join: (code: string, name: string, phone: string) => Promise<void>
  loading: boolean
  error: string | null
}) {
  const { t } = useI18n()
  const [createName, setCreateName] = useState('')
  const [createPhone, setCreatePhone] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinName, setJoinName] = useState('')
  const [joinPhone, setJoinPhone] = useState('')
  const [lastAction, setLastAction] = useState<'create' | 'join' | null>(null)

  const submitCreate = (e: FormEvent) => {
    e.preventDefault()
    setLastAction('create')
    create(createName, createPhone).catch(() => undefined)
  }

  const submitJoin = (e: FormEvent) => {
    e.preventDefault()
    setLastAction('join')
    join(joinCode, joinName, joinPhone).catch(() => undefined)
  }

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <form onSubmit={submitCreate} className="card p-5">
        <p className="eyebrow">{t('family.group.createTitle')}</p>
        <p className="mt-1 text-sm text-subink">{t('family.group.createBody')}</p>
        <div className="mt-3 space-y-2.5">
          <input
            className="field"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder={t('family.group.yourNamePlaceholder')}
            aria-label={t('family.group.yourName')}
            required
          />
          <input
            className="field"
            value={createPhone}
            onChange={(e) => setCreatePhone(e.target.value)}
            placeholder={t('family.add.phonePlaceholder')}
            aria-label={t('family.add.phone')}
            inputMode="tel"
          />
        </div>
        {lastAction === 'create' && error && (
          <p className="mt-2 text-sm text-risk-high">{error}</p>
        )}
        <button type="submit" className="btn btn-primary mt-3 w-full" disabled={loading}>
          {loading && lastAction === 'create' ? t('family.group.creating') : t('family.group.create')}
        </button>
      </form>

      <form onSubmit={submitJoin} className="card p-5">
        <p className="eyebrow">{t('family.group.joinTitle')}</p>
        <p className="mt-1 text-sm text-subink">{t('family.group.joinBody')}</p>
        <div className="mt-3 space-y-2.5">
          <input
            className="field"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder={t('family.group.codePlaceholder')}
            aria-label={t('family.group.code')}
            required
          />
          <input
            className="field"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            placeholder={t('family.group.yourNamePlaceholder')}
            aria-label={t('family.group.yourName')}
            required
          />
          <input
            className="field"
            value={joinPhone}
            onChange={(e) => setJoinPhone(e.target.value)}
            placeholder={t('family.add.phonePlaceholder')}
            aria-label={t('family.add.phone')}
            inputMode="tel"
          />
        </div>
        {lastAction === 'join' && error && <p className="mt-2 text-sm text-risk-high">{error}</p>}
        <button type="submit" className="btn btn-primary mt-3 w-full" disabled={loading}>
          {loading && lastAction === 'join' ? t('family.group.joining') : t('family.group.join')}
        </button>
      </form>
    </div>
  )
}

export function FamilyCircle() {
  const { t, lang } = useI18n()
  const { hasGroup, groupCode, members, loading, error, create, join, refresh, setMyStatus, leaveGroup } =
    useFamilyGroup()
  const { meetingPointId, setMeetingPoint } = useMeetingPoint()
  const [points, setPoints] = useState<AssemblyPoint[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    getAssemblyPoints()
      .then((p) => alive && setPoints(p))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(id)
  }, [copied])

  const meetingPoint = useMemo(
    () => points.find((p) => p.id === meetingPointId) ?? null,
    [points, meetingPointId],
  )
  const self = members.find((m) => m.isSelf)
  const others = members.filter((m) => !m.isSelf)

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

  const copyCode = () => {
    if (!groupCode) return
    navigator.clipboard
      .writeText(groupCode)
      .then(() => setCopied(true))
      .catch(() => undefined)
  }

  return (
    <div className="container-px py-6 md:py-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
          {t('family.title')}
        </h1>
        <p className="mt-2 text-subink">{t('family.subtitle')}</p>
      </header>

      {!hasGroup && (
        <GroupOnboarding create={create} join={join} loading={loading} error={error} />
      )}

      {hasGroup && (
        <>
          {/* Код приглашения */}
          <div className="card mt-6 p-5">
            <p className="eyebrow">{t('family.group.inviteTitle')}</p>
            <p className="mt-1 text-sm text-subink">{t('family.group.inviteHint')}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-2xl bg-mist px-4 py-2 font-mono text-lg font-bold tracking-[0.15em] text-ink">
                {groupCode}
              </span>
              <button
                type="button"
                onClick={copyCode}
                className="rounded-full bg-navy-sheen px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {copied ? t('family.group.copied') : t('family.group.copy')}
              </button>
            </div>
          </div>

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
                        {self?.name?.trim() ? self.name : t('family.you')}
                      </p>
                    </div>
                    {self && <StatusPill status={self.status} />}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMyStatus('safe')}
                    disabled={!self}
                    className="btn mt-4 w-full bg-white text-navy-800 hover:bg-white/90 disabled:opacity-60"
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
                    {meetingPoint.address && (
                      <div className="text-subink">{meetingPoint.address}</div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={leaveGroup}
                className="px-1 text-xs font-semibold text-subink underline decoration-dotted transition hover:text-risk-high"
              >
                {t('family.group.leave')}
              </button>
            </div>

            {/* Правая колонка — список */}
            <div className="space-y-3">
              {loading && members.length === 0 && (
                <div className="card p-6 text-sm text-subink">{t('family.group.loading')}</div>
              )}

              {error && members.length === 0 && (
                <div className="card p-6 text-sm text-risk-high">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() => refresh()}
                    className="mt-2 rounded-full bg-mist px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-line"
                  >
                    {t('misc.retry')}
                  </button>
                </div>
              )}

              {!loading && !error && others.length === 0 && members.length > 0 && (
                <div className="card p-6 text-sm text-subink">{t('family.group.emptyOthers')}</div>
              )}

              {error && members.length > 0 && (
                <div className="flex items-center justify-between rounded-2xl bg-risk-high/10 px-4 py-2 text-xs text-risk-high">
                  <span>{error}</span>
                  <button type="button" onClick={() => refresh()} className="font-semibold underline">
                    {t('misc.retry')}
                  </button>
                </div>
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
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
