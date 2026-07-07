'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, MapPin, X } from 'lucide-react'

interface FooterProps {
  onAccessPortal: () => void
}

type FooterModalType =
  | 'relief'
  | 'registry'
  | 'announcements'
  | 'about'
  | 'barangays'
  | 'contact'
  | 'privacy'

type FooterLink = {
  label: string
  href?: string
  modal?: FooterModalType
  sectionId?: string
}

const PARTNERS = [
  { logo: '/logos/san-policarpo.jpg', name: 'LGU San Policarpo', role: 'Local Government Unit' },
  { logo: '/logos/essu.jpg', name: 'ESSU', role: 'Eastern Samar State University' },
  { logo: '/logos/dswd.png', name: 'DSWD', role: 'Dept. of Social Welfare & Development' },
]

const LINK_GROUPS: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: 'Portal',
    links: [
      { label: 'Admin Dashboard', href: '/login?role=admin' },
      { label: 'Worker Portal', href: '/login?role=worker' },
      { label: 'Citizen Access', href: '/login?role=vulnerable' },
      { label: 'Sign In', href: '/login' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Relief Distribution', modal: 'relief' },
      { label: 'Vulnerable Registry', modal: 'registry' },
      { label: 'Community Map', sectionId: 'overview' },
      { label: 'Announcements', modal: 'announcements' },
    ],
  },
  {
    title: 'Municipality',
    links: [
      { label: 'About San Policarpo', modal: 'about' },
      { label: 'Barangays', modal: 'barangays' },
      { label: 'Contact MSWDO', modal: 'contact' },
      { label: 'Privacy Policy', modal: 'privacy' },
    ],
  },
]

const RELIEF_GALLERY = [
  {
    title: 'Food pack preparation',
    image:
      'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=900&q=80',
    description: 'Packing and organizing relief goods for residents affected by emergencies.',
  },
  {
    title: 'Community distribution',
    image:
      'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=900&q=80',
    description: 'Coordinated distribution activities with LGU, MSWDO, and field workers.',
  },
  {
    title: 'Household support',
    image:
      'https://images.unsplash.com/photo-1469571486292-b53601020a89?auto=format&fit=crop&w=900&q=80',
    description: 'Helping vulnerable families receive assistance in a timely and organized way.',
  },
]

const BARANGAYS = [
  'Alugan',
  'Bahay',
  'Bangon',
  'Baras (Lipata)',
  'Binogawan',
  'Cajagwayan',
  'Japunan',
  'Natividad',
  'Pangpang',
  'Santa Cruz',
  'Tabo',
  'Tan-awan (Tanauawan)',
  'Barangay No. 1 (Poblacion)',
  'Barangay No. 2 (Poblacion)',
  'Barangay No. 3 (Poblacion)',
  'Barangay No. 4 (Poblacion)',
  'Barangay No. 5 (Poblacion)',
]

const BARANGAY_IMAGES = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?auto=format&fit=crop&w=700&q=80',
]

function scrollToLandingSection(sectionId: string) {
  const section = document.getElementById(sectionId)

  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }

  window.location.href = `/#${sectionId}`
}

