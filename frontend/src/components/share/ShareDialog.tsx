import { forwardRef, useEffect, useRef, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { useI18n } from '@/i18n'
import { LogoMark } from '@/components/ui/Logo'
import { IconDownload, IconShare, IconX } from '@/components/ui/icons'
import { Spinner } from '@/components/ui/motion'

const CARD_W = 360
const CARD_H = 640
const WAVE =
  'M0 60 L40 60 L52 58 L60 64 L70 40 L80 88 L92 22 L104 96 L116 44 L126 70 L136 56 L150 62 L170 58 L190 61 L210 59 L230 60 L260 60 L300 60 L360 60'

/** Карточка 360×640 → PNG 1080×1920 (pixelRatio 3). Без transform на самом узле. */
const StoryCard = forwardRef<HTMLDivElement, { percent: number; host: string; date: string }>(
  function StoryCard({ percent, host, date }, ref) {
    const { t } = useI18n()
    return (
      <div
        ref={ref}
        className="relative flex flex-col overflow-hidden bg-mm text-ink"
        style={{ width: CARD_W, height: CARD_H }}
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <span className="inline-flex items-center gap-2">
            <LogoMark size={26} />
            <span className="font-display text-[13px] font-semibold">Готов к толчку</span>
          </span>
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-muted">ALMATY · KZ</span>
        </div>

        <div className="mt-auto px-6">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{t('readiness.cap')}</div>
          <div className="mt-1 font-mono text-[132px] font-semibold leading-[0.9] tracking-tight">
            {percent}
            <span className="text-[56px]">%</span>
          </div>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-acid" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-6 font-display text-[26px] font-bold leading-tight">
            {t('share.title')} {t('share.on')} {percent}%
          </div>
        </div>

        <svg viewBox="0 0 360 120" className="mt-6 block w-full" aria-hidden>
          <path d={WAVE} fill="none" stroke="#111113" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="92" cy="22" r="4" fill="#5B3DF5" />
        </svg>

        <div className="flex items-center justify-between border-t border-ink/10 px-6 py-4">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]">{host}</span>
          <span className="font-mono text-[10px] text-muted">{date}</span>
        </div>
      </div>
    )
  },
)

export function ShareDialog({ open, onClose, percent }: { open: boolean; onClose: () => void; percent: number }) {
  const { t, lang } = useI18n()
  const cardRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState<null | 'share' | 'download'>(null)
  const [failed, setFailed] = useState(false)
  const host = typeof window !== 'undefined' ? window.location.host : ''
  const date = new Date().toLocaleDateString(lang === 'kk' ? 'kk-KZ' : 'ru-RU')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const render = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null
    const { toBlob } = await import('html-to-image')
    await document.fonts.ready
    return toBlob(cardRef.current, {
      pixelRatio: 3,
      width: CARD_W,
      height: CARD_H,
      cacheBust: true,
      backgroundColor: '#F4F3EE',
    })
  }

  const run = async (mode: 'share' | 'download') => {
    setBusy(mode)
    setFailed(false)
    try {
      const blob = await render()
      if (!blob) throw new Error('empty')
      const file = new File([blob], 'gotov-k-tolchku.png', { type: 'image/png' })
      if (mode === 'share' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: t('share.title'), text: `${t('share.title')} ${t('share.on')} ${percent}%` })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 2000)
      }
    } catch (e) {
      if ((e as { name?: string })?.name !== 'AbortError') setFailed(true)
    } finally {
      setBusy(null)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="fixed inset-0 z-[950] flex items-end justify-center bg-ink/40 p-3 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <m.div
            role="dialog"
            aria-modal="true"
            aria-label={t('share.cta')}
            className="w-full max-w-sm rounded-sheet bg-surface p-4 shadow-lift"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="cap">{t('share.cta')}</span>
              <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full hover:bg-paper" aria-label={t('action.close')}>
                <IconX width={20} height={20} />
              </button>
            </div>

            {/* Превью: масштабируем обёртку, сам узел карточки — в натуральную величину */}
            <div className="mx-auto mt-2 overflow-hidden rounded-2xl border border-line" style={{ width: CARD_W * 0.62, height: CARD_H * 0.62 }}>
              <div style={{ transform: 'scale(0.62)', transformOrigin: 'top left', width: CARD_W, height: CARD_H }}>
                <StoryCard ref={cardRef} percent={percent} host={host} date={date} />
              </div>
            </div>

            <p className="mt-3 text-center text-sm text-muted">{t('share.caption')}</p>
            {failed && <p className="mt-2 text-center text-sm font-medium text-signal-ink">{t('share.fail')}</p>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => run('share')} disabled={busy !== null} className="btn btn-primary">
                {busy === 'share' ? <Spinner /> : <IconShare width={18} height={18} />}
                {t('action.share')}
              </button>
              <button type="button" onClick={() => run('download')} disabled={busy !== null} className="btn btn-ghost">
                {busy === 'download' ? <Spinner /> : <IconDownload width={18} height={18} />}
                {t('action.download')}
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
