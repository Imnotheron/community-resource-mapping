'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useUserSync } from '@/hooks/use-user-sync'
import { VulnerableDashboard } from '@/components/dashboards/vulnerable-dashboard'
import { VulnerableWalkthrough } from '@/components/walkthrough/tours/vulnerable-tour'

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
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
    </>
  )
}
