'use client'

import { motion } from 'framer-motion'
import { MapPin, ArrowRight } from 'lucide-react'

interface NavbarProps {
  onAccessPortal: () => void
}

const NAV_LINKS = [
  { label: 'Overview', href: '#overview' },
  { label: 'Features', href: '#features' },
  { label: 'Partners', href: '#partners' },
]

export function Navbar({ onAccessPortal }: NavbarProps) {
  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        {/* Brand */}
        <a href="#top" className="group flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-emerald-400/30 bg-white">
            <img
              src="/logos/san-policarpo.jpg"
              alt="San Policarpo"
              className="h-full w-full object-contain"
            />
            <motion.span
              className="absolute inset-0 rounded-lg border border-emerald-400/50"
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            />
          </div>
          <div className="hidden flex-col leading-none sm:flex">
            <span className="text-sm font-semibold tracking-tight text-emerald-50">
              San Policarpo
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-400/70">
              Resource Mapping
            </span>
          </div>
        </a>

        {/* Center nav links — desktop only */}
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

        {/* CTA */}
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
