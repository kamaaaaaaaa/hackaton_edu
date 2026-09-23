import { useRef, type ReactNode, type PointerEvent } from 'react'
import { m, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'

const finePointer =
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches

/**
 * Магнитный эффект: элемент тянется к курсору (только transform).
 * На тач-устройствах и при reduced motion — выключен.
 */
export function Magnetic({
  children,
  strength = 0.3,
  className = '',
}: {
  children: ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 240, damping: 16, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 240, damping: 16, mass: 0.4 })

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || !finePointer || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * strength)
    y.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  const reset = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <m.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ x: sx, y: sy }}
      className={`inline-flex ${className}`}
    >
      {children}
    </m.div>
  )
}
