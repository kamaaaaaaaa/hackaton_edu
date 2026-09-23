import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useFamilyGroup } from '@/store/familyGroup'
import { useMeetingPoint } from '@/store/family'
import { getAssemblyPoints, getPointById } from '@/api'
import { isMapped } from '@/lib/geo'
import { initials } from '@/lib/format'
import { formatPhone, isCompletePhone, toE164 } from '@/lib/phone'
import { useI18n } from '@/i18n'
import { StatusChip, STATUS_RING } from '@/components/ui/StatusChip'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { CodeInput, CODE_LENGTH } from '@/components/ui/CodeInput'
import { Spinner } from '@/components/ui/motion'
import { IconCheck, IconCopy, IconPhone, IconShare } from '@/components/ui/icons'

const CityMap = lazy(() => import('@/components/map/CityMap'))

/** Поле формы с видимой подписью и подсказкой — без «загадочных» плейсхолдеров. */
function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string | null
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs font-medium text-signal-ink">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

/** Сервер на бесплатном Render «засыпает»: если ответа нет дольше 4 с — предупреждаем. */
function useSlow(loading: boolean) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!loading) {
      setSlow(false)
      return
    }
    const id = window.setTimeout(() => setSlow(true), 4000)
    return () => window.clearTimeout(id)
  }, [loading])
  return slow
}

