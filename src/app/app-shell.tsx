'use client'

import { lazy, Suspense, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { TemporaryPasswordReminder } from '@/components/auth/temporary-password-reminder'
import { useUserSync } from '@/hooks/use-user-sync'

const LandingPage = lazy(() =>
  import('@/components/landing/landing-page').then(
    (module) => ({
      default: module.LandingPage,
    }),
  ),
)

const AuthScreen = lazy(() =>
  import('@/components/auth-screen').then((module) => ({
    default: module.AuthScreen,
  })),
)

const ProfileView = lazy(() =>
  import('@/components/profile-view').then((module) => ({
    default: module.ProfileView,
  })),
)

const AdminDashboard = lazy(() =>
  import('@/components/dashboards/admin-dashboard').then(
    (module) => ({
      default: module.AdminDashboard,
    }),
  ),
)

const WorkerDashboard = lazy(() =>
  import('@/components/dashboards/worker-dashboard').then(
    (module) => ({
      default: module.WorkerDashboard,
    }),
  ),
)

const VulnerableDashboard = lazy(() =>
  import('@/components/dashboards/vulnerable-dashboard').then(
    (module) => ({
      default: module.VulnerableDashboard,
    }),
  ),
)

function ViewLoader({
  label = 'Loading…',
}: {
  label?: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  )
}

function AppShellContent() {
  const {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
  } = useUserSync()

  const [mode, setMode] = useState<
    'landing' | 'auth' | 'profile' | 'dashboard'
  >('landing')

  if (loading) {
    return <ViewLoader />
  }

  if (!user) {
    if (mode === 'auth') {
      return (
        <Suspense
          fallback={
            <ViewLoader label="Loading sign-in…" />
          }
        >
          <AuthScreen
            onLogin={async (
              email,
              password,
              role,
            ) => {
              const result = await login(
                email,
                password,
                role,
              )
              setMode('dashboard')
              return result
            }}
            onRegister={async (
              name,
              email,
              password,
              role,
            ) => {
              const result = await register(
                name,
                email,
                password,
                role,
              )
              setMode('dashboard')
              return result
            }}
            onBack={() => setMode('landing')}
          />
        </Suspense>
      )
    }

    return (
      <Suspense
        fallback={
          <ViewLoader label="Loading landing page…" />
        }
      >
        <LandingPage
          onAccessPortal={() => setMode('auth')}
        />
      </Suspense>
    )
  }

  const passwordReminder = (
    <TemporaryPasswordReminder
      user={user}
      onUserUpdated={refreshUser}
    />
  )

  if (mode === 'profile') {
    return (
      <>
        <Suspense
          fallback={
            <ViewLoader label="Loading profile…" />
          }
        >
          <ProfileView
            user={user}
            onBack={() => setMode('dashboard')}
            onUserUpdated={refreshUser}
          />
        </Suspense>

        {passwordReminder}
      </>
    )
  }

  const handleLogout = async () => {
    await logout()
    setMode('landing')
  }

  const handleProfile = () => setMode('profile')
  const normalizedRole = String(
    user.role || '',
  ).toLowerCase()

  if (normalizedRole === 'admin') {
    return (
      <>
        <Suspense
          fallback={
            <ViewLoader label="Loading admin dashboard…" />
          }
        >
          <AdminDashboard
            user={user}
            onLogout={handleLogout}
            onProfile={handleProfile}
          />
        </Suspense>

        {passwordReminder}
      </>
    )
  }

  if (normalizedRole === 'worker') {
    return (
      <>
        <Suspense
          fallback={
            <ViewLoader label="Loading worker dashboard…" />
          }
        >
          <WorkerDashboard
            user={user}
            onLogout={handleLogout}
            onProfile={handleProfile}
          />
        </Suspense>

        {passwordReminder}
      </>
    )
  }

  return (
    <>
      <Suspense
        fallback={
          <ViewLoader label="Loading portal…" />
        }
      >
        <VulnerableDashboard
          user={user}
          onLogout={handleLogout}
          onProfile={handleProfile}
        />
      </Suspense>

      {passwordReminder}
    </>
  )
}

export function AppShellRoot() {
  return <AppShellContent />
}
