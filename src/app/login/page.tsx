'use client'

import { Suspense, useState } from 'react'
import {
  useRouter,
  useSearchParams,
} from 'next/navigation'

import { AuthScreen } from '@/components/auth-screen'
import { LoginWelcome } from '@/components/onboarding/login-welcome'
import { CrmsLoadingScreen } from '@/components/loading/crms-loading-screen'
import {
  setStoredUser,
  type AuthUser,
} from '@/lib/api-client'

async function postAuth(
  path: string,
  body: Record<string, unknown>,
) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    18000,
  )

  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      signal: controller.signal,
      body: JSON.stringify(body),
    })

    const data =
      await response.json().catch(() => null)

    if (!response.ok || !data?.success) {
      throw new Error(
        data?.message ||
          data?.error ||
          'The request could not be completed.',
      )
    }

    return data
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(
        'The request timed out. Check your connection and try again.',
      )
    }

    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preferredRole =
    searchParams.get('role') || undefined
  const [welcomeUser, setWelcomeUser] =
    useState<AuthUser | null>(null)

  const goDashboard = (role?: string) => {
    const normalizedRole =
      role?.toLowerCase()

    if (normalizedRole === 'admin') {
      window.location.assign(
        '/admin/dashboard',
      )
      return
    }

    if (normalizedRole === 'worker') {
      window.location.assign(
        '/worker/dashboard',
      )
      return
    }

    if (
      normalizedRole === 'vulnerable'
    ) {
      window.location.assign(
        '/vulnerable/dashboard',
      )
      return
    }

    window.location.assign('/intro')
  }

  if (welcomeUser) {
    return (
      <LoginWelcome
        user={welcomeUser}
        onComplete={() =>
          goDashboard(welcomeUser.role)
        }
      />
    )
  }

  return (
    <AuthScreen
      preferredRole={preferredRole}
      onLogin={async (
        email,
        password,
        role,
      ) => {
        const data = await postAuth(
          '/api/auth/login',
          {
            email: email.trim(),
            password,
            role,
          },
        )

        if (
          data.otpRequired === false &&
          data.user &&
          data.token
        ) {
          setStoredUser(
            data.user,
            data.token,
          )
          setWelcomeUser(data.user)
        }

        return data
      }
      onVerifyOtp={async (
        challengeId,
        otp,
      ) => {
        const data = await postAuth(
          '/api/auth/verify-otp',
          {
            challengeId,
            otp,
          },
        )

        setStoredUser(
          data.user,
          data.token,
        )
        setWelcomeUser(data.user)

        return data
      }}
      onResendOtp={(challengeId) =>
        postAuth('/api/auth/resend-otp', {
          challengeId,
        })
      }
      onBack={() => router.push('/intro')}
    />
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <CrmsLoadingScreen label="Opening secure sign-in…" />
      }
    >
      <LoginContent />
    </Suspense>
  )
}
