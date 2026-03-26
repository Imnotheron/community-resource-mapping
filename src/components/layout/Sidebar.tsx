'use client'

import { useState } from 'react'
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
  Settings,
  LogOut,
  Menu,
  X
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
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'WORKER', 'VULNERABLE'] },
  { id: 'users', label: 'Users', icon: Users, roles: ['ADMIN'] },
  { id: 'registrations', label: 'Registrations', icon: User, roles: ['ADMIN'] },
  { id: 'profiles', label: 'Vulnerable Profiles', icon: Users, roles: ['ADMIN', 'WORKER'] },
  { id: 'distributions', label: 'Distributions', icon: Package, roles: ['ADMIN', 'WORKER', 'VULNERABLE'] },
  { id: 'map', label: 'Map View', icon: Map, roles: ['ADMIN', 'WORKER'] },
  { id: 'announcements', label: 'Announcements', icon: FileText, roles: ['ADMIN', 'VULNERABLE'] },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare, roles: ['ADMIN', 'VULNERABLE'] },
  { id: 'analytics', label: 'Analytics', icon: LayoutDashboard, roles: ['ADMIN'] },
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
  const router = useRouter()

  const getRoleColor = (role: string) => {
    const upperRole = role.toUpperCase()
    switch (upperRole) {
      case 'VULNERABLE':
        return {
          bg: 'bg-blue-600',
          bgHover: 'hover:bg-blue-700',
          bgLight: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-600 dark:text-blue-400',
          gradient: 'from-blue-500 to-blue-600',
          border: 'border-blue-500',
          bgActive: 'bg-blue-600'
        }
      case 'WORKER':
        return {
          bg: 'bg-teal-600',
          bgHover: 'hover:bg-teal-700',
          bgLight: 'bg-teal-100 dark:bg-teal-900/30',
          text: 'text-teal-600 dark:text-teal-400',
          gradient: 'from-teal-500 to-teal-600',
          border: 'border-teal-500',
          bgActive: 'bg-teal-600'
        }
      case 'ADMIN':
      default:
        return {
          bg: 'bg-purple-600',
          bgHover: 'hover:bg-purple-700',
          bgLight: 'bg-purple-100 dark:bg-purple-900/30',
          text: 'text-purple-600 dark:text-purple-400',
          gradient: 'from-purple-500 to-purple-600',
          border: 'border-purple-500',
          bgActive: 'bg-purple-600'
        }
    }
  }

  const colors = getRoleColor(user.role)
  const userRole = user.role.toUpperCase() as UserRole

  const filteredItems = sidebarItems.filter(item => item.roles.includes(userRole))

  return (
    <div
      className={cn(
        'fixed left-0 top-0 h-full bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 z-50 transition-all duration-300 ease-in-out',
        collapsed ? 'w-20' : 'w-72'
      )}
    >
      {/* User Profile Section - At the Top */}
      <div className="border-b border-slate-200 dark:border-slate-800 p-3">
        <div
          onClick={onProfileClick}
          className={cn(
            'flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all duration-200',
            'hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <Avatar className={cn('flex-shrink-0', collapsed ? 'mx-auto' : '')}>
            <AvatarImage src={user.profilePicture || undefined} alt={user.name} />
            <AvatarFallback className={`bg-gradient-to-br ${colors.gradient} text-white font-semibold`}>
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onTabChange(item.id)}
                  disabled={collapsed}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200',
                    'hover:bg-slate-100 dark:hover:bg-slate-800',
                    isActive ? `${colors.bg} text-white shadow-lg` : 'text-slate-600 dark:text-slate-400',
                    collapsed && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <Icon className={cn(
                    'w-5 h-5 flex-shrink-0',
                    isActive ? 'text-white' : colors.text
                  )} />
                  {!collapsed && (
                    <span className="font-medium truncate">{item.label}</span>
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
      <div className="border-t border-slate-200 dark:border-slate-800 p-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onLogout}
              disabled={collapsed}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200',
                'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
                collapsed && 'cursor-not-allowed opacity-50'
              )}
            >
              <LogOut className={cn('w-5 h-5 flex-shrink-0', collapsed ? 'mx-auto' : '')} />
              {!collapsed && (
                <span className="font-medium">Logout</span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" hidden={true}>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Collapse/Expand Button - In the Middle of Sidebar (Outside Boundary) */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className={cn(
            'h-12 w-6 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900',
            'shadow-md hover:shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800',
            'transition-all duration-200'
          )}
        >
          {collapsed ? (
            <Menu className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          ) : (
            <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          )}
        </Button>
      </div>
    </div>
  )
}
