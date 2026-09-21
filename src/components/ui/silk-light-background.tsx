'use client'

import { motion, useReducedMotion } from 'framer-motion'

interface SilkLightBackgroundProps {
  className?: string
  intensity?: 'soft' | 'medium'
}

const DOTS = [
  ['8%', '20%', 7, 0],
  ['17%', '72%', 5, 1.2],
  ['29%', '42%', 6, 0.5],
  ['41%', '78%', 7, 1.7],
  ['55%', '26%', 5, 0.9],
  ['68%', '66%', 6, 1.4],
  ['82%', '18%', 7, 0.3],
  ['91%', '74%', 5, 1.9],
] as const

export function SilkLightBackground({
  className = '',
  intensity = 'medium',
}: SilkLightBackgroundProps) {
  const reduceMotion = useReducedMotion()
  const strong = intensity === 'medium'

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#fbfffd_44%,#f7fbff_72%,#ffffff_100%)]" />

      <motion.div
        className={`absolute left-[-18%] top-[10%] h-[28%] w-[136%] rounded-[50%] blur-[38px] ${
          strong
            ? 'bg-[linear-gradient(90deg,transparent_0%,rgba(110,231,183,.48)_22%,rgba(125,211,252,.56)_52%,rgba(196,181,253,.40)_78%,transparent_100%)]'
            : 'bg-[linear-gradient(90deg,transparent_0%,rgba(110,231,183,.30)_22%,rgba(125,211,252,.36)_52%,rgba(196,181,253,.24)_78%,transparent_100%)]'
        }`}
        animate={reduceMotion ? undefined : { x: ['-5%', '5%', '-3%', '-5%'], y: [0, 28, -14, 0], scaleY: [0.92, 1.16, 0.98, 0.92] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className={`absolute left-[-15%] top-[34%] h-[31%] w-[130%] rounded-[50%] blur-[44px] ${
          strong
            ? 'bg-[linear-gradient(90deg,transparent_0%,rgba(224,242,254,.25)_10%,rgba(167,243,208,.46)_34%,rgba(186,230,253,.62)_58%,rgba(221,214,254,.42)_82%,transparent_100%)]'
            : 'bg-[linear-gradient(90deg,transparent_0%,rgba(224,242,254,.18)_10%,rgba(167,243,208,.28)_34%,rgba(186,230,253,.40)_58%,rgba(221,214,254,.26)_82%,transparent_100%)]'
        }`}
        animate={reduceMotion ? undefined : { x: ['4%', '-6%', '3%', '4%'], y: [0, -22, 18, 0], scaleY: [1.06, 0.90, 1.18, 1.06] }}
        transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className={`absolute left-[-20%] top-[61%] h-[24%] w-[140%] rounded-[50%] blur-[36px] ${
          strong
            ? 'bg-[linear-gradient(90deg,transparent_0%,rgba(196,181,253,.26)_18%,rgba(125,211,252,.48)_48%,rgba(110,231,183,.38)_75%,transparent_100%)]'
            : 'bg-[linear-gradient(90deg,transparent_0%,rgba(196,181,253,.18)_18%,rgba(125,211,252,.30)_48%,rgba(110,231,183,.22)_75%,transparent_100%)]'
        }`}
        animate={reduceMotion ? undefined : { x: ['-4%', '6%', '-2%', '-4%'], y: [0, 18, -10, 0], scaleY: [0.96, 1.12, 0.92, 0.96] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute left-[-25%] top-[30%] h-px w-[150%] bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent shadow-[0_0_18px_rgba(110,231,183,.55)]"
        animate={reduceMotion ? undefined : { x: ['-8%', '8%', '-8%'], y: [0, 16, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-[-25%] top-[56%] h-px w-[150%] bg-gradient-to-r from-transparent via-sky-300/75 to-transparent shadow-[0_0_20px_rgba(125,211,252,.55)]"
        animate={reduceMotion ? undefined : { x: ['7%', '-7%', '7%'], y: [0, -14, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] [background-size:64px_64px]" />

      {DOTS.map(([left, top, size, delay], index) => (
        <motion.span
          key={index}
          className="absolute rounded-full bg-white shadow-[0_0_20px_rgba(16,185,129,.34)] ring-1 ring-emerald-200/70"
          style={{ left, top, width: size, height: size }}
          animate={reduceMotion ? undefined : { x: [0, 12, -6, 0], y: [0, -18, 8, 0], opacity: [0.32, 0.9, 0.45, 0.32] }}
          transition={{ duration: 7 + index, delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_34%,rgba(255,255,255,.18)_68%,rgba(255,255,255,.58)_100%)]" />
    </div>
  )
}
