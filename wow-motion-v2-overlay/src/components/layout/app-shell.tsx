'use client'

import { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Header } from './header'
import { Sidebar, NavItem } from './sidebar'
import { MobileNav } from './mobile-nav'
import { Footer } from './footer'
import { Button } from '@/components/ui/button'
import { LogOut, Menu, User } from 'lucide-react'
import { DashboardAmbient } from '@/components/effects/dashboard-ambient'

interface AppShellProps {
  items: NavItem[]
  activeView: string
  onNavigate: (view: string) => void
  onLogout: () => void
  onProfile: () => void
  userName: string
  userRole: string
  children: ReactNode
}

const viewVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.985, filter: 'blur(10px)' },
  show: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, scale: 0.992, filter: 'blur(6px)' },
}

export function AppShell({
  items,
  activeView,
  onNavigate,
  onLogout,
  onProfile,
  userName,
  userRole,
  children,
}: AppShellProps) {
  const activeLabel = items.find((item) => item.id === activeView)?.label ?? 'Dashboard'
  const sidebarFooter = (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        className="group w-full justify-start gap-2 rounded-xl transition-all hover:bg-primary/10 hover:text-primary"
        onClick={onProfile}
      >
        <User className="h-4 w-4 transition-transform group-hover:scale-110" />
        Profile
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="group w-full justify-start gap-2 rounded-xl text-destructive transition-all hover:bg-destructive/10 hover:text-destructive"
        onClick={onLogout}
      >
        <LogOut className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        Sign out
      </Button>
    </div>
  )

  return (
    <div className="app-shell relative overflow-hidden">
      <Header />
      <div className="flex flex-1">
        <Sidebar
          items={items}
          activeView={activeView}
          onNavigate={onNavigate}
          footer={sidebarFooter}
        />
        <main className="app-main relative flex-1 overflow-x-hidden">
          <DashboardAmbient />
          <div className="flex items-center justify-between border-b border-border/60 bg-background/70 px-4 py-2 shadow-sm backdrop-blur-xl md:hidden">
            <div>
              <span className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {userRole} portal
              </span>
              <span className="text-sm font-semibold text-foreground">{activeLabel}</span>
            </div>
            <MobileNav
              items={items}
              activeView={activeView}
              onNavigate={onNavigate}
              trigger={
                <Button variant="outline" size="sm" className="gap-2 rounded-full bg-background/70 shadow-sm backdrop-blur">
                  <Menu className="h-4 w-4" />
                  Menu
                </Button>
              }
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              variants={viewVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              transition={{ type: 'spring', stiffness: 210, damping: 26, mass: 0.7 }}
              className="dashboard-view relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8"
            >
              <motion.div
                className="mb-5 hidden items-center justify-between rounded-2xl border border-white/50 bg-white/50 px-4 py-3 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 md:flex"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.28 }}
              >
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{userRole} workspace</p>
                  <p className="text-sm font-semibold text-foreground">{activeLabel}</p>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <span className="max-w-[220px] truncate">Signed in as {userName}</span>
                </div>
              </motion.div>
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <Footer />
    </div>
  )
}
