'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

interface NavbarProps {
  onAccessPortal: () => void
}

export function Navbar({ onAccessPortal }: NavbarProps) {
  return (
    <motion.header
      initial={{ y: -18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45 }}
      className="fixed inset-x-0 top-0 z-50 border-b border-slate-100 bg-white/92 backdrop-blur-xl"
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 md:px-8">
        <a href="#top" className="flex items-center gap-3">
          <img
            src="/logos/san-policarpo.jpg"
            alt="Municipality of San Policarpo"
            className="h-11 w-11 rounded-full border border-emerald-100 object-cover shadow-sm"
          />
          <div className="hidden sm:block">
            <p className="text-sm font-black tracking-tight text-slate-950">SAN POLICARPO</p>
            <p className="text-[0.6875rem] text-slate-500">Community Resource Mapping System</p>
          </div>
        </a>

        <div className="hidden items-center gap-7 md:flex">
          <a href="#overview" className="text-sm font-semibold text-slate-700 transition hover:text-emerald-600">
            Home
          </a>
          <a href="#roles" className="text-sm font-semibold text-slate-700 transition hover:text-emerald-600">
            Roles
          </a>
        </div>

        <button
          onClick={onAccessPortal}
          className="group inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
        >
          Access Portal
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </nav>
    </motion.header>
  )
}
