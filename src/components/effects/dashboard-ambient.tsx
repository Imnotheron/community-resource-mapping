'use client'

import { useReducedMotion } from 'framer-motion'

/**
 * Ambient layer shared by every role dashboard.
 * It is CSS-driven, pointer-events none, and respects reduced motion.
 */
export function DashboardAmbient() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="dashboard-ambient" aria-hidden="true" data-reduce-motion={reduceMotion ? 'true' : 'false'}>
      <div className="dashboard-ambient__grid" />
      <div className="dashboard-ambient__orb dashboard-ambient__orb--one" />
      <div className="dashboard-ambient__orb dashboard-ambient__orb--two" />
      <div className="dashboard-ambient__orb dashboard-ambient__orb--three" />
      <div className="dashboard-ambient__scan" />
    </div>
  )
}