/** Две карточки, пока пользователь не в группе: создать семью или войти по коду. */
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
  const [codeRejected, setCodeRejected] = useState(false)
  const [lastAction, setLastAction] = useState<'create' | 'join' | null>(null)
  const [touched, setTouched] = useState({ create: false, join: false })
  const slow = useSlow(loading)

  useEffect(() => {
    if (!codeRejected) return
    const id = window.setTimeout(() => setCodeRejected(false), 2600)
    return () => window.clearTimeout(id)
  }, [codeRejected])

  const phoneError = (digits: string, show: boolean) =>
    show && digits.length > 0 && !isCompletePhone(digits) ? t('family.phone.incomplete') : null

  const submitCreate = (e: FormEvent) => {
    e.preventDefault()
    setTouched((s) => ({ ...s, create: true }))
    if (createPhone && !isCompletePhone(createPhone)) return
    setLastAction('create')
    create(createName, toE164(createPhone)).catch(() => undefined)
  }
  const submitJoin = (e: FormEvent) => {
    e.preventDefault()
    setTouched((s) => ({ ...s, join: true }))
    if (joinPhone && !isCompletePhone(joinPhone)) return
    setLastAction('join')
    join(joinCode, joinName, toE164(joinPhone)).catch(() => undefined)
  }

  const waiting = loading && slow && <p className="mt-3 flex items-center gap-2 text-xs text-muted"><Spinner className="text-accent" /> {t('family.server.waking')}</p>

  return (
    <>
      <ol className="mt-6 grid gap-2 sm:grid-cols-3">
        {(['family.how.1', 'family.how.2', 'family.how.3'] as const).map((k, i) => (
          <li key={k} className="flex items-start gap-3 rounded-2xl border border-line bg-surface/70 p-3.5 text-sm">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink font-mono text-xs font-bold text-acid">
              {i + 1}
            </span>
            <span className="text-ink">{t(k)}</span>
          </li>
        ))}
      </ol>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <form onSubmit={submitCreate} className="card flex flex-col p-5" noValidate>
          <span className="font-mono text-4xl font-semibold text-accent">01</span>
          <h2 className="mt-3 font-display text-lg font-semibold">{t('family.group.createTitle')}</h2>
          <p className="mt-1 text-sm text-muted">{t('family.group.createBody')}</p>
          <div className="mt-4 space-y-4">
            <Field id="create-name" label={t('family.group.yourName')} hint={t('family.group.yourNameHint')}>
              <input
                id="create-name"
                className="field"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={t('family.group.yourNamePlaceholder')}
                autoComplete="given-name"
                aria-describedby="create-name-hint"
                required
              />
            </Field>
            <Field
              id="create-phone"
              label={t('family.phone.label')}
              hint={t('family.phone.hint')}
              error={phoneError(createPhone, touched.create)}
            >
              <PhoneInput
                id="create-phone"
                value={createPhone}
                onChange={setCreatePhone}
                invalid={Boolean(phoneError(createPhone, touched.create))}
                describedBy="create-phone-hint"
              />
            </Field>
          </div>
          {lastAction === 'create' && error && <p className="mt-3 text-sm font-medium text-signal-ink">{error}</p>}
          <button type="submit" className="btn btn-primary mt-5 w-full" disabled={loading}>
            {loading && lastAction === 'create' ? t('family.group.creating') : t('family.group.create')}
          </button>
          {lastAction === 'create' && waiting}
        </form>

        <form onSubmit={submitJoin} className="card flex flex-col p-5" noValidate>
          <span className="font-mono text-4xl font-semibold text-accent">02</span>
          <h2 className="mt-3 font-display text-lg font-semibold">{t('family.group.joinTitle')}</h2>
          <p className="mt-1 text-sm text-muted">{t('family.group.joinBody')}</p>
          <div className="mt-4 space-y-4">
            <Field
              id="join-code"
              label={t('family.group.code')}
              hint={t('family.group.codeHint')}
              error={codeRejected ? t('family.group.codeRejected') : null}
            >
              <CodeInput
                id="join-code"
                value={joinCode}
                onChange={setJoinCode}
                onReject={() => setCodeRejected(true)}
                describedBy="join-code-hint"
              />
            </Field>
            <Field id="join-name" label={t('family.group.yourName')} hint={t('family.group.yourNameHint')}>
              <input
                id="join-name"
                className="field"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder={t('family.group.yourNamePlaceholder')}
                autoComplete="given-name"
                aria-describedby="join-name-hint"
                required
              />
            </Field>
            <Field
              id="join-phone"
              label={t('family.phone.label')}
              hint={t('family.phone.hint')}
              error={phoneError(joinPhone, touched.join)}
            >
              <PhoneInput
                id="join-phone"
                value={joinPhone}
                onChange={setJoinPhone}
                invalid={Boolean(phoneError(joinPhone, touched.join))}
                describedBy="join-phone-hint"
              />
            </Field>
          </div>
          {lastAction === 'join' && error && <p className="mt-3 text-sm font-medium text-signal-ink">{error}</p>}
          <button
            type="submit"
            className="btn btn-ink mt-5 w-full"
            disabled={loading || joinCode.length !== CODE_LENGTH}
          >
            {loading && lastAction === 'join' ? t('family.group.joining') : t('family.group.join')}
          </button>
          {lastAction === 'join' && waiting}
        </form>
      </div>
    </>
  )
}

/** Демо-режим: добавить близкого вручную. */
function AddLocalMember({ onAdd }: { onAdd: (name: string, phone: string) => void }) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  return (
    <form
      className="card space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim() || (phone && !isCompletePhone(phone))) return
        onAdd(name, toE164(phone))
        setName('')
        setPhone('')
      }}
    >
      <div className="cap">{t('family.local.add')}</div>
      <Field id="local-name" label={t('family.local.addName')}>
        <input
          id="local-name"
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('family.local.addNamePlaceholder')}
        />
      </Field>
      <Field id="local-phone" label={t('family.phone.label')}>
        <PhoneInput id="local-phone" value={phone} onChange={setPhone} />
      </Field>
      <button type="submit" className="btn btn-ghost btn-sm w-full" disabled={!name.trim()}>
        {t('family.local.addButton')}
      </button>
    </form>
  )
}