function FooterModal({
  activeModal,
  onClose,
}: {
  activeModal: FooterModalType | null
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {activeModal && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/75 px-4 py-8 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          onClick={onClose}
        >
          <motion.div
            className="relative max-h-[88vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-emerald-400/20 bg-[#061410] p-6 text-emerald-50 shadow-[0_30px_100px_rgba(0,0,0,0.45)] md:p-8"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full border border-emerald-400/20 bg-emerald-950/70 p-2 text-emerald-100/70 transition hover:border-emerald-300/50 hover:text-emerald-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {activeModal === 'relief' && (
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-400">
                  Relief Distribution
                </p>
                <h2 className="mt-3 text-2xl font-black md:text-4xl">
                  San Policarpo DSWD / MSWDO assistance work
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-emerald-100/70">
                  This gallery can be used to show relief packing, coordination, and distribution activities.
                  Replace these online placeholder photos with your actual San Policarpo relief photos when available.
                </p>

                <div className="mt-7 grid gap-4 md:grid-cols-3">
                  {RELIEF_GALLERY.map((item) => (
                    <article
                      key={item.title}
                      className="overflow-hidden rounded-2xl border border-emerald-400/15 bg-emerald-950/35"
                    >
                      <img src={item.image} alt={item.title} className="h-44 w-full object-cover" />
                      <div className="p-4">
                        <h3 className="text-sm font-black text-emerald-50">{item.title}</h3>
                        <p className="mt-2 text-xs leading-relaxed text-emerald-100/60">{item.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {activeModal === 'registry' && (
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-400">
                  Vulnerable Registry
                </p>
                <h2 className="mt-3 text-2xl font-black md:text-4xl">
                  Choose the correct portal to access the registry
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-emerald-100/70">
                  Administrators can manage approvals and records. Field workers can help register vulnerable citizens
                  and update field information based on their permissions.
                </p>

                <div className="mt-7 grid gap-4 md:grid-cols-2">
                  <a
                    href="/login?role=admin"
                    className="group rounded-2xl border border-violet-400/25 bg-violet-950/25 p-5 transition hover:border-violet-300/60 hover:bg-violet-950/40"
                  >
                    <p className="text-lg font-black">Administrator Access</p>
                    <p className="mt-2 text-sm text-emerald-100/65">
                      Review, approve, manage, and monitor vulnerable citizen records.
                    </p>
                    <span className="mt-4 inline-flex items-center gap-2 text-xs font-black text-violet-200">
                      Continue as Admin <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </a>

                  <a
                    href="/login?role=worker"
                    className="group rounded-2xl border border-amber-400/25 bg-amber-950/25 p-5 transition hover:border-amber-300/60 hover:bg-amber-950/40"
                  >
                    <p className="text-lg font-black">Field Worker Access</p>
                    <p className="mt-2 text-sm text-emerald-100/65">
                      Register vulnerable citizens and help maintain field records.
                    </p>
                    <span className="mt-4 inline-flex items-center gap-2 text-xs font-black text-amber-200">
                      Continue as Worker <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </a>
                </div>
              </div>
            )}

            {activeModal === 'announcements' && (
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-400">
                  This Week&apos;s Announcements
                </p>
                <h2 className="mt-3 text-2xl font-black md:text-4xl">
                  Latest community notices
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-emerald-100/70">
                  The landing page preview shows only this week&apos;s announcements. Full announcement management remains
                  available inside the authorized portal.
                </p>

                <div className="mt-7 space-y-3">
                  {[
                    'Relief distribution schedules will be posted by barangay once confirmed by the MSWDO.',
                    'Vulnerable citizens are encouraged to keep contact details updated for faster assistance coordination.',
                    'Field workers should validate household location data before submitting new registrations.',
                  ].map((announcement, index) => (
                    <div
                      key={announcement}
                      className="rounded-2xl border border-emerald-400/15 bg-emerald-950/30 p-4"
                    >
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400/75">
                        Notice {index + 1}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-emerald-50">{announcement}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeModal === 'about' && (
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-400">
                  About San Policarpo
                </p>
                <h2 className="mt-3 text-2xl font-black md:text-4xl">
                  Coastal municipality in Eastern Samar
                </h2>
                <div className="mt-5 grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4 text-sm leading-relaxed text-emerald-100/70">
                    <p>
                      San Policarpo is a coastal municipality in Eastern Samar, located along the northeastern coast of
                      Samar Island and facing the Pacific Ocean.
                    </p>
                    <p>
                      The Community Resource Mapping System supports local disaster response, relief distribution,
                      vulnerable citizen registration, and resource monitoring for the municipality.
                    </p>
                    <p>
                      The system is designed to help administrators and field workers coordinate assistance while
                      protecting sensitive citizen information.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-950/30 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400/75">Location</p>
                    <p className="mt-2 text-sm text-emerald-50">San Policarpo, Eastern Samar, Philippines</p>
                    <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-emerald-400/75">Coordinates</p>
                    <p className="mt-2 text-sm text-emerald-50">12.1792° N · 125.5072° E</p>
                    <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-emerald-400/75">Boundary context</p>
                    <p className="mt-2 text-sm text-emerald-50">Arteche northwest · Oras south · Pacific Ocean northeast</p>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'barangays' && (
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-400">
                  Barangays
                </p>
                <h2 className="mt-3 text-2xl font-black md:text-4xl">
                  17 barangays of San Policarpo
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-emerald-100/70">
                  These cards use online placeholder landscape photos. Replace them with actual barangay photos when
                  available from the LGU or barangay offices.
                </p>

                <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {BARANGAYS.map((barangay, index) => (
                    <article
                      key={barangay}
                      className="overflow-hidden rounded-2xl border border-emerald-400/15 bg-emerald-950/30"
                    >
                      <img
                        src={BARANGAY_IMAGES[index % BARANGAY_IMAGES.length]}
                        alt={barangay}
                        className="h-32 w-full object-cover"
                      />
                      <div className="p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400/70">
                          Barangay
                        </p>
                        <h3 className="mt-1 text-sm font-black text-emerald-50">{barangay}</h3>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {activeModal === 'contact' && (
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-400">
                  Contact MSWDO
                </p>
                <h2 className="mt-3 text-2xl font-black md:text-4xl">
                  Municipal Social Welfare and Development Office
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-emerald-100/70">
                  Use this section for official MSWDO contact details. Replace the placeholders below with the verified
                  office phone number, email address, and office schedule.
                </p>

                <div className="mt-7 grid gap-4 md:grid-cols-3">
                  {[
                    ['Office', 'MSWDO San Policarpo Municipal Hall'],
                    ['Phone', 'Add official MSWDO contact number'],
                    ['Email', 'Add official MSWDO email address'],
                    ['Office Hours', 'Monday to Friday · 8:00 AM to 5:00 PM'],
                    ['Emergency Note', 'For urgent emergencies, contact the proper local emergency hotline.'],
                    ['Location', 'San Policarpo, Eastern Samar'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-emerald-400/15 bg-emerald-950/30 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400/70">{label}</p>
                      <p className="mt-2 text-sm font-semibold text-emerald-50">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeModal === 'privacy' && (
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-400">
                  Privacy Policy
                </p>
                <h2 className="mt-3 text-2xl font-black md:text-4xl">
                  Citizen privacy and protected map data
                </h2>
                <div className="mt-5 space-y-4 text-sm leading-relaxed text-emerald-100/70">
                  <p>
                    The landing page map is public-facing and should not expose sensitive household details, exact
                    vulnerable citizen identities, or clickable popups that could compromise privacy.
                  </p>
                  <p>
                    Full profile details, relief records, assistance requests, and household information are only for
                    authorized users such as administrators and assigned field workers.
                  </p>
                  <p>
                    Public information should be limited to general municipality-level or barangay-level context unless
                    the LGU approves a specific public notice.
                  </p>
                </div>

                <div className="mt-7 rounded-2xl border border-emerald-400/15 bg-emerald-950/30 p-5">
                  <p className="text-sm font-black text-emerald-50">Public map rule</p>
                  <p className="mt-2 text-sm leading-relaxed text-emerald-100/70">
                    The community map can show San Policarpo context, but citizen markers should be hidden or disabled
                    on the public landing page to avoid stalking, profiling, or misuse.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Footer({ onAccessPortal }: FooterProps) {
  const [activeModal, setActiveModal] = useState<FooterModalType | null>(null)

  function handleFooterLink(link: FooterLink) {
    if (link.modal) {
      setActiveModal(link.modal)
      return
    }

    if (link.sectionId) {
      scrollToLandingSection(link.sectionId)
    }
  }

  return (
    <footer id="partners" className="relative mt-20 border-t border-emerald-500/15 px-4 pb-10 pt-16 md:px-8">
      <FooterModal activeModal={activeModal} onClose={() => setActiveModal(null)} />

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
                    {link.href ? (
                      <a
                        href={link.href}
                        className="text-xs text-emerald-100/60 transition-colors hover:text-emerald-300"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleFooterLink(link)}
                        className="text-left text-xs text-emerald-100/60 transition-colors hover:text-emerald-300"
                      >
                        {link.label}
                      </button>
                    )}
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
