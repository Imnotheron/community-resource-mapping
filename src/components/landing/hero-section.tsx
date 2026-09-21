'use client'

import { motion, useReducedMotion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { SilkLightBackground } from '@/components/ui/silk-light-background'
import {
  ArrowRight,
  ClipboardCheck,
  Play,
  ShieldCheck,
  Users,
} from 'lucide-react'

const StaticSanPolicarpoMapPreview = dynamic(
  () => import('./static-san-policarpo-map-preview').then((m) => m.StaticSanPolicarpoMapPreview),
  { ssr: false }
)

interface HeroSectionProps {
  onAccessPortal: () => void
}

const ROLE_CARDS = [
  {
    title: 'Administrator',
    description: 'Manage users, registrations, relief approvals, and reports.',
    icon: ShieldCheck,
    tone: 'emerald',
  },
  {
    title: 'Field Worker',
    description: 'Register citizens, record distributions, and submit field updates.',
    icon: ClipboardCheck,
    tone: 'sky',
  },
  {
    title: 'Vulnerable Citizen',
    description: 'View your profile, relief history, announcements, and feedback.',
    icon: Users,
    tone: 'violet',
  },
] as const

const roleStyles = {
  emerald: {
    card: 'border-emerald-100 bg-emerald-50/70',
    icon: 'bg-emerald-100 text-emerald-700',
  },
  sky: {
    card: 'border-sky-100 bg-sky-50/70',
    icon: 'bg-sky-100 text-sky-700',
  },
  violet: {
    card: 'border-violet-100 bg-violet-50/70',
    icon: 'bg-violet-100 text-violet-700',
  },
} as const

export function HeroSection({ onAccessPortal }: HeroSectionProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section id="overview" className="relative overflow-hidden pt-24 md:pt-28">
      <SilkLightBackground intensity="soft" />
      <div className="pointer-events-none absolute left-1/2 top-20 h-56 w-[52rem] max-w-[85vw] -translate-x-1/2 rounded-full bg-white/72 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid items-center gap-10 py-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="max-w-2xl"
          >
            <p className="mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.28em] text-emerald-700">
              People · Resources · Safer Communities
            </p>

            <h1 className="text-balance text-4xl font-black leading-[1.02] tracking-[-0.04em] text-slate-950 sm:text-5xl md:text-6xl lg:text-[4.15rem]">
              Community Resource
              <span className="block text-emerald-600">Mapping System</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 md:text-lg">
              A web-based system for the Municipality of San Policarpo that
              connects administrators, field workers, and vulnerable citizens
              for organized registration, relief distribution, mapping, and
              community updates.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <motion.button
                onClick={onAccessPortal}
                whileHover={prefersReducedMotion ? undefined : { y: -3, scale: 1.015 }}
                whileTap={prefersReducedMotion ? undefined : { y: 1, scale: 0.985 }}
                transition={{ type: 'spring', stiffness: 340, damping: 22 }}
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_14px_35px_rgba(5,150,105,0.24)] transition-colors hover:bg-emerald-700 hover:shadow-[0_16px_42px_rgba(5,150,105,0.30)]"
              >
                Access Portal
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </motion.button>

              <motion.a
                href="#about"
                whileHover={prefersReducedMotion ? undefined : { y: -3, scale: 1.01 }}
                whileTap={prefersReducedMotion ? undefined : { y: 1, scale: 0.99 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50"
              >
                <Play className="h-4 w-4 fill-emerald-600 text-emerald-600" />
                About
              </motion.a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="relative [perspective:1200px]"
          >
            <motion.div
              className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-emerald-100/70 via-sky-50 to-transparent blur-2xl"
              animate={prefersReducedMotion ? undefined : { opacity: [0.72, 1, 0.72], scale: [1, 1.035, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />

            <motion.div
              className="relative mx-auto w-full max-w-[760px] [transform-style:preserve-3d]"
              animate={
                prefersReducedMotion
                  ? undefined
                  : {
                      y: [0, -8, 0],
                      rotateX: [0, 1.2, 0],
                      rotateY: [-1.2, 1.2, -1.2],
                    }
              }
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              whileHover={
                prefersReducedMotion
                  ? undefined
                  : { y: -10, rotateX: 1.5, rotateY: -1.5, scale: 1.01 }
              }
            >
              <div className="relative rounded-[2rem] border-[8px] border-slate-950 bg-slate-950 shadow-[0_30px_80px_rgba(15,23,42,0.24)]">
                <div className="absolute left-1/2 top-2.5 z-20 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-slate-700 ring-2 ring-slate-800" />

                <div className="overflow-hidden rounded-[1.35rem] bg-white">
                  <motion.div
                    className="relative aspect-[16/10] bg-slate-100"
                    animate={
                      prefersReducedMotion
                        ? undefined
                        : { scale: [1.012, 1.02, 1.012], x: [0, 2, 0], y: [0, -1, 0] }
                    }
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <StaticSanPolicarpoMapPreview />
                  </motion.div>
                </div>
              </div>

              <div className="mx-auto h-3 w-[84%] rounded-b-[999px] bg-slate-300/80 blur-[1px]" />

              <div className="relative mx-auto -mt-1 h-7 w-[94%] rounded-b-[2rem] bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 shadow-[0_18px_30px_rgba(15,23,42,0.18)]">
                <div className="absolute left-1/2 top-2 h-1.5 w-24 -translate-x-1/2 rounded-full bg-slate-500/25" />
              </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.section
          id="about"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55 }}
          className="scroll-mt-28 pb-12 pt-4 md:pb-14"
        >
          <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.07)] backdrop-blur-xl md:p-8">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-[0.6875rem] font-bold uppercase tracking-[0.24em] text-emerald-600">
                  About the System
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                  One platform for community resource mapping and relief coordination.
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base">
                  The Community Resource Mapping System helps the Municipality of San Policarpo
                  organize vulnerable citizen records, map community information, manage relief
                  distribution, publish announcements, collect feedback, and support field reporting
                  through one connected web-based platform.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Community Mapping', 'View mapped community and household information for authorized operations.'],
                  ['Relief Distribution', 'Record and monitor assistance distributed to registered households.'],
                  ['Registration & Approval', 'Manage vulnerable citizen registration and approval workflows.'],
                  ['Communication', 'Share announcements, field notes, reports, and citizen feedback.'],
                ].map(([title, description]) => (
                  <motion.div
                    key={title}
                    whileHover={prefersReducedMotion ? undefined : { y: -4, scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                    className="rounded-2xl border border-white/80 bg-white/68 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-lg"
                  >
                    <h3 className="text-sm font-bold text-slate-950">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.div
          id="roles"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55 }}
          className="pb-16 pt-5 md:pb-20"
        >
          <div className="mb-6 text-center">
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.24em] text-emerald-600">
              Built for San Policarpo
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
              Three roles. One connected system.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3 [perspective:1100px]">
            {ROLE_CARDS.map((role, index) => {
              const Icon = role.icon
              const styles = roleStyles[role.tone]

              return (
                <motion.article
                  key={role.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: index * 0.06 }}
                  whileHover={
                    prefersReducedMotion
                      ? undefined
                      : {
                          y: -6,
                          rotateX: 1.5,
                          rotateY: index === 1 ? 0 : index === 0 ? 1.2 : -1.2,
                          scale: 1.015,
                        }
                  }
                  className={`rounded-3xl border border-white/80 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.07)] backdrop-blur-xl [transform-style:preserve-3d] ${styles.card}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${styles.icon}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-950">{role.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {role.description}
                      </p>
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
