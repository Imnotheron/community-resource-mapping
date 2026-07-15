'use client'

import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'
import { assetsToMarkers, ALL_ASSETS, SAN_POLICARPO_CENTER } from '@/lib/mock-data'

/**
 * LocatorVisual — the prominent central hero visual.
 * Renders a stylized radar/map with:
 *  - concentric pulse rings emanating from the center
 *  - a glowing locator pin at the centroid
 *  - floating data-point markers positioned from mock asset coordinates
 *  - animated SVG connection lines linking the pin to each marker
 *  - a faint grid background evoking a topographic map
 */
export function LocatorVisual() {
  const markers = assetsToMarkers(ALL_ASSETS).slice(0, 8)

  // Normalize each marker's lat/lng to a percentage offset from center.
  // San Policarpo spans ~0.01 deg, so we scale up for visible spread.
  const spread = 0.015
  const toPercent = (val: number, center: number) => {
    const offset = (val - center) / spread // -1..1
    return 50 + offset * 42 // 8%..92%
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px]">
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(52,211,153,0.5), rgba(16,185,129,0.15) 50%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Concentric pulse rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`ring-${i}`}
          className="absolute left-1/2 top-1/2 rounded-full border border-emerald-400/30"
          style={{
            width: '40%',
            height: '40%',
            translateX: '-50%',
            translateY: '-50%',
          }}
          animate={{
            scale: [1, 2.4],
            opacity: [0.6, 0],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            delay: i * 1.1,
            ease: 'easeOut',
          }}
          aria-hidden="true"
        />
      ))}

      {/* Static range rings */}
      {[0.5, 0.75, 1].map((s, i) => (
        <div
          key={`range-${i}`}
          className="absolute left-1/2 top-1/2 rounded-full border border-emerald-500/10"
          style={{
            width: `${s * 100}%`,
            height: `${s * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
          aria-hidden="true"
        />
      ))}

      {/* Grid background — topographic feel */}
      <div
        className="absolute inset-[8%] rounded-full overflow-hidden opacity-[0.18]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(110,231,183,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(110,231,183,0.5) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(circle, black 55%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(circle, black 55%, transparent 75%)',
        }}
      />

      {/* SVG connection lines — pin to each marker */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {markers.map((m, i) => {
          const x = toPercent(m.position.longitude, SAN_POLICARPO_CENTER.longitude)
          const y = toPercent(m.position.latitude, SAN_POLICARPO_CENTER.latitude)
          // invert y because SVG y grows downward but lat grows upward
          const yInv = 100 - y
          return (
            <motion.line
              key={`line-${m.id}`}
              x1="50"
              y1="50"
              x2={x}
              y2={yInv}
              stroke="url(#lineGrad)"
              strokeWidth="0.25"
              strokeDasharray="1.5 1.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.7, 0.3] }}
              transition={{
                duration: 2,
                delay: 0.4 + i * 0.15,
                opacity: { duration: 3, repeat: Infinity, repeatType: 'reverse', delay: 0.4 + i * 0.15 },
              }}
            />
          )
        })}
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0.2" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating data-point markers */}
      {markers.map((m, i) => {
        const x = toPercent(m.position.longitude, SAN_POLICARPO_CENTER.longitude)
        const y = toPercent(m.position.latitude, SAN_POLICARPO_CENTER.latitude)
        return (
          <motion.div
            key={`marker-${m.id}`}
            className="absolute"
            style={{ left: `${x}%`, top: `${y}%`, translateX: '-50%', translateY: '-50%' }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6 + i * 0.12, type: 'spring', stiffness: 200, damping: 14 }}
          >
            {m.pulse && (
              <motion.span
                className="absolute left-1/2 top-1/2 block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ backgroundColor: m.color }}
                animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
            <motion.span
              className="relative block h-2.5 w-2.5 rounded-full ring-2 ring-emerald-950/60"
              style={{ backgroundColor: m.color, boxShadow: `0 0 10px ${m.color}` }}
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3 + (i % 3), repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        )
      })}

      {/* Central locator pin */}
      <motion.div
        className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
        initial={{ scale: 0, y: -20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 180, damping: 12 }}
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          className="relative flex flex-col items-center"
        >
          {/* Pin glow */}
          <div
            className="absolute -top-2 h-14 w-14 rounded-full blur-xl"
            style={{ background: 'rgba(52,211,153,0.7)' }}
            aria-hidden="true"
          />
          {/* Pin body */}
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-emerald-300 bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-[0_0_24px_rgba(52,211,153,0.8)]">
            <MapPin className="h-6 w-6 text-emerald-950" strokeWidth={2.5} />
          </div>
          {/* Pin tail */}
          <div
            className="-mt-1 h-4 w-1 rotate-0 rounded-b-full bg-emerald-500 shadow-[0_4px_12px_rgba(52,211,153,0.6)]"
            aria-hidden="true"
          />
        </motion.div>
      </motion.div>

      {/* Coordinate label — bottom corner */}
      <motion.div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-emerald-500/20 bg-emerald-950/40 px-3 py-1 font-mono text-[0.625rem] text-emerald-300/80 backdrop-blur-sm"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        12.1792° N · 125.5072° E
      </motion.div>
    </div>
  )
}
