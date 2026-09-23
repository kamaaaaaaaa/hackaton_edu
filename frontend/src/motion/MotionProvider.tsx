import { LazyMotion, MotionConfig } from 'framer-motion'
import type { ReactNode } from 'react'

const loadFeatures = () => import('./features').then((m) => m.default)

/**
 * LazyMotion + strict: только лёгкие `m.*` компоненты, фичи — отдельным чанком.
 * reducedMotion="user": при prefers-reduced-motion Framer отключает
 * transform/layout-анимации (остаются мгновенные изменения).
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