export function FamilyCircle() {
  const { t, lang } = useI18n()
  const {
    hasGroup,
    mode,
    localReason,
    groupCode,
    members,
    loading,
    error,
    create,
    join,
    refresh,
    setMyStatus,
    addLocalMember,
    cycleLocalStatus,
    leaveGroup,
  } = useFamilyGroup()
  const { meetingPointId, setMeetingPoint } = useMeetingPoint()
  const [copied, setCopied] = useState(false)

  const points = useMemo(() => getAssemblyPoints(), [])
  const meetingPoint = getPointById(meetingPointId)
  const meetingOnMap = meetingPoint && isMapped(meetingPoint) ? meetingPoint : null
  const self = members.find((m) => m.isSelf)
  const others = members.filter((m) => !m.isSelf)
  const local = mode === 'local'

  const avatars = useMemo(
    () => members.map((m) => ({ id: m.id, label: initials(m.name), ring: STATUS_RING[m.status] })),
    [members],
  )
  const meetingCoords = useMemo(
    () => (meetingOnMap ? { lng: meetingOnMap.lng, lat: meetingOnMap.lat } : null),
    [meetingOnMap],
  )

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(id)
  }, [copied])

  const fmtTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })
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
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const shareCode = () => {
    if (!groupCode) return
    navigator
      .share({ title: t('app.name'), text: `${t('family.group.shareText')}${groupCode}`, url: `${location.origin}/family` })
      .catch(() => undefined)
  }

  return (
    <div className="container-px py-8 md:py-12">
      <header className="max-w-2xl">
        <span className="cap">{t('family.cap')}</span>
        <h1 className="mt-2 font-display text-display font-bold">{t('family.title')}</h1>
        <p className="mt-2 text-muted">{t('family.subtitle')}</p>
      </header>

      {!hasGroup && <GroupOnboarding create={create} join={join} loading={loading} error={error} />}

      {hasGroup && (
        <div className="mt-8 grid items-start gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
            {local && (
              <div className="rounded-2xl border border-warn/40 bg-warn-soft p-4 text-sm">
                <div className="font-semibold text-warn-ink">{t('family.local.title')}</div>
                <p className="mt-1 text-ink/80">
                  {localReason ? `${localReason} ` : ''}
                  {t('family.local.body')}
                </p>
                <button type="button" onClick={leaveGroup} className="mt-2 font-semibold text-ink underline">
                  {t('family.local.retry')}
                </button>
              </div>
            )}

            {/* Я в порядке */}
            <div className="rounded-sheet bg-ink p-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">{t('family.you')}</div>
                  <div className="mt-1 truncate font-display text-xl font-semibold">
                    {self?.name?.trim() ? self.name : t('family.you')}
                  </div>
                </div>
                {self && <StatusChip status={self.status} />}
              </div>
              <button
                type="button"
                onClick={() => setMyStatus('safe')}
                disabled={!self}
                className="btn btn-acid mt-5 min-h-[60px] w-full text-lg"
              >
                <IconCheck width={22} height={22} />
                {t('family.imOk')}
              </button>
            </div>

            {/* Код приглашения */}
            <div className="card p-5">
              <div className="cap">{t('family.group.inviteTitle')}</div>
              <p className="mt-1 text-sm text-muted">{t('family.group.inviteHint')}</p>
              {groupCode && (
                <div className="mt-3 grid grid-cols-6 gap-1.5 sm:max-w-sm" aria-label={groupCode}>
                  {groupCode.split('').map((ch, i) => (
                    <span
                      key={i}
                      aria-hidden
                      className="grid h-14 place-items-center rounded-2xl border-2 border-ink bg-surface font-mono text-2xl font-bold"
                    >
                      {ch}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={copyCode} className="btn btn-ghost btn-sm">
                  {copied ? <IconCheck width={16} height={16} /> : <IconCopy width={16} height={16} />}
                  {copied ? t('family.group.copied') : t('family.group.copy')}
                </button>
                {canShare && (
                  <button type="button" onClick={shareCode} className="btn btn-ink btn-sm">
                    <IconShare width={16} height={16} />
                    {t('family.group.share')}
                  </button>
                )}
              </div>
            </div>

            {/* Точка встречи + схема на карте */}
            <div className="card overflow-hidden">
              <div className="p-5">
                <label htmlFor="meeting" className="cap">
                  {t('family.meeting.title')}
                </label>
                <select
                  id="meeting"
                  className="field mt-2"
                  value={meetingPointId ?? ''}
                  onChange={(e) => setMeetingPoint(e.target.value || null)}
                >
                  <option value="">{t('family.meeting.none')}</option>
                  {points.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.district}
                    </option>
                  ))}
                </select>
                {meetingPoint && (
                  <div className="mt-3 text-sm">
                    <div className="font-semibold">{meetingPoint.name}</div>
                    <div className="text-muted">{meetingPoint.address}</div>
                    <div className="mt-1 text-xs font-semibold text-safe-ink">{t('family.meeting.official')}</div>
                  </div>
                )}
              </div>
              <div className="relative h-64 border-t border-line">
                {meetingOnMap ? (
                  <Suspense fallback={<div className="grid h-full place-items-center bg-mm text-muted"><Spinner /></div>}>
                    <CityMap points={[]} meeting={meetingCoords} avatars={avatars} controls={false} />
                  </Suspense>
                ) : (
                  <div className="grid h-full place-items-center bg-mm p-6 text-center">
                    <p className="cap">{meetingPoint ? t('map.noPoints') : t('family.map.noMeeting')}</p>
                  </div>
                )}
              </div>
              {meetingOnMap && <p className="cap border-t border-line px-5 py-2">{t('family.map.caption')}</p>}
            </div>
          </div>

          {/* Участники */}
          <div className="space-y-3">
            <div className="cap">{t('family.members')}</div>
            {loading && members.length === 0 && (
              <div className="card flex items-center gap-2 p-5 text-sm text-muted">
                <Spinner /> {t('family.group.loading')}
              </div>
            )}
            {error && (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-signal-soft px-4 py-3 text-sm text-signal-ink">
                <span>{error}</span>
                {!local && (
                  <button type="button" onClick={() => refresh()} className="font-semibold underline">
                    {t('misc.retry')}
                  </button>
                )}
              </div>
            )}
            {!local && !loading && !error && others.length === 0 && members.length > 0 && (
              <div className="card p-5 text-sm text-muted">{t('family.group.emptyOthers')}</div>
            )}
            {members.map((m) => (
              <div key={m.id} className="card flex items-center gap-3 p-4">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-paper font-mono text-sm font-bold"
                  style={{ boxShadow: `0 0 0 3px ${STATUS_RING[m.status]}` }}
                >
                  {initials(m.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">
                    {m.name}
                    {m.isSelf && <span className="ml-1.5 text-muted">· {t('family.you')}</span>}
                  </div>
                  {m.phone && (
                    <a href={`tel:${m.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1 font-mono text-xs text-muted hover:text-ink">
                      <IconPhone width={12} height={12} />
                      {formatPhone(m.phone)}
                    </a>
                  )}
                  <div className="cap mt-0.5">
                    {t('family.updated')} {fmtTime(m.updatedAt)}
                  </div>
                </div>
                {local && !m.isSelf ? (
                  <button type="button" onClick={() => cycleLocalStatus(m.id)} title={t('family.local.tapStatus')}>
                    <StatusChip status={m.status} />
                  </button>
                ) : (
                  <StatusChip status={m.status} />
                )}
              </div>
            ))}
            {local && (
              <>
                <p className="px-1 text-xs text-muted">{t('family.local.tapStatus')}</p>
                <AddLocalMember onAdd={addLocalMember} />
              </>
            )}
            <button
              type="button"
              onClick={leaveGroup}
              className="px-1 text-xs font-semibold text-muted underline decoration-dotted hover:text-signal-ink"
            >
              {t('family.group.leave')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
