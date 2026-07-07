'use client'

import { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Header } from './header'
import { Sidebar, NavItem } from './sidebar'
import { MobileNav } from './mobile-nav'
import { Footer } from './footer'
import { Button } from '@/components/ui/button'
import { LogOut, Menu, User } from 'lucide-react'

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
  const sidebarFooter = (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={onProfile}
      >
        <User className="h-4 w-4" />
        Profile
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 text-destructive hover:text-destructive"
        onClick={onLogout}
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  )

  return (
    <div className="app-shell relative">
      <Header />
      <div className="flex flex-1">
        <Sidebar
          items={items}
          activeView={activeView}
          onNavigate={onNavigate}
          footer={sidebarFooter}
        />
        <main className="app-main relative flex-1 overflow-x-hidden">
          {/* Mobile nav trigger bar */}
          <div className="flex items-center justify-between border-b border-border bg-background/80 px-4 py-2 backdrop-blur md:hidden">
            <span className="text-sm font-medium capitalize text-foreground">
              {userRole} portal
            </span>
            <MobileNav
              items={items}
              activeView={activeView}
              onNavigate={onNavigate}
              trigger={
                <Button variant="outline" size="sm" className="gap-2">
                  <Menu className="h-4 w-4" />
                  Menu
                </Button>
              }
            />
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.995 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <Footer />
    </div>
  )
}
