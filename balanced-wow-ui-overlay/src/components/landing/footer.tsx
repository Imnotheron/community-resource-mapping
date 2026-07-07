'use client'

import { motion } from 'framer-motion'
import { MapPin, ArrowUpRight } from 'lucide-react'

interface FooterProps {
  onAccessPortal: () => void
}

const PARTNERS = [
  { logo: '/logos/san-policarpo.jpg', name: 'LGU San Policarpo', role: 'Local Government Unit' },
  { logo: '/logos/essu.jpg', name: 'ESSU', role: 'Eastern Samar State University' },
  { logo: '/logos/dswd.png', name: 'DSWD', role: 'Dept. of Social Welfare & Development' },
]

const LINK_GROUPS = [
  {
    title: 'Portal',
    links: [
      { label: 'Admin Dashboard', href: '#' },
      { label: 'Worker Portal', href: '#' },
      { label: 'Citizen Access', href: '#' },
      { label: 'Sign In', href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Relief Distribution', href: '#features' },
      { label: 'Vulnerable Registry', href: '#features' },
      { label: 'Community Map', href: '#overview' },
      { label: 'Announcements', href: '#' },
    ],
  },
  {
    title: 'Municipality',
    links: [
      { label: 'About San Policarpo', href: '#' },
      { label: 'Barangays', href: '#' },
      { label: 'Contact MSWDO', href: '#' },
      { label: 'Privacy Policy', href: '#' },
    ],
  },
]

export function Footer({ onAccessPortal }: FooterProps) {
  return (
    <footer id="partners" className="relative mt-20 border-t border-emerald-500/15 px-4 pb-10 pt-16 md:px-8">
      {/* CTA band */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="mx-auto mb-16 max-w-5xl overflow-hidden rounded-3xl border border-emerald-400/25 bg-gradient-to-br from-emerald-950/80 via-emerald-950/40 to-[#061410]/80 p-8 backdrop-blur-sm md:p-12"
      >
        <div
          className="pointer-events-none absolute -top-20 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full opacity-30 blur-[100px]"
          style={{ background: 'radial-gradient(circle, #34d399, transparent 70%)' }}
          aria-hidden="true"
        />
        <div className="relative flex flex-col items-center gap-6 text-center">
          <h2 className="max-w-2xl text-balance text-2xl font-bold tracking-tight text-emerald-50 md:text-4xl">
            Ready to join the community care network?
          </h2>
          <p className="max-w-xl text-sm text-emerald-100/70 md:text-base">
            Administrators, field workers, and citizens — access your portal and start mapping resources today.
          </p>
          <button
            onClick={onAccessPortal}
            className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 px-7 py-3 text-sm font-semibold text-emerald-950 shadow-[0_0_24px_rgba(52,211,153,0.4)] transition-all hover:shadow-[0_0_36px_rgba(52,211,153,0.6)] hover:brightness-110"
          >
            Access Portal
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </motion.div>

      {/* Partners */}
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col items-center gap-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-400/50">
            In partnership with
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
            {PARTNERS.map((p) => {
              return (
                <div
                  key={p.name}
                  className="flex items-center gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-950/30 px-5 py-3 backdrop-blur-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-emerald-400/30 bg-white">
                    <img src={p.logo} alt={p.name} className="h-full w-full object-contain" />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold text-emerald-50">{p.name}</span>
                    <span className="text-[10px] uppercase tracking-wide text-emerald-400/60">{p.role}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Link grid */}
        <div className="grid grid-cols-2 gap-8 border-t border-emerald-500/10 py-10 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-emerald-400/30 bg-white">
                <img src="/logos/san-policarpo.jpg" alt="San Policarpo" className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-sm font-semibold text-emerald-50">San Policarpo</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-400/70">
                  Resource Mapping
                </span>
              </div>
            </div>
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-emerald-100/50">
              A web-based community resource mapping and relief distribution system serving the Municipality of San Policarpo, Eastern Samar.
            </p>
          </div>

          {LINK_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400/60">
                {group.title}
              </h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-xs text-emerald-100/60 transition-colors hover:text-emerald-300"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-emerald-500/10 pt-6 text-[11px] text-emerald-500/50 md:flex-row">
          <p>© {new Date().getFullYear()} Community Resource Mapping System · San Policarpo, Eastern Samar</p>
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            12.1792° N · 125.5072° E
          </p>
        </div>
      </div>
    </footer>
  )
}
