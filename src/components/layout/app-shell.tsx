'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './sidebar'
import type { NavItem } from './sidebar'
import { MobileAppNav } from './mobile-app-nav'
import { Button } from '@/components/ui/button'
import { DashboardAmbient } from '@/components/effects/dashboard-ambient'
import { useIsMobile } from '@/hooks/use-mobile'
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
  const isMobile = useIsMobile()
  const [
    mobileViewportReady,
    setMobileViewportReady,
  ] = useState(false)

  useEffect(() => {
    setMobileViewportReady(true)
  }, [])

  const normalizedRole = String(
    userRole || '',
  ).toLowerCase()

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

  if (
    normalizedRole === 'admin' &&
    !mobileViewportReady
  ) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50 px-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl bg-emerald-100" />
          <p className="mt-3 text-sm font-medium text-slate-500">
            Preparing workspace...
          </p>
        </div>
      </div>
    )
  }

  if (
    normalizedRole === 'admin' &&
    isMobile
  ) {
    return (
      <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-slate-50 px-5 py-10 text-slate-950">
        <DashboardAmbient />

        <div className="relative z-10 w-full max-w-sm rounded-[28px] border border-white/80 bg-white/90 p-6 text-center shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl">
          <div className="mx-auto grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-emerald-100 bg-white p-2 shadow-sm">
            <img
              src="/logos/crms-system-icon.png"
              alt="Community Resource Mapping System"
              className="h-full w-full object-contain"
            />
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
            Desktop-only workspace
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            Administrator access is not available on phones
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Open the CRMS Administrator portal on a desktop or laptop for secure access to approvals, user management, reports, maps, and analytics.
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-6 w-full rounded-2xl"
            onClick={onLogout}
          >
            Sign out
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="crms-dashboard-theme h-dvh overflow-hidden bg-background text-foreground">
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

            <div className="relative z-20 flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur-xl md:hidden">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border border-emerald-200 bg-white p-1 shadow-sm">
                  <img
                    src="/logos/crms-system-icon.png"
                    alt="Community Resource Mapping System"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="min-w-0">
                  <span className="block text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    {formatWorkspace(userRole)} Mobile
                  </span>
                  <span className="block truncate text-sm font-semibold text-slate-950">
                    {activeLabel}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onProfile}
                aria-label="Open profile"
                className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-xs font-bold text-slate-700 shadow-sm"
              >
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt={userName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  String(userName || 'U')
                    .trim()
                    .charAt(0)
                    .toUpperCase()
                )}
              </button>
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
                    <p className="text-[0.625rem] font-semibold uppercase tracking-[0.26em] text-slate-500">
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

            <main className="relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 md:px-6 md:py-5">
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

            <MobileAppNav
              items={items}
              activeView={activeView}
              onNavigate={onNavigate}
              onProfile={onProfile}
              onLogout={openLogoutConfirm}
              userName={userName}
              userRole={userRole}
              userPhoto={userPhoto}
            />

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