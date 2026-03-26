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
  Settings,
  LogOut,
  Menu,
  X,
  User,
  BarChart3,
  Shield,
  UserPlus,
  TrendingUp
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

  // Use controlled state if provided, otherwise use internal state
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed
  const toggleCollapse = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed))

  const getRoleColors = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          primary: 'bg-gradient-to-br from-purple-600 to-purple-700',
          primaryHover: 'hover:from-purple-700 hover:to-purple-800',
          accent: 'bg-purple-100 dark:bg-purple-900/30',
          accentText: 'text-purple-600 dark:text-purple-400',
          activeBg: 'bg-purple-500 text-white shadow-lg',
          border: 'border-purple-500/30',
          iconBg: 'bg-purple-500'
        }
      case 'worker':
        return {
          primary: 'bg-gradient-to-br from-emerald-600 to-emerald-700',
          primaryHover: 'hover:from-emerald-700 hover:to-emerald-800',
          accent: 'bg-emerald-100 dark:bg-emerald-900/30',
          accentText: 'text-emerald-600 dark:text-emerald-400',
          activeBg: 'bg-emerald-500 text-white shadow-lg',
          border: 'border-emerald-500/30',
          iconBg: 'bg-emerald-500'
        }
      case 'vulnerable':
        return {
          primary: 'bg-gradient-to-br from-blue-600 to-blue-700',
          primaryHover: 'hover:from-blue-700 hover:to-blue-800',
          accent: 'bg-blue-100 dark:bg-blue-900/30',
          accentText: 'text-blue-600 dark:text-blue-400',
          activeBg: 'bg-blue-500 text-white shadow-lg',
          border: 'border-blue-500/30',
          iconBg: 'bg-blue-500'
        }
      default:
        return {
          primary: 'bg-gradient-to-br from-slate-600 to-slate-700',
          primaryHover: 'hover:from-slate-700 hover:to-slate-800',
          accent: 'bg-slate-100 dark:bg-slate-900/30',
          accentText: 'text-slate-600 dark:text-slate-400',
          activeBg: 'bg-slate-500 text-white shadow-lg',
          border: 'border-slate-500/30',
          iconBg: 'bg-slate-500'
        }
    }
  }

  const colors = getRoleColors(role)

  return (
    <div
      className={`fixed left-0 top-0 h-full bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 z-50 transition-all duration-300 ease-in-out shadow-xl ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* User Profile Section - At the Top */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div
          className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 p-2 rounded-xl transition-colors"
          onClick={onProfileClick}
        >
          <Avatar className="w-12 h-12 border-2 border-slate-200 dark:border-slate-700">
            <AvatarImage src={user.profilePicture || undefined} alt={user.name} />
            <AvatarFallback className={`${colors.primary} text-white font-semibold text-lg`}>
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                {user.name}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 capitalize truncate">
                {user.role}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <Tooltip key={item.id} delayDuration={isCollapsed ? 0 : 500}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onTabChange(item.id)}
                  disabled={isCollapsed}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? colors.activeBg
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  } ${isCollapsed ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                  {!isCollapsed && (
                    <span className="font-medium text-sm flex-1 text-left truncate">
                      {item.label}
                    </span>
                  )}
                  {item.badge && !isCollapsed && (
                    <span className={`${colors.iconBg} text-white text-xs px-2 py-0.5 rounded-full`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" hidden={true}>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <Tooltip delayDuration={isCollapsed ? 0 : 500}>
          <TooltipTrigger asChild>
            <button
              onClick={onLogout}
              disabled={isCollapsed}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 ${isCollapsed ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="font-medium text-sm">Logout</span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" hidden={true}>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Collapse/Expand Button - In the Middle of Sidebar (Outside Boundary) */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-50">
        <button
          onClick={toggleCollapse}
          className="h-12 w-6 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md hover:shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 flex items-center justify-center"
        >
          {isCollapsed ? (
            <Menu className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          ) : (
            <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          )}
        </button>
      </div>
    </div>
  )
}
