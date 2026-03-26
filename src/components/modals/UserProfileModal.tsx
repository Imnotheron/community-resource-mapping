'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Shield, 
  MapPin,
  X,
  Camera,
  Settings as SettingsIcon
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UserProfileModalProps {
  open: boolean
  onClose: () => void
  user: {
    id: string
    name: string
    email: string
    phone?: string | null
    role: string
    profilePicture?: string | null
    createdAt?: string
  }
}

export default function UserProfileModal({ open, onClose, user }: UserProfileModalProps) {
  const router = useRouter()

  const getRoleColor = (role: string) => {
    const upperRole = role.toUpperCase()
    switch (upperRole) {
      case 'VULNERABLE':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-600 dark:text-blue-400',
          badge: 'bg-blue-600'
        }
      case 'WORKER':
        return {
          bg: 'bg-teal-100 dark:bg-teal-900/30',
          text: 'text-teal-600 dark:text-teal-400',
          badge: 'bg-teal-600'
        }
      case 'ADMIN':
      default:
        return {
          bg: 'bg-purple-100 dark:bg-purple-900/30',
          text: 'text-purple-600 dark:text-purple-400',
          badge: 'bg-purple-600'
        }
    }
  }

  const colors = getRoleColor(user.role)

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not available'
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleGoToSettings = () => {
    onClose()
    router.push('/profile')
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Profile Information</DialogTitle>
          <DialogDescription>
            View your account details
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {/* Profile Header */}
          <Card className={`border-2 ${colors.text.replace('text', 'border')} bg-gradient-to-br ${colors.bg}`}>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <Avatar className="w-24 h-24 border-4 border-white dark:border-slate-800 shadow-xl">
                    <AvatarImage src={user.profilePicture || undefined} alt={user.name} />
                    <AvatarFallback className={`bg-gradient-to-br ${colors.badge.replace('bg-', 'to-')} ${colors.badge} text-white text-3xl font-bold`}>
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                  {user.name}
                </h3>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${colors.badge} text-white text-sm font-medium mb-4`}>
                  <Shield className="w-3 h-3" />
                  <span className="uppercase">{user.role}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Details */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">Email Address</p>
                <p className="font-medium text-slate-900 dark:text-white truncate">{user.email}</p>
              </div>
            </div>

            {user.phone && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Phone Number</p>
                  <p className="font-medium text-slate-900 dark:text-white">{user.phone}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">Role</p>
                <p className="font-medium text-slate-900 dark:text-white capitalize">{user.role}</p>
              </div>
            </div>

            {user.createdAt && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Member Since</p>
                  <p className="font-medium text-slate-900 dark:text-white">{formatDate(user.createdAt)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleGoToSettings}
            className="gap-2"
          >
            <SettingsIcon className="w-4 h-4" />
            Go to Settings
          </Button>
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
