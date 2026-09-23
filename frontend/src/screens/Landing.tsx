import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useI18n, type TranslationKey } from '@/i18n'
// Напрямую, а не через '@/api': иначе в первый экран попадают данные домов и маршрутов
import { countDistricts, getAssemblyPoints, OFFICIAL_TOTAL } from '@/api/assemblyPoints'
import { useAlert } from '@/store/alert'
import { SeismoCanvas } from '@/components/ui/SeismoCanvas'
import { RevealWave } from '@/components/ui/RevealWave'
import { Odometer } from '@/components/ui/Odometer'
import { Magnetic } from '@/components/ui/Magnetic'
import { Reveal, SplitText } from '@/components/ui/motion'
import { InstallButton } from '@/components/layout/InstallButton'
import {
  IconAlert,
  IconArrowRight,
  IconGauge,
  IconMap,
  IconShare,
  IconTimer,
  IconUsers,
  IconWifiOff,
} from '@/components/ui/icons'

function Stat({ value, label, pad = 0 }: { value: number; label: string; pad?: number }) {
  return (
    <div className="px-3 py-6 first:pl-0 sm:px-6">
      <Odometer value={value} pad={pad} className="text-[clamp(2.4rem,8.5vw,5.5rem)] font-semibold tracking-tight text-ink" />
      <div className="cap mt-2 max-w-[14rem]">{label}</div>
    </div>
  )
}

function McsBanner() {
  const { t } = useI18n()
  const { trigger } = useAlert()
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line bg-paper/70 px-4 py-2.5">
        <span className="h-2 w-2 rounded-full bg-signal animate-blink" />
        <span className="cap">{t('mcs.cap')}</span>
        <span className="cap ml-auto">MAGNITUDE · —</span>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <div className="font-display text-lg font-semibold">{t('mcs.title')}</div>
          <p className="mt-1 max-w-lg text-sm text-muted">{t('mcs.body')}</p>
        </div>
        <Magnetic>
          <button type="button" onClick={trigger} className="btn btn-signal buzz-parent">
            <IconAlert className="buzz" width={19} height={19} />
            {t('alarm.simulate')}
          </button>
        </Magnetic>
      </div>
    </div>
  )
}

function Step({ n, title, body }: { n: string; title: TranslationKey; body: TranslationKey }) {
  const { t } = useI18n()
  return (
    <div className="card lift h-full p-6">
      <div className="font-mono text-5xl font-semibold text-accent">{n}</div>
      <h3 className="mt-6 font-display text-lg font-semibold">{t(title)}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">{t(body)}</p>
    </div>
  )
}

function Tool({
  to,
  icon,
  title,
  body,
  className = '',
  children,
}: {
  to: string
  icon: ReactNode
  title: TranslationKey
  body: TranslationKey
  className?: string
  children?: ReactNode
}) {
  const { t } = useI18n()
  return (
    <Link to={to} className={`card lift buzz-parent group flex flex-col overflow-hidden ${className}`}>
      <div className="flex items-start justify-between p-5">
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-paper text-ink">
          <span className="buzz">{icon}</span>
        </span>
        <IconArrowRight className="text-faint transition-transform duration-300 group-hover:translate-x-1" width={20} height={20} />
      </div>
      {children}
      <div className="mt-auto p-5 pt-3">
        <h3 className="font-display text-base font-semibold">{t(title)}</h3>
        <p className="mt-1 text-sm text-muted">{t(body)}</p>
      </div>
    </Link>
  )
}

