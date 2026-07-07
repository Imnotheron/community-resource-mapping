'use client'

import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { ProfileView } from '@/components/profile-view'
import { AccentProvider } from '@/components/providers/theme-provider'
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

  const backPath = user.role === 'admin' ? '/admin/dashboard' : user.role === 'worker' ? '/worker/dashboard' : '/vulnerable/dashboard'

  return (
    <AccentProvider>
      <ProfileView user={user} onBack={() => router.push(backPath)} onUserUpdated={refreshUser} />
    </AccentProvider>
  )
}
