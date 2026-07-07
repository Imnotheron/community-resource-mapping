'use client'

import { useState, ReactNode } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { NavItem } from './sidebar'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  items: NavItem[]
  activeView: string
  onNavigate: (view: string) => void
  trigger?: ReactNode
}

export function MobileNav({ items, activeView, onNavigate, trigger }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const handleNavigate = (view: string) => {
    onNavigate(view)
    setOpen(false)
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-1">
          {items.map((item) => {
            const Icon = item.icon
            const active = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-all',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
                {active && <X className="ml-auto h-4 w-4 opacity-0" />}
              </button>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
