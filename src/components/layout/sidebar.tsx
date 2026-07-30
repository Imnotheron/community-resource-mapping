'use client'

import type { LucideIcon } from 'lucide-react'
import { ChevronRight, LogOut, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NavItem {
  id: string
  label: string
  icon: LucideIcon
}

interface SidebarProps {
  items: NavItem[]
  activeView: string
  onNavigate: (view: string) => void
  onLogout: () => void
  onProfile?: () => void
  userName?: string
  userEmail?: string
  userRole?: string
  userPhoto?: string | null
}

function getInitials(name?: string) {
  if (!name) return 'AU'

  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'AU'
  )
}

function formatRole(role?: string) {
  if (!role) return 'ADMIN'

  return role.replace(/_/g, ' ').toUpperCase()
}

function shortEmail(email?: string) {
  if (!email) return 'admin@crms.gov.ph'
  if (email.length <= 22) return email

  const [name, domain] = email.split('@')

  if (!domain) return `${email.slice(0, 18)}...`

  return `${name.slice(0, 10)}...@${domain.slice(0, 8)}...`
}

export function Sidebar({
  items,
  activeView,
  onNavigate,
  onLogout,
  onProfile,
  userName = 'Admin User',
  userEmail = 'admin@crms.gov.ph',
  userRole = 'ADMIN',
  userPhoto,
}: SidebarProps) {
  const initials = getInitials(userName)

  return (
    <aside className="hidden h-dvh w-[230px] shrink-0 overflow-hidden border-r border-slate-200 bg-white md:flex md:flex-col">
      <style>{`
        .crms-sidebar-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .crms-sidebar-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 px-3 pb-2 pt-3">
          <div className="mb-3 flex items-center gap-2.5 px-1">
            <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <img
                src="/san-policarpo-logo.png"
                alt="San Policarpo Logo"
                className="h-8 w-8 object-contain"
                onError={(event) => {
                  const img = event.currentTarget

                  if (img.dataset.fallback === '1') {
                    img.src = '/logo-sampolicarpo.png'
                    img.dataset.fallback = '2'
                    return
                  }

                  if (img.dataset.fallback === '2') {
                    img.src = '/logos/san-policarpo-logo.png'
                    img.dataset.fallback = '3'
                    return
                  }

                  if (img.dataset.fallback === '3') {
                    img.style.display = 'none'

                    const fallback = img.nextElementSibling as HTMLElement | null

                    if (fallback) {
                      fallback.style.display = 'grid'
                    }

                    return
                  }

                  img.src = '/logo-sampolicarpo.jpg'
                  img.dataset.fallback = '1'
                }}
              />

              <span
                className="hidden h-full w-full place-items-center bg-emerald-50 text-[0.625rem] font-semibold text-emerald-700"
                style={{ display: 'none' }}
              >
                CRMS
              </span>
            </div>

            <div className="min-w-0">
              <p className="truncate text-[0.8125rem] font-semibold leading-tight text-slate-900">
                Community Resource
              </p>
              <p className="truncate text-xs font-medium leading-tight text-slate-500">
                Mapping System
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onProfile}
            className="group flex w-full items-center gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-2.5 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
          >
            <div className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-semibold text-white shadow-sm">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={userName}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'

                    const fallback = event.currentTarget
                      .nextElementSibling as HTMLElement | null

                    if (fallback) {
                      fallback.style.display = 'grid'
                    }
                  }}
                />
              ) : null}

              <span
                className="hidden h-full w-full place-items-center"
                style={{ display: userPhoto ? 'none' : 'grid' }}
              >
                {initials}
              </span>

              <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.8125rem] font-semibold text-slate-900">
                {userName}
              </p>
              <p className="truncate text-[0.6875rem] font-medium text-slate-500">
                {shortEmail(userEmail)}
              </p>

              <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-1.5 py-0.5 text-[0.5625rem] font-semibold text-emerald-700">
                <ShieldCheck className="h-2.5 w-2.5" />
                {formatRole(userRole)}
              </div>
            </div>

            {onProfile && (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-emerald-600 transition group-hover:translate-x-0.5" />
            )}
          </button>
        </div>

        <nav className="crms-sidebar-scroll min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = item.id === activeView

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition',
                  isActive
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <span
                  className={cn(
                    'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition',
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-white'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>

                <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium">
                  {item.label}
                </span>

                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </button>
            )
          })}
        </nav>

        <div className="shrink-0 border-t border-slate-200 bg-white px-3 pt-2.5">
          <button
            type="button"
            onClick={onLogout}
            className="group flex w-full items-center gap-2.5 rounded-xl border border-red-100 bg-red-50 p-2.5 text-left transition hover:border-red-200 hover:bg-red-100"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-red-500 shadow-sm">
              <LogOut className="h-4 w-4" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[0.8125rem] font-semibold text-red-600">
                Sign out
              </span>
              <span className="block text-[0.6875rem] font-medium text-red-400">
                Secure sign out
              </span>
            </span>

            <ChevronRight className="h-3.5 w-3.5 text-red-500 transition group-hover:translate-x-0.5" />
          </button>

          <div className="mt-2 flex h-7 items-center justify-between px-1 text-[0.6875rem] font-medium leading-none text-slate-500">
            <span>San Policarpo Operations</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
