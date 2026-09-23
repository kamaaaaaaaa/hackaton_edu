import { useRef } from 'react'
import { m, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'

// Сейсмограмма: спокойно → всплеск → затухание → спокойно.
function buildWave(width = 1200, height = 120): string {
  const mid = height / 2
  const pts: string[] = []
  for (let x = 0; x <= width; x += 4) {
    const u = x / width
    const burst = Math.exp(-(((u - 0.46) / 0.09) ** 2))
    const tail = Math.exp(-(((u - 0.62) / 0.16) ** 2)) * 0.35
    const env = burst + tail
    const y =
      Math.sin(x * 0.045) * 1.2 +
      Math.sin(x * 0.31) * env * 38 +
      Math.sin(x * 0.83 + 1.3) * env * 14
    pts.push(`${x},${(mid + y).toFixed(1)}`)
  }
  return `M${pts.join(' L')}`
}

const WAVE = buildWave()

/**
 * Волна «прорисовывается» по мере скролла. Только transform: внешний слой
 * сдвигается влево, внутренний — ровно на столько же вправо, поэтому
 * рисунок стоит на месте, а видимая область растёт слева направо.
 */
export function RevealWave({ className = '', stroke = '#111113' }: { className?: string; stroke?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 95%', 'end 40%'] })
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 })
  const outer = useTransform(progress, (v) => `${(v - 1) * 100}%`)
  const inner = useTransform(progress, (v) => `${(1 - v) * 100}%`)

  const svg = (
    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="block h-20 w-full sm:h-28">
      <path d={WAVE} fill="none" stroke={stroke} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  )

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} aria-hidden="true">
      {reduce ? (
        svg
      ) : (
        <m.div style={{ x: outer }} className="overflow-hidden will-change-transform">
          <m.div style={{ x: inner }} className="will-change-transform">
            {svg}
          </m.div>
        </m.div>
      )}
    </div>
  )
}
