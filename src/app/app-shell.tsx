'use client'

import { useState, lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { useUserSync } from '@/hooks/use-user-sync'
import { AccentProvider } from '@/components/providers/theme-provider'

// Lazy-load ALL views so each one compiles on-demand, not upfront.
const LandingPage = lazy(() =>
  import('@/components/landing/landing-page').then((m) => ({ default: m.LandingPage }))
)
const AuthScreen = lazy(() =>
  import('@/components/auth-screen').then((m) => ({ default: m.AuthScreen }))
)
const ProfileView = lazy(() =>
  import('@/components/profile-view').then((m) => ({ default: m.ProfileView }))
)
const AdminDashboard = lazy(() =>
  import('@/components/dashboards/admin-dashboard').then((m) => ({ default: m.AdminDashboard }))
)
const WorkerDashboard = lazy(() =>
  import('@/components/dashboards/worker-dashboard').then((m) => ({ default: m.WorkerDashboard }))
)
const VulnerableDashboard = lazy(() =>
  import('@/components/dashboards/vulnerable-dashboard').then((m) => ({ default: m.VulnerableDashboard }))
)

function ViewLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function AppShellContent() {
  const { user, loading, login, register, logout, refreshUser } = useUserSync()
  const [mode, setMode] = useState<'landing' | 'auth' | 'profile' | 'dashboard'>('landing')

  if (loading) {
    return <ViewLoader label="Loading…" />
  }

  // Guest flow
  if (!user) {
    if (mode === 'auth') {
      return (
        <Suspense fallback={<ViewLoader label="Loading sign-in…" />}>
          <AuthScreen
            onLogin={async (email, password, role) => {
              const result = await login(email, password, role)
              setMode('dashboard')
              return result
            }}
            onRegister={async (name, email, password, role) => {
              const result = await register(name, email, password, role)
              setMode('dashboard')
              return result
            }}
            onBack={() => setMode('landing')}
          />
        </Suspense>
      )
    }
    return (
      <Suspense fallback={<ViewLoader label="Loading landing page…" />}>
        <LandingPage onAccessPortal={() => setMode('auth')} />
      </Suspense>
    )
  }

  // Authenticated flow
  if (mode === 'profile') {
    return (
      <Suspense fallback={<ViewLoader label="Loading profile…" />}>
        <ProfileView
          user={user}
          onBack={() => setMode('dashboard')}
          onUserUpdated={refreshUser}
        />
      </Suspense>
    )
  }

  const handleLogout = async () => {
    await logout()
    setMode('landing')
  }
  const handleProfile = () => setMode('profile')

  if (user.role === 'admin') {
    return (
      <Suspense fallback={<ViewLoader label="Loading admin dashboard…" />}>
        <AdminDashboard user={user} onLogout={handleLogout} onProfile={handleProfile} />
      </Suspense>
    )
  }
  if (user.role === 'worker') {
    return (
      <Suspense fallback={<ViewLoader label="Loading worker dashboard…" />}>
        <WorkerDashboard user={user} onLogout={handleLogout} onProfile={handleProfile} />
      </Suspense>
    )
  }
  return (
    <Suspense fallback={<ViewLoader label="Loading portal…" />}>
      <VulnerableDashboard user={user} onLogout={handleLogout} onProfile={handleProfile} />
    </Suspense>
  )
}

export function AppShellRoot() {
  return (
    <AccentProvider>
      <AppShellContent />
    </AccentProvider>
  )
}
