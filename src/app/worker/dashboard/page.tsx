'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useUserSync } from '@/hooks/use-user-sync'
import { WorkerDashboard } from '@/components/dashboards/worker-dashboard'
import { WorkerWalkthrough } from '@/components/walkthrough/tours/worker-tour'
import { WorkerFeatureWalkthroughs } from '@/components/walkthrough/tours/worker-feature-tours'
import { RegistrationFormWalkthrough } from '@/components/walkthrough/tours/registration-form-tour'

const ROLE = 'worker'
const LOGIN_PATH = '/login?role=worker'

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
      <WorkerDashboard
        user={user}
        onLogout={logout}
        onProfile={() => router.push('/profile')}
      />
      <WorkerWalkthrough user={user} />
      <WorkerFeatureWalkthroughs user={user} />
      <RegistrationFormWalkthrough user={user} />
    </>
  )
}
