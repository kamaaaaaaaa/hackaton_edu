import { m } from 'framer-motion'
import type { RiskLevel } from '@/api/types'

const CX = 110
const CY = 108
const R = 88

/** Точка на дуге: t=0 — слева (180°), t=1 — справа (0°). */
function polar(t: number, r = R): [number, number] {
  const a = Math.PI * (1 - t)
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)]
}

function arc(t0: number, t1: number): string {
  const [x0, y0] = polar(t0)
  const [x1, y1] = polar(t1)
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

const LEVEL_TEXT: Record<RiskLevel, string> = {
  low: 'text-safe-ink',
  mid: 'text-warn-ink',
  high: 'text-signal-ink',
}

/**
 * Дуговая шкала-спидометр. Зоны по формуле: 0–1 низкий · 2–3 средний · 4+ высокий.
 * Стрелка вращается (только transform). score = null — стрелки нет.
 */
export function RiskGauge({
  score,
  max,
  level,
  levelLabel,
  compact = false,
}: {
  score: number | null
  max: number
  level: RiskLevel | null
  levelLabel: string
  /** Меньше — для боковой панели карты. */
  compact?: boolean
}) {
  const lowEnd = 1.5 / max
  const midEnd = 3.5 / max
  const angle = score === null ? -90 : -90 + (Math.min(score, max) / max) * 180

  return (
    <div className={`relative mx-auto w-full ${compact ? 'max-w-[190px]' : 'max-w-[260px]'}`}>
      <svg viewBox="0 0 220 124" className="block w-full" role="img" aria-label={levelLabel}>
        <path d={arc(0, 1)} stroke="rgba(17,17,19,0.07)" strokeWidth="16" fill="none" />
        <path d={arc(0.005, lowEnd - 0.01)} stroke="#1FCB8B" strokeWidth="16" fill="none" />
        <path d={arc(lowEnd + 0.01, midEnd - 0.01)} stroke="#FFB020" strokeWidth="16" fill="none" />
        <path d={arc(midEnd + 0.01, 0.995)} stroke="#FF3B1F" strokeWidth="16" fill="none" />
        {Array.from({ length: max + 1 }, (_, i) => {
          const [x, y] = polar(i / max, R - 20)
          return (
            <text
              key={i}
              x={x}
              y={y + 3}
              textAnchor="middle"
              className="fill-faint font-mono"
              fontSize="8"
            >
              {i}
            </text>
          )
        })}
        {score !== null && (
          <m.g
            style={{ originX: `${CX}px`, originY: `${CY}px` }}
            initial={{ rotate: -90 }}
            animate={{ rotate: angle }}
            transition={{ type: 'spring', stiffness: 60, damping: 11, mass: 0.9, delay: 0.2 }}
          >
            <line x1={CX} y1={CY} x2={CX} y2={CY - R + 6} stroke="#111113" strokeWidth="3" strokeLinecap="round" />
          </m.g>
        )}
        <circle cx={CX} cy={CY} r="7" fill="#111113" />
        <circle cx={CX} cy={CY} r="2.5" fill="#D4FF3A" />
      </svg>
      <div className="-mt-1 text-center">
        <div className={`font-mono font-semibold leading-none text-ink ${compact ? 'text-2xl' : 'text-3xl'}`}>
          {score === null ? '—' : score}
          <span className="text-base text-faint">/{max}</span>
        </div>
        <div className={`mt-1 font-display text-sm font-semibold ${level ? LEVEL_TEXT[level] : 'text-muted'}`}>
          {levelLabel}
        </div>
      </div>
    </div>
  )
}
