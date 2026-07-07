'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './sidebar'
import type { NavItem } from './sidebar'
import { MobileNav } from './mobile-nav'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { DashboardAmbient } from '@/components/effects/dashboard-ambient'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AppShellProps {
  items: NavItem[]
  activeView: string
  onNavigate: (view: string) => void
  onLogout: () => void
  onProfile: () => void
  userName: string
  userRole: string
  userEmail?: string
  userPhoto?: string | null
  children: ReactNode
}

const viewVariants = {
  hidden: {
    opacity: 0,
    y: 10,
    scale: 0.992,
    filter: 'blur(6px)',
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.996,
    filter: 'blur(4px)',
  },
}

function formatWorkspace(role: string) {
  return String(role || 'Dashboard')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function AppShell({
  items,
  activeView,
  onNavigate,
  onLogout,
  onProfile,
  userName,
  userRole,
  userEmail = '',
  userPhoto,
  children,
}: AppShellProps) {
  const [logoutOpen, setLogoutOpen] = useState(false)

  const activeLabel =
    items.find((item) => item.id === activeView)?.label ?? 'Dashboard'

  function openLogoutConfirm() {
    setLogoutOpen(true)
  }

  function cancelLogout() {
    setLogoutOpen(false)
  }

  function confirmLogout() {
    setLogoutOpen(false)
    onLogout()
  }

  return (
    <>
      <div className="h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.13),transparent_34%),radial-gradient(circle_at_bottom,rgba(99,102,241,0.10),transparent_30%),#f8fafc] text-slate-950">
        <div className="flex h-full min-h-0 overflow-hidden">
          <Sidebar
            items={items}
            activeView={activeView}
            onNavigate={onNavigate}
            onLogout={openLogoutConfirm}
            onProfile={onProfile}
            userName={userName}
            userEmail={userEmail}
            userRole={userRole}
            userPhoto={userPhoto}
          />

          <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
            <DashboardAmbient />

            <div className="relative z-20 flex shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 py-2 shadow-sm backdrop-blur-xl md:hidden">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-2xl border border-emerald-200 bg-white p-1 shadow-sm">
                  <img
                    src="/logos/crms-system-icon.png"
                    alt="Community Resource Mapping System"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {formatWorkspace(userRole)} Portal
                  </span>
                  <span className="block truncate text-sm font-semibold text-slate-950">
                    {activeLabel}
                  </span>
                </div>
              </div>

              <MobileNav
                items={items}
                activeView={activeView}
                onNavigate={onNavigate}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-full bg-white/80 shadow-sm backdrop-blur"
                  >
                    <Menu className="h-4 w-4" />
                    Menu
                  </Button>
                }
              />
            </div>

            <header className="relative z-10 hidden shrink-0 px-6 pt-4 md:block">
              <div className="mx-auto flex h-14 max-w-7xl items-center justify-between rounded-2xl border border-white/70 bg-white/70 px-5 shadow-[0_14px_45px_rgba(15,23,42,0.07)] backdrop-blur-xl">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-2xl border border-emerald-200 bg-white p-1 shadow-sm">
                    <img
                      src="/logos/crms-system-icon.png"
                      alt="Community Resource Mapping System"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                      {formatWorkspace(userRole)} Workspace
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {activeLabel}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <span className="max-w-[220px] truncate">
                    Signed in as {userName}
                  </span>
                </div>
              </div>
            </header>

            <main className="relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeView}
                  variants={viewVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  transition={{
                    type: 'spring',
                    stiffness: 230,
                    damping: 28,
                    mass: 0.7,
                  }}
                  className="mx-auto max-w-7xl"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </main>

            <footer className="relative z-10 hidden shrink-0 border-t border-slate-200/80 bg-white/70 px-6 py-2 text-xs font-medium text-slate-500 backdrop-blur-xl md:block">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                    <img
                      src="/logos/crms-system-icon.png"
                      alt="CRMS"
                      className="h-5 w-5 rounded-full bg-white object-contain"
                    />
                    CRMS
                  </span>
                  <span className="text-slate-300">|</span>
                  <span>LGU San Policarpo</span>
                  <span>ESSU</span>
                  <span>DSWD</span>
                </div>

                <span className="hidden lg:inline">
                  San Policarpo, Eastern Samar, Philippines
                </span>

                <span>© 2026 Community Resource Mapping System</span>
              </div>
            </footer>
          </div>
        </div>
      </div>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out of your account?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={cancelLogout}>
              Cancel
            </Button>

            <Button variant="destructive" onClick={confirmLogout}>
              Yes, sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}