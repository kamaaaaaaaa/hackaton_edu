import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { animate, m, useDragControls, useMotionValue, type PanInfo } from 'framer-motion'
import { useI18n } from '@/i18n'

export type SheetSnap = 'peek' | 'half' | 'full'

/** Видимая высота панели в свёрнутом виде и доля экрана в положении «половина». */
export const SHEET_PEEK = 132
export const SHEET_HALF = 0.46

export function sheetVisibleHeight(snap: SheetSnap, areaHeight: number, peekHeight = SHEET_PEEK): number {
  const sheetH = Math.max(areaHeight - 8, peekHeight)
  if (snap === 'peek') return Math.min(peekHeight, sheetH)
  if (snap === 'half') return Math.max(Math.round(areaHeight * SHEET_HALF), Math.min(peekHeight + 80, sheetH))
  return sheetH
}

const SPRING = { type: 'spring', stiffness: 380, damping: 38 } as const
const ORDER: SheetSnap[] = ['peek', 'half', 'full']

/**
 * Выдвижная панель для телефона, как в навигаторах: тянется за «ручку»
 * и прилипает к трём положениям. Содержимое прокручивается внутри.
 */
export function BottomSheet({
  snap,
  onSnapChange,
  areaHeight,
  peekHeight = SHEET_PEEK,
  header,
  children,
}: {
  snap: SheetSnap
  onSnapChange: (snap: SheetSnap) => void
  /** Высота области, в которой живёт панель (от верха карты до нижнего меню). */
  areaHeight: number
  peekHeight?: number
  header: ReactNode
  children: ReactNode
}) {
  const { t } = useI18n()
  const sheetH = Math.max(areaHeight - 8, peekHeight)
  const visible: Record<SheetSnap, number> = {
    peek: sheetVisibleHeight('peek', areaHeight, peekHeight),
    half: sheetVisibleHeight('half', areaHeight, peekHeight),
    full: sheetH,
  }
  const offset = (s: SheetSnap) => sheetH - visible[s]

  const y = useMotionValue(offset(snap))
  const controls = useDragControls()
  const headerRef = useRef<HTMLDivElement>(null)
  const [headerH, setHeaderH] = useState(64)

  useLayoutEffect(() => {
    const el = headerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setHeaderH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const a = animate(y, offset(snap), reduce ? { duration: 0 } : SPRING)
    return () => a.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, sheetH, peekHeight])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const projected = y.get() + info.velocity.y * 0.2
    const nearest = ORDER.reduce((a, b) => (Math.abs(offset(b) - projected) < Math.abs(offset(a) - projected) ? b : a))
    if (nearest === snap) animate(y, offset(nearest), SPRING)
    else onSnapChange(nearest)
  }

  const next = snap === 'full' ? 'peek' : ORDER[ORDER.indexOf(snap) + 1]

  return (
    <m.div
      className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col rounded-t-[26px] border-t border-line bg-surface shadow-[0_-10px_40px_rgba(17,17,19,0.14)]"
      style={{ height: sheetH, y }}
      drag="y"
      dragListener={false}
      dragControls={controls}
      dragConstraints={{ top: 0, bottom: offset('peek') }}
      dragElastic={0.06}
      dragMomentum={false}
      onDragEnd={onDragEnd}
    >
      <div
        ref={headerRef}
        onPointerDown={(e) => controls.start(e)}
        className="shrink-0 cursor-grab touch-none select-none px-4 pb-1.5 pt-1.5 active:cursor-grabbing"
      >
        <button
          type="button"
          onClick={() => onSnapChange(next)}
          aria-label={snap === 'full' ? t('map.sheet.collapse') : t('map.sheet.expand')}
          aria-expanded={snap !== 'peek'}
          className="mx-auto mb-1 block h-5 w-14 rounded-full"
        >
          <span className="mx-auto block h-1.5 w-11 rounded-full bg-line" />
        </button>
        {header}
      </div>
      <div
        data-lenis-prevent
        className="min-h-0 overflow-y-auto overscroll-contain px-3 pb-5"
        style={{ height: Math.max(visible[snap] - headerH, 0) }}
      >
        {children}
      </div>
    </m.div>
  )
}
