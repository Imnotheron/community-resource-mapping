'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { ProfileView } from '@/components/profile-view'
import { useUserSync } from '@/hooks/use-user-sync'

export default function ProfilePage() {
  const router = useRouter()
  const { user, refreshUser } = useUserSync()

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const normalizedRole = String(
    user.role || '',
  ).toLowerCase()

  const backPath =
    normalizedRole === 'admin'
      ? '/admin/dashboard'
      : normalizedRole === 'worker'
        ? '/worker/dashboard'
        : '/vulnerable/dashboard'

  return (
    <ProfileView
      user={user}
      onBack={() => router.push(backPath)}
      onUserUpdated={refreshUser}
    />
  )
}
