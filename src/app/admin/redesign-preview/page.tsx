'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { AdminRedesignPreview } from '@/components/dashboards/admin-redesign-preview'
import { useUserSync } from '@/hooks/use-user-sync'

const ROLE = 'admin'
const LOGIN_PATH = '/login?role=admin'

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3 text-slate-600">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm font-medium">Opening redesign preview…</p>
      </div>
    </div>
  )
}

export default function AdminRedesignPreviewRoute() {
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
    return <LoadingScreen />
  }

  const userRole = String(user?.role || '').toLowerCase()
  if (!user || userRole !== ROLE) {
    return <LoadingScreen />
  }

  return (
    <AdminRedesignPreview
      user={user}
      onLogout={logout}
      onProfile={() => router.push('/profile')}
    />
  )
}
