'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'framer-motion'
import { Sidebar } from './sidebar'
import type { NavItem } from './sidebar'
import { MobileAppNav } from './mobile-app-nav'
import { CrmsAssistant } from '@/components/assistant/crms-assistant'
import { ConnectionIndicator } from '@/components/connectivity/connection-indicator'
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

const mobileViewVariants = {
  hidden: {
    opacity: 0,
    y: 4,
    scale: 1,
    filter: 'blur(0px)',
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
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
  const [constrainedDevice, setConstrainedDevice] =
    useState(false)
  const [assistantReady, setAssistantReady] =
    useState(false)
  const isMobile = useIsMobile()
  const prefersReducedMotion = useReducedMotion()
  const [
    mobileViewportReady,
    setMobileViewportReady,
  ] = useState(false)

  useEffect(() => {
    // Browser capability detection must run after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileViewportReady(true)

    const navigatorWithMemory = navigator as Navigator & {
      deviceMemory?: number
    }
    const lowCpu =
      typeof navigator.hardwareConcurrency === 'number' &&
      navigator.hardwareConcurrency <= 4
    const lowMemory =
      typeof navigatorWithMemory.deviceMemory === 'number' &&
      navigatorWithMemory.deviceMemory <= 4

    setConstrainedDevice(lowCpu || lowMemory)

    const assistantTimer = window.setTimeout(() => {
      setAssistantReady(true)
    }, 800)

    return () => {
      window.clearTimeout(assistantTimer)
    }
  }, [])

  const normalizedRole = String(
    userRole || '',
  ).toLowerCase()

  const activeLabel =
    items.find((item) => item.id === activeView)?.label ?? 'Dashboard'

  const lightweightMotion =
    isMobile ||
    constrainedDevice ||
    Boolean(prefersReducedMotion)

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
            {!lightweightMotion ? <DashboardAmbient /> : null}

            <div data-tour="workspace-mobile-header" className="relative z-20 flex shrink-0 items-center justify-between border-b border-border bg-background px-3 py-2.5 shadow-sm xl:hidden">
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

              <div className="flex items-center gap-2">
                <ConnectionIndicator
                  compactOnMobile
                  className="max-w-[118px] gap-1.5 px-2"
                />
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
            </div>

            <header data-tour="workspace-desktop-header" className="relative z-10 hidden shrink-0 px-6 pt-4 xl:block">
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

                <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                  <ConnectionIndicator />
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

            <main className="relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pt-4 md:px-6 xl:py-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeView}
                  variants={
                    lightweightMotion
                      ? mobileViewVariants
                      : viewVariants
                  }
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  transition={
                    lightweightMotion
                      ? {
                          duration: prefersReducedMotion
                            ? 0.01
                            : 0.12,
                          ease: 'easeOut',
                        }
                      : {
                          type: 'spring',
                          stiffness: 230,
                          damping: 28,
                          mass: 0.7,
                        }
                  }
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

            {assistantReady ? (
              <CrmsAssistant
                userName={userName}
                userRole={userRole}
                activeView={activeView}
                activeViewLabel={activeLabel}
              />
            ) : null}

            <footer className="relative z-10 hidden h-7 shrink-0 overflow-hidden border-t border-slate-200/80 bg-white/70 px-6 text-[0.6875rem] font-medium leading-none text-slate-500 backdrop-blur-xl xl:block">
              <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                    <img
                      src="/logos/crms-system-icon.png"
                      alt="CRMS"
                      className="h-3.5 w-3.5 rounded-full bg-white object-contain"
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
