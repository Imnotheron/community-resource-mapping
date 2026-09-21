'use client'

import { motion, useReducedMotion } from 'framer-motion'

const PARTICLES = [
  { left: '7%', top: '18%', size: 7, delay: 0, duration: 11 },
  { left: '14%', top: '72%', size: 5, delay: 1.4, duration: 13 },
  { left: '24%', top: '36%', size: 6, delay: 0.8, duration: 12 },
  { left: '33%', top: '82%', size: 8, delay: 2.1, duration: 15 },
  { left: '43%', top: '20%', size: 5, delay: 1.1, duration: 10 },
  { left: '52%', top: '64%', size: 7, delay: 2.8, duration: 14 },
  { left: '61%', top: '30%', size: 6, delay: 0.4, duration: 12 },
  { left: '69%', top: '76%', size: 5, delay: 1.8, duration: 11 },
  { left: '78%', top: '16%', size: 8, delay: 2.5, duration: 16 },
  { left: '86%', top: '50%', size: 6, delay: 0.7, duration: 13 },
  { left: '93%', top: '84%', size: 5, delay: 1.6, duration: 12 },
]

interface SilkLightBackgroundProps {
  className?: string
  intensity?: 'soft' | 'medium'
}

export function SilkLightBackground({
  className = '',
  intensity = 'medium',
}: SilkLightBackgroundProps) {
  const prefersReducedMotion = useReducedMotion()
  const waveOpacity = intensity === 'soft' ? 'opacity-[0.20]' : 'opacity-[0.28]'

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#fbfffd_38%,#f8fbff_72%,#ffffff_100%)]" />

      <motion.div
        className="absolute -left-24 -top-28 h-[34rem] w-[34rem] rounded-full bg-emerald-200/35 blur-[110px]"
        animate={
          prefersReducedMotion
            ? undefined
            : { x: [0, 36, 8, 0], y: [0, 28, -6, 0], scale: [1, 1.08, 1.03, 1] }
        }
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-28 top-8 h-[32rem] w-[32rem] rounded-full bg-sky-200/30 blur-[115px]"
        animate={
          prefersReducedMotion
            ? undefined
            : { x: [0, -28, -8, 0], y: [0, 16, 30, 0], scale: [1, 1.05, 1.1, 1] }
        }
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-12rem] left-[28%] h-[30rem] w-[30rem] rounded-full bg-violet-200/20 blur-[125px]"
        animate={
          prefersReducedMotion
            ? undefined
            : { x: [0, 24, -18, 0], y: [0, -22, -8, 0], scale: [1, 1.08, 1.02, 1] }
        }
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />

      <svg
        className={`absolute inset-0 h-full w-full ${waveOpacity}`}
        viewBox="0 0 1600 900"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="silk-wave-a" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="18%" stopColor="#a7f3d0" stopOpacity="0.85" />
            <stop offset="54%" stopColor="#bae6fd" stopOpacity="0.9" />
            <stop offset="82%" stopColor="#ddd6fe" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="silk-wave-b" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="26%" stopColor="#d1fae5" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#bfdbfe" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <filter id="silk-blur-a">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="silk-blur-b">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        <motion.path
          fill="none"
          stroke="url(#silk-wave-a)"
          strokeWidth="34"
          strokeLinecap="round"
          filter="url(#silk-blur-a)"
          initial={false}
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  d: [
                    'M-90 330 C 210 205, 365 510, 690 385 S 1160 210, 1690 360',
                    'M-90 365 C 220 245, 420 455, 705 350 S 1175 255, 1690 325',
                    'M-90 330 C 210 205, 365 510, 690 385 S 1160 210, 1690 360',
                  ],
                }
          }
          d="M-90 330 C 210 205, 365 510, 690 385 S 1160 210, 1690 360"
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.path
          fill="none"
          stroke="url(#silk-wave-b)"
          strokeWidth="56"
          strokeLinecap="round"
          filter="url(#silk-blur-b)"
          initial={false}
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  d: [
                    'M-120 620 C 170 470, 420 720, 760 570 S 1260 450, 1710 615',
                    'M-120 590 C 160 520, 450 650, 760 545 S 1280 500, 1710 585',
                    'M-120 620 C 170 470, 420 720, 760 570 S 1260 450, 1710 615',
                  ],
                }
          }
          d="M-120 620 C 170 470, 420 720, 760 570 S 1260 450, 1710 615"
          transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>

      <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] [background-size:64px_64px]" />

      {PARTICLES.map((particle, index) => (
        <motion.span
          key={index}
          className="absolute rounded-full bg-emerald-400/25 shadow-[0_0_18px_rgba(16,185,129,0.26)]"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
          }}
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  y: [0, -16, 0],
                  x: [0, 7, -4, 0],
                  opacity: [0.12, 0.5, 0.18, 0.12],
                }
          }
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(255,255,255,0.42)_78%,rgba(255,255,255,0.78)_100%)]" />
    </div>
  )
}
