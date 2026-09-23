'use client'

import { useRouter } from 'next/navigation'

import { ProfileView } from '@/components/profile-view'
import { CrmsLoadingScreen } from '@/components/loading/crms-loading-screen'
import { ProfileSettingsWalkthrough } from '@/components/walkthrough/tours/profile-settings-tour'
import { useUserSync } from '@/hooks/use-user-sync'

export default function ProfilePage() {
  const router = useRouter()
  const { user, refreshUser } = useUserSync()

  if (!user) {
    return (
      <CrmsLoadingScreen label="Loading your profile…" />
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
    <>
      <ProfileView
        user={user}
        onBack={() => router.push(backPath)}
        onUserUpdated={refreshUser}
      />
      <ProfileSettingsWalkthrough user={user} />
    </>
  )
}
