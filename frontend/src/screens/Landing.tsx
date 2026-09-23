import { Link } from 'react-router-dom'
import { useI18n, type TranslationKey } from '@/i18n'
import { IconMap, IconUsers, IconRoute, IconChevron } from '@/components/icons'
import type { ComponentType, SVGProps } from 'react'

function HeroVisual() {
  return (
    <div className="relative isolate mx-auto w-full max-w-md">
      <div className="glass overflow-hidden p-5">
        <div className="rounded-2xl bg-navy-sheen p-5 text-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
              Almaty · live
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-spark animate-alert-pulse" />
              seismic
            </span>
          </div>

          {/* Стилизованный сейсмо-пульс */}
          <svg viewBox="0 0 320 90" className="mt-4 h-20 w-full" fill="none" aria-hidden="true">
            <path
              d="M0 45 H70 L86 20 L104 72 L122 8 L140 62 L156 45 H210 L226 30 L242 58 L258 45 H320"
              stroke="#3B6BFF"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Мини-карта с пульсирующим маркером */}
          <div className="relative mt-4 h-28 overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
            <div className="absolute inset-0 bg-grid-faint [background-size:22px_22px] opacity-40" />
            <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-spark ring-4 ring-spark/25" />
            <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-spark/60" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Fact({ valueKey, labelKey }: { valueKey: TranslationKey; labelKey: TranslationKey }) {
  const { t } = useI18n()
  return (
    <div>
      <div className="font-display text-2xl font-extrabold text-navy-700">{t(valueKey)}</div>
      <div className="mt-1 text-xs leading-snug text-subink">{t(labelKey)}</div>
    </div>
  )
}

function StepCard({
  n,
  Icon,
  titleKey,
  bodyKey,
}: {
  n: number
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  titleKey: TranslationKey
  bodyKey: TranslationKey
}) {
  const { t } = useI18n()
  return (
    <div className="card p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-center justify-between">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-mist text-navy-700">
          <Icon width={22} height={22} />
        </span>
        <span className="font-display text-3xl font-extrabold text-line">{n}</span>
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-ink">{t(titleKey)}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-subink">{t(bodyKey)}</p>
    </div>
  )
}

export function Landing() {
  const { t } = useI18n()

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-grid-faint [background-size:34px_34px] opacity-60" />
        <div className="pointer-events-none absolute -top-24 right-0 -z-10 h-72 w-72 rounded-full bg-spark/10 blur-3xl" />
        <div className="container-px grid items-center gap-10 py-12 md:grid-cols-2 md:py-20">
          <div className="animate-fade-up">
            <span className="eyebrow">{t('landing.eyebrow')}</span>
            <h1 className="mt-3 text-display-lg font-extrabold text-ink">
              {t('landing.title.line1')}{' '}
              <span className="text-navy-700">{t('landing.title.line2')}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-subink sm:text-lg">
              {t('landing.subtitle')}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/map" className="btn btn-primary text-base">
                <IconMap width={20} height={20} />
                {t('landing.cta')}
              </Link>
              <Link to="/checklist" className="btn btn-ghost text-base">
                {t('landing.cta.secondary')}
                <IconChevron width={18} height={18} />
              </Link>
            </div>
            <div className="mt-9 grid max-w-lg grid-cols-3 gap-5 border-t border-line pt-6">
              <Fact valueKey="landing.fact1.value" labelKey="landing.fact1.label" />
              <Fact valueKey="landing.fact2.value" labelKey="landing.fact2.label" />
              <Fact valueKey="landing.fact3.value" labelKey="landing.fact3.label" />
            </div>
          </div>
          <div className="animate-scale-in">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* ПРОБЛЕМА */}
      <section className="container-px py-6 md:py-10">
        <div className="card overflow-hidden">
          <div className="grid gap-6 p-8 md:grid-cols-[1.2fr_1fr] md:items-center md:p-10">
            <div>
              <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
                {t('landing.problem.title')}
              </h2>
              <p className="mt-4 max-w-xl leading-relaxed text-subink">{t('landing.problem.body')}</p>
            </div>
            <div className="rounded-3xl bg-navy-sheen p-6 text-white">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-5xl font-extrabold">{t('landing.fact1.value')}</span>
                <span className="text-sm text-white/80">{t('landing.fact1.label')}</span>
              </div>
              <div className="mt-4 h-px w-full bg-white/15" />
              <p className="mt-4 text-sm text-white/80">{t('app.tagline')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ТРИ ШАГА */}
      <section className="container-px py-10 md:py-14">
        <h2 className="text-center font-display text-2xl font-extrabold text-ink sm:text-3xl">
          {t('landing.steps.title')}
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <StepCard n={1} Icon={IconMap} titleKey="landing.step1.title" bodyKey="landing.step1.body" />
          <StepCard n={2} Icon={IconRoute} titleKey="landing.step2.title" bodyKey="landing.step2.body" />
          <StepCard n={3} Icon={IconUsers} titleKey="landing.step3.title" bodyKey="landing.step3.body" />
        </div>
      </section>

      {/* ФИНАЛЬНЫЙ CTA */}
      <section className="container-px pb-16 pt-2 md:pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-navy-sheen px-8 py-12 text-center text-white md:py-16">
          <div className="pointer-events-none absolute inset-0 bg-grid-faint [background-size:30px_30px] opacity-20" />
          <h2 className="relative font-display text-3xl font-extrabold sm:text-4xl">
            {t('landing.cta2.title')}
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-white/85">{t('landing.cta2.body')}</p>
          <div className="relative mt-8 flex justify-center">
            <Link
              to="/map"
              className="btn bg-white text-navy-800 hover:bg-white/90 text-base"
            >
              <IconMap width={20} height={20} />
              {t('landing.cta')}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
