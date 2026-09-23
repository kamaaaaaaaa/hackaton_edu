import { useLayoutEffect, useRef, type ReactNode } from 'react'

/**
 * Заголовок в одну строку, который всегда помещается по ширине: если слово
 * шире контейнера (узкий телефон, крупный системный шрифт, казахский текст),
 * шрифт уменьшается ровно настолько, чтобы строка влезла. Никаких переносов
 * посреди слова. Пересчёт — при изменении ширины и после загрузки шрифтов.
 */
export function FitText({
  as: Tag = 'h1',
  id,
  className = '',
  children,
}: {
  as?: 'h1' | 'h2' | 'p'
  id?: string
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLHeadingElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    let frame = 0
    const fit = () => {
      el.style.fontSize = '' // вернуть размер из CSS и измерить заново
      const { scrollWidth, clientWidth } = el
      if (clientWidth > 0 && scrollWidth > clientWidth) {
        const size = parseFloat(getComputedStyle(el).fontSize)
        el.style.fontSize = `${Math.floor(size * (clientWidth / scrollWidth) * 0.98)}px`
      }
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(fit)
    }
    fit()
    const ro = new ResizeObserver(schedule)
    ro.observe(el.parentElement ?? el)
    document.fonts?.ready.then(schedule).catch(() => undefined)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
    }
  }, [children])

  return (
    <Tag ref={ref} id={id} className={`whitespace-nowrap ${className}`}>
      {children}
    </Tag>
  )
}
