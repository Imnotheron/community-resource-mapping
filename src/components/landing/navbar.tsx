'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

interface NavbarProps {
  onAccessPortal: () => void
}

const NAV_LINKS = [
  { label: 'Overview', href: '#overview' },
  { label: 'Features', href: '#features' },
  { label: 'Partners', href: '#partners' },
]

function CrmsLogoImage({ className, alt = 'Community Resource Mapping System' }: { className?: string; alt?: string }) {
  return (
    <>
      <img
        src="/icon.png"
        alt={alt}
        className={className}
        onError={(event) => {
          const img = event.currentTarget

          if (img.dataset.fallback === 'logos') {
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
          img.dataset.fallback = 'logos'
        }}
      />
      <span
        className="hidden h-full w-full place-items-center rounded-full bg-emerald-50 text-[9px] font-black text-emerald-700"
        style={{ display: 'none' }}
      >
        CRMS
      </span>
    </>
  )
}

export function Navbar({ onAccessPortal }: NavbarProps) {
  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <a href="#top" className="group flex items-center gap-2.5">
          <div className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-emerald-400/30 bg-white p-0.5 shadow-[0_0_22px_rgba(16,185,129,0.20)]">
            <CrmsLogoImage className="h-[118%] w-[118%] scale-[1.4] object-contain" />
            <motion.span
              className="pointer-events-none absolute inset-0 rounded-2xl border border-emerald-400/50"
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            />
          </div>

          <div className="hidden flex-col leading-none sm:flex">
            <span className="text-sm font-black tracking-tight text-emerald-50">
              CRMS
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-400/70">
              San Policarpo
            </span>
          </div>
        </a>

        <div className="hidden items-center gap-1 rounded-full border border-emerald-500/15 bg-emerald-950/40 px-2 py-1.5 backdrop-blur-md md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-1.5 text-xs font-medium text-emerald-100/70 transition-colors hover:bg-emerald-500/10 hover:text-emerald-50"
            >
              {link.label}
            </a>
          ))}
        </div>

        <button
          onClick={onAccessPortal}
          className="group flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-50 transition-all hover:border-emerald-300/70 hover:bg-emerald-400/20 hover:shadow-[0_0_20px_rgba(52,211,153,0.35)] md:px-5 md:text-sm"
        >
          Access Portal
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </nav>
    </motion.header>
  )
}
