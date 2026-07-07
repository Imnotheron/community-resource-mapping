'use client'

import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { ArrowRight, Activity, ShieldCheck } from 'lucide-react'
import { HERO_STATS } from '@/lib/mock-data'

// Lazy-load LocatorVisual because it imports Three.js (~600KB), which is the
// single heaviest dependency in the landing page. Loading it client-side only
// keeps the initial server render fast and reduces compilation memory.
const LocatorVisual = dynamic(
  () => import('./locator-visual').then((m) => m.LocatorVisual),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-square w-full max-w-[460px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
      </div>
    ),
  }
)

interface HeroSectionProps {
  onAccessPortal: () => void
}

function CrmsLogoImage({ className, alt = 'Community Resource Mapping System' }: { className?: string; alt?: string }) {
  return (
    <>
      <img
        src="/logos/crms-main-logo.png"
        alt={alt}
        className={className}
        onError={(event) => {
          const img = event.currentTarget

          if (img.dataset.fallback === 'mark') {
            img.src = '/icon.png'
            img.dataset.fallback = 'icon'
            return
          }

          if (img.dataset.fallback === 'icon') {
            img.src = '/favicon.ico'
            img.dataset.fallback = 'favicon'
            return
          }

          if (img.dataset.fallback === 'favicon') {
            img.src = '/logos/san-policarpo.jpg'
            img.dataset.fallback = 'seal'
            return
          }

          if (img.dataset.fallback === 'seal') {
            img.style.display = 'none'

            const fallback = img.nextElementSibling as HTMLElement | null

            if (fallback) {
              fallback.style.display = 'grid'
            }

            return
          }

          img.src = '/logos/crms-system-icon.png'
          img.dataset.fallback = 'mark'
        }}
      />
      <span
        className="hidden h-full w-full place-items-center rounded-2xl bg-emerald-50 text-sm font-black text-emerald-700"
        style={{ display: 'none' }}
      >
        CRMS
      </span>
    </>
  )
}

export function HeroSection({ onAccessPortal }: HeroSectionProps) {
  return (
    <section
      id="overview"
      className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 md:px-8 md:pt-32"
    >
      {/* Ambient background glows */}
      <div
        className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full opacity-30 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full opacity-20 blur-[100px]"
        style={{ background: 'radial-gradient(circle, #34d399, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-8">
        {/* Left — copy */}
        <div className="flex flex-col items-start gap-6 text-left">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-4 rounded-3xl border border-emerald-500/20 bg-white/95 px-4 py-3 text-slate-950 shadow-[0_20px_70px_rgba(16,185,129,0.16)] backdrop-blur-sm"
          >
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-emerald-100 bg-white p-1 shadow-sm">
              <CrmsLogoImage className="h-[118%] w-[118%] scale-[1.4] object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-black leading-tight text-slate-950 md:text-lg">
                Community Resource Mapping System
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                San Policarpo · Eastern Samar
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-950/40 px-3 py-1.5 backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-300">
              Live · Eastern Samar, PH
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-emerald-50 md:text-6xl lg:text-[4.2rem]"
          >
            Mapping care
            <br />
            for every
            <span className="relative ml-3 inline-block">
              <span className="relative z-10 bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                vulnerable
              </span>
              <motion.span
                className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-emerald-400/60"
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.7, delay: 0.6 }}
              />
            </span>
            <br />
            citizen.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="max-w-xl text-base leading-relaxed text-emerald-100/70 md:text-lg"
          >
            A web-based community resource mapping and relief distribution
            system for the Municipality of San Policarpo — connecting field
            workers, administrators, and citizens in real time.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <button
              onClick={onAccessPortal}
              className="group flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-[0_0_24px_rgba(52,211,153,0.4)] transition-all hover:shadow-[0_0_36px_rgba(52,211,153,0.6)] hover:brightness-110"
            >
              Access Portal
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <a
              href="#features"
              className="flex items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-6 py-3 text-sm font-semibold text-emerald-100 backdrop-blur-sm transition-all hover:border-emerald-400/60 hover:bg-emerald-900/40"
            >
              <Activity className="h-4 w-4 text-emerald-400" />
              Explore Features
            </a>
          </motion.div>

          {/* Stats row */}
          <motion.dl
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 grid w-full grid-cols-2 gap-4 border-t border-emerald-500/15 pt-6 sm:grid-cols-4"
          >
            {HERO_STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
                className="flex flex-col gap-0.5"
              >
                <dt className="text-[10px] font-medium uppercase tracking-wider text-emerald-400/60">
                  {stat.label}
                </dt>
                <dd className="text-2xl font-bold tracking-tight text-emerald-50 md:text-3xl">
                  {stat.value.toLocaleString()}
                  <span className="text-emerald-400">{stat.suffix}</span>
                </dd>
              </motion.div>
            ))}
          </motion.dl>
        </div>

        {/* Right — locator visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className="relative flex items-center justify-center"
        >
          <LocatorVisual />

          {/* Floating trust badge */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="absolute -left-2 top-1/4 hidden items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-950/70 px-3 py-2 backdrop-blur-md lg:flex"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-wider text-emerald-400/70">DSWD</span>
              <span className="text-xs font-medium text-emerald-50">Verified</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="absolute -right-2 bottom-1/4 hidden items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-950/70 px-3 py-2 backdrop-blur-md lg:flex"
          >
            <Activity className="h-4 w-4 text-emerald-400" />
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-wider text-emerald-400/70">Real-time</span>
              <span className="text-xs font-medium text-emerald-50">Synced</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
