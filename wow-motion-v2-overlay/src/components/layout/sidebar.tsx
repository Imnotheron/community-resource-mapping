'use client'

import { ReactNode } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface SidebarProps {
  items: NavItem[]
  activeView: string
  onNavigate: (view: string) => void
  footer?: ReactNode
}

export function Sidebar({ items, activeView, onNavigate, footer }: SidebarProps) {
  return (
    <aside className="sidebar-wow hidden w-60 shrink-0 border-r border-border/70 bg-sidebar/80 shadow-[18px_0_55px_rgba(15,23,42,0.06)] backdrop-blur-xl md:flex md:flex-col">
      <div className="px-3 pb-2 pt-4">
        <div className="sidebar-status-card rounded-2xl border border-primary/15 bg-primary/10 p-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Live System</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Mapping, relief, and citizen support modules online.</p>
        </div>
      </div>

      <LayoutGroup id="dashboard-sidebar">
        <nav className="flex-1 space-y-1 overflow-y-auto p-3 scroll-area-thin">
          {items.map((item, index) => {
            const Icon = item.icon
            const active = activeView === item.id
            return (
              <motion.button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                  active
                    ? 'text-primary-foreground'
                    : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'
                )}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.025, duration: 0.22 }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                {active && (
                  <motion.span
                    layoutId="active-sidebar-pill"
                    className="absolute inset-0 rounded-xl bg-primary shadow-[0_14px_35px_rgba(16,185,129,0.25)]"
                    transition={{ type: 'spring', stiffness: 390, damping: 34 }}
                  />
                )}
                {!active && <span className="absolute inset-0 rounded-xl bg-sidebar-accent/0 transition-colors group-hover:bg-sidebar-accent/80" />}
                <span className={cn('relative z-10 grid h-8 w-8 place-items-center rounded-lg transition-all', active ? 'bg-white/20' : 'bg-background/50 group-hover:bg-background/80')}>
                  <Icon className="h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110 group-hover:-rotate-3" />
                </span>
                <span className="relative z-10 truncate">{item.label}</span>
                {active && <span className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-white/90 shadow-[0_0_12px_rgba(255,255,255,0.9)]" />}
              </motion.button>
            )
          })}
        </nav>
      </LayoutGroup>
      {footer && <div className="border-t border-sidebar-border/70 p-3">{footer}</div>}
    </aside>
  )
}
