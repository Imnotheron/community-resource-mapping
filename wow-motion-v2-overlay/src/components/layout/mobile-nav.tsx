'use client'

import { useState, ReactNode } from 'react'
import { motion } from 'framer-motion'
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
      <SheetContent side="bottom" className="max-h-[74vh] overflow-y-auto rounded-t-3xl border-primary/15 bg-background/95 backdrop-blur-xl">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-1">
          {items.map((item, index) => {
            const Icon = item.icon
            const active = activeView === item.id
            return (
              <motion.button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={cn(
                  'group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-3 py-3 text-sm font-semibold transition-all',
                  active
                    ? 'bg-primary text-primary-foreground shadow-[0_16px_38px_rgba(16,185,129,0.22)]'
                    : 'text-foreground hover:bg-muted'
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.025 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
                {active && <X className="ml-auto h-4 w-4 opacity-0" />}
              </motion.button>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
