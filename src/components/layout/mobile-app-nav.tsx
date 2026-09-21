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

const COMPACT_LABELS: Record<string, string> = {
  'My Distributions': 'History',
  'Record Distribution': 'Distribute',
  'Register Citizen': 'Register',
  'Relief History': 'Relief',
  Announcements: 'Updates',
}

function mobileLabel(label: string) {
  return COMPACT_LABELS[label] || label
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
        data-tour="mobile-navigation"
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-2 pt-1.5 shadow-[0_-12px_36px_rgba(15,23,42,0.12)] backdrop-blur-xl md:hidden"
        style={{
          paddingBottom:
            'max(0.35rem, env(safe-area-inset-bottom))',
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
                data-tour={`mobile-nav-${item.id}`}
                type="button"
                onClick={() =>
                  navigate(item.id)
                }
                className={cn(
                  'flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-center transition active:scale-[0.97]',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
                aria-current={
                  active ? 'page' : undefined
                }
              >
                <span
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-xl transition',
                    active
                      ? 'bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(5,150,105,0.24)]'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="w-full truncate text-[0.625rem] font-semibold leading-tight">
                  {mobileLabel(item.label)}
                </span>
              </button>
            )
          })}

          <button
            data-tour="mobile-nav-more"
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-center transition active:scale-[0.97]',
              secondaryIsActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            aria-label="Open more navigation options"
          >
            <span
              className={cn(
                'grid h-8 w-8 place-items-center rounded-xl transition',
                secondaryIsActive
                  ? 'bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(5,150,105,0.24)]'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              <Menu className="h-4 w-4" />
            </span>
            <span className="text-[0.625rem] font-semibold leading-tight">
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
          className="flex max-h-[78dvh] flex-col gap-0 overflow-hidden rounded-t-[28px] border-border bg-background p-0 text-foreground shadow-[0_-28px_80px_rgba(15,23,42,0.24)]"
          style={{
            paddingBottom:
              'max(0.75rem, env(safe-area-inset-bottom))',
          }}
        >
          <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/25" />

          <SheetHeader className="shrink-0 border-b border-border px-5 pb-4 pt-3 text-left">
            <SheetTitle className="text-lg font-bold text-foreground">
              More options
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              Open another page or manage your account.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <button
              data-tour="mobile-profile-menu"
              type="button"
              onClick={openProfile}
              className="flex w-full items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 p-3 text-left text-foreground transition hover:bg-primary/15"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">
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
                <span className="block truncate text-sm font-semibold text-foreground">
                  {userName}
                </span>
                <span className="block text-xs font-medium text-primary">
                  {roleLabel(userRole)}
                </span>
              </span>

              <UserRound className="h-5 w-5 text-primary" />
            </button>

            {secondaryItems.length > 0 ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {secondaryItems.map((item) => {
                  const Icon = item.icon
                  const active =
                    item.id === activeView

                  return (
                    <button
                      key={item.id}
                      data-tour={`mobile-nav-${item.id}`}
                      type="button"
                      onClick={() =>
                        navigate(item.id)
                      }
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition',
                        active
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'border-border bg-card text-card-foreground hover:bg-muted',
                      )}
                    >
                      <span
                        className={cn(
                          'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground',
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
              data-tour="mobile-logout-button"
              type="button"
              onClick={signOut}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive transition hover:bg-destructive/15"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}