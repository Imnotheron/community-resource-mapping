'use client'

import { useMemo, useState } from 'react'
import {
  LogOut,
  Menu,
  UserRound,
} from 'lucide-react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

import type { NavItem } from './sidebar'

interface MobileAppNavProps {
  items: NavItem[]
  activeView: string
  onNavigate: (view: string) => void
  onProfile: () => void
  onLogout: () => void
  userName: string
  userRole: string
  userPhoto?: string | null
}

function initialsOf(name: string) {
  return (
    String(name || 'User')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || 'U'
  )
}

function roleLabel(role: string) {
  const normalized = String(role || '')
    .replace(/_/g, ' ')
    .toLowerCase()

  if (normalized === 'worker') {
    return 'Field Worker'
  }

  if (normalized === 'vulnerable') {
    return 'Citizen'
  }

  return normalized.replace(
    /\b\w/g,
    (character) => character.toUpperCase(),
  )
}

export function MobileAppNav({
  items,
  activeView,
  onNavigate,
  onProfile,
  onLogout,
  userName,
  userRole,
  userPhoto,
}: MobileAppNavProps) {
  const [moreOpen, setMoreOpen] =
    useState(false)

  const primaryItems = useMemo(
    () => items.slice(0, 4),
    [items],
  )
  const secondaryItems = useMemo(
    () => items.slice(4),
    [items],
  )

  const secondaryIsActive =
    secondaryItems.some(
      (item) => item.id === activeView,
    )

  function navigate(view: string) {
    onNavigate(view)
    setMoreOpen(false)
  }

  function openProfile() {
    setMoreOpen(false)
    onProfile()
  }

  function signOut() {
    setMoreOpen(false)
    onLogout()
  }

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/90 bg-white/95 px-2 pt-2 shadow-[0_-16px_45px_rgba(15,23,42,0.10)] backdrop-blur-xl md:hidden"
        style={{
          paddingBottom:
            'max(0.5rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {primaryItems.map((item) => {
            const Icon = item.icon
            const active =
              item.id === activeView

            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  navigate(item.id)
                }
                className={cn(
                  'flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center transition active:scale-[0.97]',
                  active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                )}
                aria-current={
                  active ? 'page' : undefined
                }
              >
                <span
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-xl transition',
                    active
                      ? 'bg-emerald-600 text-white shadow-[0_8px_22px_rgba(5,150,105,0.26)]'
                      : 'bg-slate-100 text-slate-600',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="w-full truncate text-[10px] font-semibold leading-tight">
                  {item.label}
                </span>
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center transition active:scale-[0.97]',
              secondaryIsActive
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
            )}
            aria-label="Open more navigation options"
          >
            <span
              className={cn(
                'grid h-8 w-8 place-items-center rounded-xl transition',
                secondaryIsActive
                  ? 'bg-emerald-600 text-white shadow-[0_8px_22px_rgba(5,150,105,0.26)]'
                  : 'bg-slate-100 text-slate-600',
              )}
            >
              <Menu className="h-4 w-4" />
            </span>
            <span className="text-[10px] font-semibold leading-tight">
              More
            </span>
          </button>
        </div>
      </nav>

      <Sheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
      >
        <SheetContent
          side="bottom"
          className="max-h-[82dvh] overflow-y-auto rounded-t-[28px] border-slate-200 bg-white px-4 pb-6 pt-4"
          style={{
            paddingBottom:
              'max(1.5rem, env(safe-area-inset-bottom))',
          }}
        >
          <SheetHeader className="text-left">
            <SheetTitle>
              More options
            </SheetTitle>
            <SheetDescription>
              Open another page or manage your
              account.
            </SheetDescription>
          </SheetHeader>

          <button
            type="button"
            onClick={openProfile}
            className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 text-left transition hover:bg-emerald-50"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-sm">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={userName}
                  className="h-full w-full object-cover"
                />
              ) : (
                initialsOf(userName)
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-950">
                {userName}
              </span>
              <span className="block text-xs font-medium text-emerald-700">
                {roleLabel(userRole)}
              </span>
            </span>

            <UserRound className="h-5 w-5 text-emerald-700" />
          </button>

          {secondaryItems.length > 0 ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {secondaryItems.map((item) => {
                const Icon = item.icon
                const active =
                  item.id === activeView

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      navigate(item.id)
                    }
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition',
                      active
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
                        active
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-slate-600 shadow-sm',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold">
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : null}

          <button
            type="button"
            onClick={signOut}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </SheetContent>
      </Sheet>
    </>
  )
}
