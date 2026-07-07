'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { AuthScreen } from '@/components/auth-screen'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preferredRole = searchParams.get('role') || undefined

  const goDashboard = (role?: string) => {
    const normalizedRole = role?.toLowerCase()

    if (normalizedRole === 'admin') {
      window.location.assign('/admin/dashboard')
      return
    }

    if (normalizedRole === 'worker') {
      window.location.assign('/worker/dashboard')
      return
    }

    if (normalizedRole === 'vulnerable') {
      window.location.assign('/vulnerable/dashboard')
      return
    }

    window.location.assign('/intro')
  }

  return (
    <AuthScreen
      preferredRole={preferredRole}
      onLogin={async (email, password, role) => {
        const controller = new AbortController()
        const timeoutId = window.setTimeout(() => controller.abort(), 15000)

        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            signal: controller.signal,
            body: JSON.stringify({
              email: email.trim(),
              password,
              role,
            }),
          })

          const data = await response.json().catch(() => null)

          if (!response.ok || !data?.success) {
            throw new Error(
              data?.message ||
              data?.error ||
              'Invalid email or password.'
            )
          }

          localStorage.setItem('user', JSON.stringify(data.user))
          localStorage.setItem('token', data.token)
          localStorage.setItem('crms_user', JSON.stringify(data.user))
          localStorage.setItem('crms_token', data.token)

          goDashboard(data.user.role)

          return data
        } catch (error: any) {
          if (error?.name === 'AbortError') {
            throw new Error('Login request timed out. Please restart the dev server and try again.')
          }

          throw error
        } finally {
          window.clearTimeout(timeoutId)
        }
      }}
      onBack={() => router.push('/intro')}
    />
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#04100c]" />}>
      <LoginContent />
    </Suspense>
  )
}
