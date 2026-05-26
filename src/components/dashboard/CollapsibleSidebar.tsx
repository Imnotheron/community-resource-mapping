'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Map,
  MessageSquare,
  LogOut,
  Menu,
  X,
  User,
  BarChart3,
  Shield,
  UserPlus,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export interface SidebarItem {
  id: string
  label: string
  icon: any
  badge?: number | string
}

interface CollapsibleSidebarProps {
  user: {
    name: string
    email: string
    role: string
    profilePicture?: string | null
  }
  activeTab: string
  onTabChange: (tab: string) => void
  onLogout: () => void
  onProfileClick: () => void
  items: SidebarItem[]
  role: 'admin' | 'worker' | 'vulnerable'
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function CollapsibleSidebar({
  user,
  activeTab,
  onTabChange,
  onLogout,
  onProfileClick,
  items,
  role,
  isCollapsed: controlledCollapsed,
  onToggleCollapse
}: CollapsibleSidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(true)

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed
  const toggleCollapse = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed))

  // Role-specific accent colors mapped to M3 tokens
  const getRoleAccent = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          activeBg:    'bg-[#e1d4fd] text-[#4f378a] font-semibold border-l-4 border-[#4f378a]',
          activeIcon:  'text-[#4f378a]',
          avatarBg:    'bg-[#4f378a] text-white',
          badgeBg:     'bg-[#4f378a] text-white',
          rolePill:    'bg-[#e9ddff] text-[#4f378a]',
          roleLabel:   'Admin Portal',
        }
      case 'worker':
        return {
          activeBg:    'bg-emerald-100 text-emerald-800 font-semibold border-l-4 border-emerald-600',
          activeIcon:  'text-emerald-700',
          avatarBg:    'bg-emerald-600 text-white',
          badgeBg:     'bg-emerald-600 text-white',
          rolePill:    'bg-emerald-50 text-emerald-700',
          roleLabel:   'Worker Portal',
        }
      case 'vulnerable':
        return {
          activeBg:    'bg-blue-100 text-blue-800 font-semibold border-l-4 border-blue-600',
          activeIcon:  'text-blue-700',
          avatarBg:    'bg-blue-600 text-white',
          badgeBg:     'bg-blue-600 text-white',
          rolePill:    'bg-blue-50 text-blue-700',
          roleLabel:   'My Portal',
        }
      default:
        return {
          activeBg:    'bg-[#e1d4fd] text-[#4f378a] font-semibold border-l-4 border-[#4f378a]',
          activeIcon:  'text-[#4f378a]',
          avatarBg:    'bg-[#4f378a] text-white',
          badgeBg:     'bg-[#4f378a] text-white',
          rolePill:    'bg-[#e9ddff] text-[#4f378a]',
          roleLabel:   'Portal',
        }
    }
  }

  const accent = getRoleAccent(role)

  return (
    <div
      className={`fixed left-0 top-0 h-full z-50 flex flex-col justify-between transition-all duration-300 ease-in-out
        bg-white dark:bg-[#1d1b20]
        border-r border-[#cbc4d2] dark:border-white/10
        shadow-organic
        ${isCollapsed ? 'w-20' : 'w-[280px]'}
      `}
    >
      {/* ── Branding Row ── */}
      <div>
        <div className="px-4 pt-5 pb-4 border-b border-[#cbc4d2] dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#e9ddff] dark:bg-[#4f378a]/30 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-[#4f378a] dark:text-[#cfbcff]" />
            </div>
            {!isCollapsed && (
              <div>
                <p className="text-[#4f378a] dark:text-[#cfbcff] font-semibold text-[15px] leading-tight">
                  {accent.roleLabel}
                </p>
                <p className="text-[#7a7582] text-[11px] uppercase tracking-wider">
                  CommMap System
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── User avatar ── */}
        <div
          className="flex items-center gap-3 cursor-pointer px-4 py-3 mx-2 mt-3 rounded-lg hover:bg-[#f2ecf4] dark:hover:bg-white/5 transition-colors"
          onClick={onProfileClick}
        >
          <Avatar className="w-9 h-9 border border-[#cbc4d2] flex-shrink-0">
            <AvatarImage src={user.profilePicture || undefined} alt={user.name} />
            <AvatarFallback className={`${accent.avatarBg} font-semibold text-sm`}>
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#1d1b20] dark:text-white text-sm truncate">
                {user.name}
              </p>
              <p className="text-xs text-[#7a7582] capitalize truncate">{user.role}</p>
            </div>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="mt-3 px-2 space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <Tooltip key={item.id} delayDuration={isCollapsed ? 0 : 800}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all duration-150
                      ${isActive
                        ? accent.activeBg
                        : 'text-[#494551] dark:text-[#cbc4d2] hover:bg-[#f2ecf4] dark:hover:bg-white/5'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? accent.activeIcon : 'text-[#7a7582] dark:text-[#9f99a8]'}`} />
                    {!isCollapsed && (
                      <span className="flex-1 text-left truncate">{item.label}</span>
                    )}
                    {item.badge && Number(item.badge) > 0 && !isCollapsed && (
                      <span className={`${accent.badgeBg} text-xs px-2 py-0.5 rounded-full`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">{item.label}</TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </nav>
      </div>

      {/* ── Footer: Logout ── */}
      <div className="border-t border-[#cbc4d2] dark:border-white/10 p-2">
        <Tooltip delayDuration={isCollapsed ? 0 : 800}>
          <TooltipTrigger asChild>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-[#ba1a1a] dark:text-[#ffb4ab] hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right">Sign Out</TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* ── Collapse Toggle ── */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-50">
        <button
          onClick={toggleCollapse}
          className="h-8 w-4 rounded-full border border-[#cbc4d2] dark:border-white/20 bg-white dark:bg-[#2b2930] shadow-sm hover:bg-[#f2ecf4] dark:hover:bg-white/10 transition-all duration-200 flex items-center justify-center"
        >
          {isCollapsed
            ? <ChevronRight className="w-3 h-3 text-[#7a7582]" />
            : <ChevronLeft className="w-3 h-3 text-[#7a7582]" />
          }
        </button>
      </div>
    </div>
  )
}
