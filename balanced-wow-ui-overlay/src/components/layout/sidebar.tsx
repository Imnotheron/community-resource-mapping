'use client'

import { ReactNode } from 'react'
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
    <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scroll-area-thin">
        {items.map((item) => {
          const Icon = item.icon
          const active = activeView === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </nav>
      {footer && <div className="border-t border-sidebar-border p-3">{footer}</div>}
    </aside>
  )
}
