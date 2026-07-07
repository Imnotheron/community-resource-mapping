'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { AuthScreen } from '@/components/auth-screen'
import { useUserSync } from '@/hooks/use-user-sync'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preferredRole = searchParams.get('role') || undefined
  const { login, register } = useUserSync()

  const goDashboard = (role?: string) => {
    if (role === 'admin') router.push('/admin/dashboard')
    else if (role === 'worker') router.push('/worker/dashboard')
    else if (role === 'vulnerable') router.push('/vulnerable/dashboard')
    else router.push('/')
  }

  return (
    <AuthScreen
      preferredRole={preferredRole}
      onLogin={async (email, password, role) => {
        const result = await login(email, password, role)
        goDashboard(result.user.role)
        return result
      }}
      onRegister={async (name, email, password, role) => {
        const result = await register(name, email, password, role)
        goDashboard(result.user.role)
        return result
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
