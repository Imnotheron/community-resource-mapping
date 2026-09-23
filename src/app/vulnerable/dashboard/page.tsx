'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserSync } from '@/hooks/use-user-sync'
import { VulnerableDashboard } from '@/components/dashboards/vulnerable-dashboard'
import { CrmsLoadingScreen } from '@/components/loading/crms-loading-screen'
import { VulnerableWalkthrough } from '@/components/walkthrough/tours/vulnerable-tour'
import { VulnerableFeatureWalkthroughs } from '@/components/walkthrough/tours/vulnerable-feature-tours'

const ROLE = 'vulnerable'
const LOGIN_PATH = '/login?role=vulnerable'

export default function DashboardRoute() {
  const router = useRouter()
  const { user, loading, logout } = useUserSync()

  useEffect(() => {
    if (!loading && (!user || user.role !== ROLE)) {
      router.replace(LOGIN_PATH)
    }
  }, [loading, router, user])

  if (loading || !user || user.role !== ROLE) {
    return (
      <CrmsLoadingScreen label="Opening your assistance portal…" />
    )
  }

  return (
    <>
      <VulnerableDashboard
        user={user}
        onLogout={logout}
        onProfile={() => router.push('/profile')}
      />
      <VulnerableWalkthrough user={user} />
      <VulnerableFeatureWalkthroughs user={user} />
    </>
  )
}
