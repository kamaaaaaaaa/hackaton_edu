import type { EvacuationPlan } from '@/store/plan'
import { formatClock, formatDistance } from '@/lib/format'

const W = 320
const H = 220
const PAD = 22

/**
 * Офлайн-план: сохранённый маршрут схемой на миллиметровке — без тайлов карты,
 * работает без интернета. Проекция: равнопромежуточная с поправкой cos(lat).
 */
export function OfflinePlan({ plan, className = '' }: { plan: EvacuationPlan; className?: string }) {
  const coords = plan.coordinates
  const lat0 = (plan.from.lat + plan.to.lat) / 2
  const k = Math.cos((lat0 * Math.PI) / 180)
  const xs = coords.map(([lng]) => lng * k)
  const ys = coords.map(([, lat]) => lat)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const scale = Math.min((W - PAD * 2) / (maxX - minX || 1e-6), (H - PAD * 2) / (maxY - minY || 1e-6))
  const offX = (W - (maxX - minX) * scale) / 2
  const offY = (H - (maxY - minY) * scale) / 2
  const project = ([lng, lat]: [number, number]): [number, number] => [
    offX + (lng * k - minX) * scale,
    H - (offY + (lat - minY) * scale),
  ]
  const pts = coords.map(project)
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const [sx, sy] = pts[0]
  const [ex, ey] = pts[pts.length - 1]

  return (
    <figure className={`card overflow-hidden ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full bg-mm" role="img" aria-label={`${plan.from.label} → ${plan.to.name}`}>
        <path d={d} fill="none" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d={d} fill="none" stroke="#5B3DF5" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={sx} cy={sy} r="7" fill="#5B3DF5" stroke="#FFFFFF" strokeWidth="3" />
        <circle cx={ex} cy={ey} r="8" fill="#D4FF3A" stroke="#111113" strokeWidth="3" />
      </svg>
      <figcaption className="grid grid-cols-2 gap-px bg-line">
        <div className="bg-surface px-3.5 py-2.5">
          <div className="font-mono text-2xl font-semibold">{formatClock(plan.timeSec)}</div>
          <div className="cap">{formatDistance(plan.lengthM)}</div>
        </div>
        <div className="bg-surface px-3.5 py-2.5">
          <div className="truncate text-sm font-semibold">{plan.to.name}</div>
          <div className="truncate text-xs text-muted">{plan.to.address}</div>
        </div>
      </figcaption>
    </figure>
  )
}
