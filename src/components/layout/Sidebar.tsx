'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  Users,
  User,
  Map,
  Package,
  FileText,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type UserRole = 'ADMIN' | 'WORKER' | 'VULNERABLE'

export interface SidebarItem {
  id: string
  label: string
  icon: any
  roles: UserRole[]
}

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard',      label: 'Dashboard',          icon: LayoutDashboard, roles: ['ADMIN', 'WORKER', 'VULNERABLE'] },
  { id: 'users',          label: 'Users',               icon: Users,           roles: ['ADMIN'] },
  { id: 'registrations',  label: 'Registrations',       icon: User,            roles: ['ADMIN'] },
  { id: 'profiles',       label: 'Vulnerable Profiles', icon: Users,           roles: ['ADMIN', 'WORKER'] },
  { id: 'distributions',  label: 'Distributions',       icon: Package,         roles: ['ADMIN', 'WORKER', 'VULNERABLE'] },
  { id: 'map',            label: 'Map View',             icon: Map,             roles: ['ADMIN', 'WORKER'] },
  { id: 'announcements',  label: 'Announcements',        icon: FileText,        roles: ['ADMIN', 'VULNERABLE'] },
  { id: 'feedback',       label: 'Feedback',             icon: MessageSquare,   roles: ['ADMIN', 'VULNERABLE'] },
  { id: 'analytics',      label: 'Analytics',            icon: LayoutDashboard, roles: ['ADMIN'] },
]

interface SidebarProps {
  user: {
    id: string
    name: string
    email: string
    role: string
    profilePicture?: string | null
  }
  activeTab: string
  onTabChange: (tab: string) => void
  onLogout: () => void
  onProfileClick: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function Sidebar({
  user,
  activeTab,
  onTabChange,
  onLogout,
  onProfileClick,
  collapsed = false,
  onToggleCollapse
}: SidebarProps) {

  const getRoleAccent = (role: string) => {
    const r = role.toUpperCase()
    switch (r) {
      case 'VULNERABLE':
        return {
          activeBg:   'bg-blue-100 text-blue-800 border-l-4 border-blue-600 font-semibold',
          activeIcon: 'text-blue-700',
          avatarBg:   'bg-blue-600 text-white',
          roleLabel:  'Vulnerable Portal',
        }
      case 'WORKER':
        return {
          activeBg:   'bg-emerald-100 text-emerald-800 border-l-4 border-emerald-600 font-semibold',
          activeIcon: 'text-emerald-700',
          avatarBg:   'bg-emerald-600 text-white',
          roleLabel:  'Worker Portal',
        }
      case 'ADMIN':
      default:
        return {
          activeBg:   'bg-[#eeebf6] dark:bg-[#422bc0]/20 text-[#422bc0] dark:text-[#a084fb] font-semibold rounded-lg',
          activeIcon: 'text-[#422bc0] dark:text-[#a084fb]',
          avatarBg:   'bg-[#422bc0] text-white',
          roleLabel:  'Admin Portal',
        }
    }
  }

  const accent = getRoleAccent(user.role)
  const userRole = user.role.toUpperCase() as UserRole
  const filteredItems = sidebarItems.filter(item => item.roles.includes(userRole))

  return (
    <div
      className={cn(
        'fixed left-0 top-0 h-full z-50 flex flex-col justify-between transition-all duration-300 ease-in-out',
        'bg-white dark:bg-[#1d1b20]',
        'border-r border-[#cbc4d2] dark:border-white/10 shadow-organic',
        collapsed ? 'w-20' : 'w-[280px]'
      )}
    >
      {/* ── Branding ── */}
      <div>
        <div className="px-5 pt-8 pb-6 border-b-0 space-y-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-full bg-[#422bc0] text-white flex items-center justify-center font-bold text-xl flex-shrink-0">
              A
            </div>
            {!collapsed && (
              <div>
                <p className="text-[#1d1b20] dark:text-white font-bold text-[16px] leading-tight">
                  Admin
                </p>
                <p className="text-[#7a7582] text-[13px]">Administrator</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Nav Items ── */}
        <nav className="mt-3 px-2 space-y-0.5">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <Tooltip key={item.id} delayDuration={collapsed ? 0 : 800}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all duration-150',
                      isActive
                        ? accent.activeBg
                        : 'text-[#494551] dark:text-[#cbc4d2] hover:bg-[#f2ecf4] dark:hover:bg-white/5'
                    )}
                  >
                    <Icon className={cn('w-5 h-5 flex-shrink-0', isActive ? accent.activeIcon : 'text-[#7a7582] dark:text-[#9f99a8]')} />
                    {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                  </button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">{item.label}</TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </nav>
      </div>

      {/* ── Footer: Sign Out ── */}
      <div className="border-t border-[#cbc4d2] dark:border-white/10 p-2">
        <Tooltip delayDuration={collapsed ? 0 : 800}>
          <TooltipTrigger asChild>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-red-600 dark:text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} />
              {!collapsed && <span>Logout</span>}
            </button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Sign Out</TooltipContent>}
        </Tooltip>
      </div>

      {/* ── Collapse Toggle ── */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-50">
        <button
          onClick={onToggleCollapse}
          className="h-8 w-4 rounded-full border border-[#cbc4d2] dark:border-white/20 bg-white dark:bg-[#2b2930] shadow-sm hover:bg-[#f2ecf4] dark:hover:bg-white/10 transition-all duration-200 flex items-center justify-center"
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3 text-[#7a7582]" />
            : <ChevronLeft className="w-3 h-3 text-[#7a7582]" />
          }
        </button>
      </div>
    </div>
  )
}
