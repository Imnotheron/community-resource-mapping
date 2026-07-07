'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useUserSync } from '@/hooks/use-user-sync'
import { AdminDashboard } from '@/components/dashboards/admin-dashboard'

const ROLE = 'admin'
const LOGIN_PATH = '/login?role=admin'

function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

export default function DashboardRoute() {
  const router = useRouter()
  const { user, loading, logout } = useUserSync()
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!hasMounted || loading) return

    const userRole = String(user?.role || '').toLowerCase()

    if (!user || userRole !== ROLE) {
      router.replace(LOGIN_PATH)
    }
  }, [hasMounted, loading, router, user])

  if (!hasMounted || loading) {
    return <DashboardLoading />
  }

  const userRole = String(user?.role || '').toLowerCase()

  if (!user || userRole !== ROLE) {
    return <DashboardLoading />
  }

  return (
    <AdminDashboard
      user={user}
      onLogout={logout}
      onProfile={() => router.push('/profile')}
    />
  )
}