/** Схема карты для бенто: эпицентр + маршрут на миллиметровке. */
function MapSketch() {
  return (
    <div className="relative mx-5 h-44 overflow-hidden rounded-xl border border-line bg-mm md:h-auto md:flex-1">
      <svg viewBox="0 0 300 180" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d="M70 130 L110 130 L110 95 L170 95 L170 60 L228 60" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M70 130 L110 130 L110 95 L170 95 L170 60 L228 60" fill="none" stroke="#5B3DF5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="228" cy="60" r="9" fill="#D4FF3A" stroke="#111113" strokeWidth="3" />
        <circle cx="250" cy="130" r="5" fill="#111113" stroke="#fff" strokeWidth="2" />
        <circle cx="40" cy="50" r="5" fill="#111113" stroke="#fff" strokeWidth="2" />
      </svg>
      <div className="epicenter absolute" style={{ left: 'calc(23.3% - 13px)', top: 'calc(72% - 13px)' }} aria-hidden>
        <span className="wave" />
        <span className="wave" />
        <span className="wave" />
        <span className="core" />
      </div>
    </div>
  )
}

export function Landing() {
  const { t } = useI18n()
  const total = getAssemblyPoints().length
  const districts = countDistricts()

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden">
        <div className="container-px pt-8 md:pt-14">
          <div className="flex items-center justify-between gap-3">
            <span className="cap">LAT 43.2380 / LNG 76.9450</span>
            <span className="cap hidden sm:inline">{t('landing.cap.mode')}</span>
            <span className="cap">{t('landing.cap.city')}</span>
          </div>

          <h1 className="mt-10 max-w-5xl font-display text-hero font-bold md:mt-14">
            <SplitText text={t('landing.title.a')} />{' '}
            <SplitText text={t('landing.title.b')} delay={0.25} className="text-accent" />
          </h1>

          <Reveal delay={0.45}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{t('landing.subtitle')}</p>
          </Reveal>

          <Reveal delay={0.6} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Magnetic>
              <Link to="/map" className="btn btn-primary min-h-[56px] w-full px-7 text-base sm:w-auto">
                {t('landing.cta')}
                <IconArrowRight width={20} height={20} />
              </Link>
            </Magnetic>
            <Magnetic>
              <Link to="/drill" className="btn btn-ghost buzz-parent min-h-[56px] w-full px-7 text-base sm:w-auto">
                <IconTimer className="buzz" width={20} height={20} />
                {t('landing.cta.drill')}
              </Link>
            </Magnetic>
          </Reveal>
        </div>

        {/* Живая линия сейсмографа на всю ширину */}
        <div className="relative mt-12 border-y border-line bg-surface/50">
          <SeismoCanvas className="h-40 md:h-56" />
        </div>

        {/* Табло: только данные из приложения и из распоряжения */}
        <div className="container-px">
          <div className="grid grid-cols-3 divide-x divide-line">
            <Stat value={total} label={t('landing.stat.points')} />
            <Stat value={OFFICIAL_TOTAL} label={t('landing.stat.official')} />
            <Stat value={districts} pad={2} label={t('landing.stat.districts')} />
          </div>
          <p className="cap border-t border-line py-3 normal-case tracking-normal">{t('landing.stat.source')}</p>
        </div>
      </section>

      {/* ---------- МЧС (демо) ---------- */}
      <section className="container-px py-10">
        <Reveal>
          <McsBanner />
        </Reveal>
      </section>

      {/* ---------- КАК ЭТО РАБОТАЕТ ---------- */}
      <section className="py-10 md:py-16">
        <div className="container-px">
          <span className="cap">{t('landing.how.cap')}</span>
          <h2 className="mt-2 max-w-2xl font-display text-display font-bold">{t('landing.how.title')}</h2>
        </div>
        <RevealWave className="mt-6" />
        <div className="container-px mt-6 grid gap-4 md:grid-cols-3">
          <Reveal>
            <Step n="01" title="landing.how.1.title" body="landing.how.1.body" />
          </Reveal>
          <Reveal delay={0.08}>
            <Step n="02" title="landing.how.2.title" body="landing.how.2.body" />
          </Reveal>
          <Reveal delay={0.16}>
            <Step n="03" title="landing.how.3.title" body="landing.how.3.body" />
          </Reveal>
        </div>
      </section>

      {/* ---------- ИНСТРУМЕНТЫ: асимметричное бенто ---------- */}
      <section className="container-px py-10 md:py-16">
        <span className="cap">{t('landing.tools.cap')}</span>
        <h2 className="mt-2 max-w-2xl font-display text-display font-bold">{t('landing.tools.title')}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-4 md:grid-rows-[auto_auto_auto]">
          <Reveal className="md:col-span-2 md:row-span-2">
            <Tool to="/map" icon={<IconMap width={20} height={20} />} title="landing.f.map.title" body="landing.f.map.body" className="h-full min-h-[340px]">
              <MapSketch />
            </Tool>
          </Reveal>
          <Reveal className="md:col-span-2" delay={0.06}>
            <Link to="/drill" className="lift buzz-parent flex h-full flex-col justify-between gap-6 rounded-card bg-acid p-6 text-ink">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em]">{t('landing.f.drill.title')}</span>
                <IconTimer className="buzz" width={22} height={22} />
              </div>
              <div className="flex items-baseline gap-2 font-mono font-semibold leading-none">
                <span className="text-7xl md:text-8xl">60</span>
                <span className="text-xl uppercase">{t('unit.sec')}</span>
              </div>
              <p className="max-w-sm text-[15px] font-medium">{t('landing.f.drill.body')}</p>
            </Link>
          </Reveal>
          <Reveal delay={0.1}>
            <Tool to="/checklist" icon={<IconGauge width={20} height={20} />} title="landing.f.index.title" body="landing.f.index.body" className="h-full" />
          </Reveal>
          <Reveal delay={0.14}>
            <Tool to="/family" icon={<IconUsers width={20} height={20} />} title="landing.f.family.title" body="landing.f.family.body" className="h-full" />
          </Reveal>
          <Reveal className="md:col-span-3" delay={0.06}>
            <Tool to="/checklist" icon={<IconShare width={20} height={20} />} title="landing.f.share.title" body="landing.f.share.body" className="h-full" />
          </Reveal>
          <Reveal delay={0.1}>
            <div className="card flex h-full flex-col justify-between gap-6 p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-paper">
                <IconWifiOff width={20} height={20} />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold">{t('landing.f.offline.title')}</h3>
                <p className="mt-1 text-sm text-muted">{t('landing.f.offline.body')}</p>
                <InstallButton className="mt-4" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- ИСТОРИЯ ---------- */}
      <section className="border-y border-line bg-surface py-12 md:py-16">
        <div className="container-px">
          <span className="cap">{t('landing.history.cap')}</span>
          <h2 className="mt-2 font-display text-display font-bold">{t('landing.history.title')}</h2>
          <div className="mt-8 grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-3">
            {(
              [
                ['1887', 'landing.history.1887'],
                ['1911', 'landing.history.1911'],
                ['2024', 'landing.history.2024'],
              ] as const
            ).map(([year, key]) => (
              <div key={year} className="bg-surface p-6">
                <Odometer value={year} className="text-6xl font-semibold tracking-tight" jitter={false} />
                <p className="mt-3 text-[15px] leading-relaxed text-muted">{t(key)}</p>
              </div>
            ))}
          </div>
          <p className="cap mt-3">{t('landing.history.source')}</p>
        </div>
      </section>

      {/* ---------- ФИНАЛ ---------- */}
      <section className="container-px py-14 md:py-20">
        <div className="relative overflow-hidden rounded-sheet bg-ink px-6 py-12 text-white md:px-12 md:py-16">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 opacity-60">
            <SeismoCanvas className="h-28" color="#3A3A40" accent="#D4FF3A" interactive={false} />
          </div>
          <div className="relative">
            <h2 className="font-display text-display font-bold">{t('landing.final.title')}</h2>
            <p className="mt-3 max-w-md text-lg text-white/75">{t('landing.final.body')}</p>
            <div className="mt-8">
              <Magnetic>
                <Link to="/map" className="btn btn-acid min-h-[56px] px-7 text-base">
                  {t('landing.cta')}
                  <IconArrowRight width={20} height={20} />
                </Link>
              </Magnetic>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
