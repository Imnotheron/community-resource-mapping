'use client'

import { lazy, Suspense, useCallback, useState } from 'react'
import AccountSetupReminder from '@/components/onboarding/account-setup-reminder'
import { LoginWelcome } from '@/components/onboarding/login-welcome'
import { CrmsLoadingScreen } from '@/components/loading/crms-loading-screen'
import { AdminWalkthrough } from '@/components/walkthrough/tours/admin-tour'
import { AnalyticsWalkthrough } from '@/components/walkthrough/tours/analytics-tour'
import { ApprovalCenterWalkthrough } from '@/components/walkthrough/tours/approval-center-tour'
import { RegistrationWalkthrough } from '@/components/walkthrough/tours/registration-tour'
import { RegistrationFormWalkthrough } from '@/components/walkthrough/tours/registration-form-tour'
import { ReliefApprovalWalkthrough } from '@/components/walkthrough/tours/relief-approval-tour'
import { AnnouncementsWalkthrough } from '@/components/walkthrough/tours/announcements-tour'
import { FeedbackWalkthrough } from '@/components/walkthrough/tours/feedback-tour'
import { VulnerableMapWalkthrough } from '@/components/walkthrough/tours/vulnerable-map-tour'
import { DailyReportsWalkthrough } from '@/components/walkthrough/tours/daily-reports-tour'
import { OperationsHistoryWalkthrough } from '@/components/walkthrough/tours/operations-history-tour'
import { ProfileSettingsWalkthrough } from '@/components/walkthrough/tours/profile-settings-tour'
import { WorkerWalkthrough } from '@/components/walkthrough/tours/worker-tour'
import { WorkerFeatureWalkthroughs } from '@/components/walkthrough/tours/worker-feature-tours'
import { VulnerableWalkthrough } from '@/components/walkthrough/tours/vulnerable-tour'
import { VulnerableFeatureWalkthroughs } from '@/components/walkthrough/tours/vulnerable-feature-tours'
import { useUserSync } from '@/hooks/use-user-sync'
import type { AuthUser } from '@/lib/api-client'

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
  label = 'Preparing your workspace…',
}: {
  label?: string
}) {
  return <CrmsLoadingScreen label={label} />
}

function AppShellContent() {
  const {
    user,
    loading,
    login,
    verifyOtp,
    resendOtp,
    register,
    logout,
    refreshUser,
  } = useUserSync()

  const [mode, setMode] = useState<
    'landing' | 'auth' | 'profile' | 'dashboard'
  >('landing')
  const [welcomeUser, setWelcomeUser] = useState<AuthUser | null>(null)

  const finishWelcome = useCallback(() => {
    setWelcomeUser(null)
  }, [])

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

              if (
                result.otpRequired === false &&
                result.user
              ) {
                setWelcomeUser(result.user)
                setMode('dashboard')
              }

              return result
            }}
            onVerifyOtp={async (
              challengeId,
              otp,
            ) => {
              const result =
                await verifyOtp(
                  challengeId,
                  otp,
                )
              setWelcomeUser(result.user)
              setMode('dashboard')
              return result
            }}
            onResendOtp={(challengeId) =>
              resendOtp(challengeId)
            }
            onRegister={async (
              name,
              email,
              password,
              role,
            ) => {
              const result =
                await register(
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

  const handleLogout = async () => {
    setWelcomeUser(null)
    await logout()
    setMode('landing')
  }

  const handleProfile = () => setMode('profile')

  if (welcomeUser) {
    return (
      <LoginWelcome
        user={welcomeUser}
        onComplete={finishWelcome}
      />
    )
  }

  if (mode === 'profile') {
    return (
      <Suspense
        fallback={
          <ViewLoader label="Loading profile…" />
        }
      >
        <>
          <ProfileView
            user={user}
            onBack={() => setMode('dashboard')}
            onUserUpdated={refreshUser}
          />
          <ProfileSettingsWalkthrough user={user} />
        </>
      </Suspense>
    )
  }

  const setupReminder = (
    <AccountSetupReminder
      user={user}
      onOpenProfile={handleProfile}
    />
  )

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

        <AdminWalkthrough user={user} />
        <AnalyticsWalkthrough user={user} />
        <ApprovalCenterWalkthrough user={user} />
        <RegistrationWalkthrough user={user} />
        <RegistrationFormWalkthrough user={user} />
        <ReliefApprovalWalkthrough user={user} />
        <OperationsHistoryWalkthrough user={user} mode="admin" />
        <AnnouncementsWalkthrough user={user} />
        <FeedbackWalkthrough user={user} />
        <VulnerableMapWalkthrough user={user} />
        <DailyReportsWalkthrough user={user} />
        {setupReminder}
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

        <WorkerWalkthrough user={user} />
        <WorkerFeatureWalkthroughs user={user} />
        <RegistrationFormWalkthrough user={user} />
        {setupReminder}
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

      <VulnerableWalkthrough user={user} />
      <VulnerableFeatureWalkthroughs user={user} />
      {setupReminder}
    </>
  )
}

export function AppShellRoot() {
  return <AppShellContent />
}
