'use client'

import { motion } from 'framer-motion'
import {
  ArrowRight,
  ClipboardCheck,
  Play,
  ShieldCheck,
  Users,
} from 'lucide-react'

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
  return (
    <section id="overview" className="relative overflow-hidden pt-24 md:pt-28">
      <div className="absolute inset-x-0 top-0 h-[620px] bg-[linear-gradient(135deg,#ffffff_0%,#f8fffc_45%,#eefcf7_100%)]" />
      <div className="pointer-events-none absolute right-[-8rem] top-12 h-96 w-96 rounded-full bg-emerald-100/70 blur-3xl" />
      <div className="pointer-events-none absolute left-[-7rem] top-72 h-80 w-80 rounded-full bg-sky-100/60 blur-3xl" />

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
              <button
                onClick={onAccessPortal}
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_14px_35px_rgba(5,150,105,0.24)] transition hover:bg-emerald-700 hover:shadow-[0_16px_42px_rgba(5,150,105,0.30)]"
              >
                Access Portal
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>

              <a
                href="#roles"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <Play className="h-4 w-4 fill-emerald-600 text-emerald-600" />
                See System Roles
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="relative"
          >
            <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-emerald-100/70 via-sky-50 to-transparent blur-2xl" />

            <div className="relative mx-auto max-w-[720px]">
              <div className="rounded-[1.6rem] border border-slate-300 bg-slate-900 p-2 shadow-[0_35px_90px_rgba(15,23,42,0.22)]">
                <div className="overflow-hidden rounded-[1.1rem] border border-slate-700 bg-white">
                  <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
                    <img
                      src="/logos/san-policarpo.jpg"
                      alt="Municipality of San Policarpo seal"
                      className="h-7 w-7 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">San Policarpo</p>
                      <p className="text-[0.625rem] text-slate-500">Community Resource Mapping System</p>
                    </div>
                  </div>

                  <div className="relative aspect-[16/8.9] bg-slate-100">
                    <iframe
                      title="San Policarpo map preview"
                      src="https://www.openstreetmap.org/export/embed.html?bbox=125.375%2C12.125%2C125.625%2C12.285&layer=mapnik&marker=12.1792%2C125.5072"
                      className="pointer-events-none h-full w-full select-none border-0"
                      loading="lazy"
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                    <div className="absolute inset-0 z-10 cursor-default" aria-hidden="true" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-7 bg-white" aria-hidden="true" />
                    <div className="pointer-events-none absolute bottom-1 right-2 z-30 text-[0.55rem] text-slate-400">
                      © OpenStreetMap contributors
                    </div>

                    <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-white/80 bg-white/95 px-3 py-2 shadow-lg">
                      <p className="text-[0.625rem] font-bold uppercase tracking-[0.16em] text-emerald-600">
                        Map View
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-900">
                        San Policarpo, Eastern Samar
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mx-auto h-3 w-[86%] rounded-b-[999px] bg-gradient-to-b from-slate-300 to-slate-400 shadow-[0_14px_28px_rgba(15,23,42,0.16)]" />

            </div>
          </motion.div>
        </div>

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

          <div className="grid gap-4 md:grid-cols-3">
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
                  className={`rounded-3xl border p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)] ${styles.card}`}
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
