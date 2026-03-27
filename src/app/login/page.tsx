'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Shield, Users, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react'

const DESKTOP_BREAKPOINT = 1024

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: '', password: '', role: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)

  // Detect desktop (>= 1024px)
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT)
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  useEffect(() => {
    // Get role from URL params
    const role = searchParams.get('role')
    if (role && ['vulnerable', 'worker', 'admin'].includes(role)) {
      // Block admin login on non-desktop devices (phones & tablets)
      if (role === 'admin' && !isDesktop) {
        alert('Admin portal is only accessible on desktop or laptop computers.')
        router.replace('/role-selection')
        return
      }
      setLoginForm(prev => ({ ...prev, role }))
    } else {
      // No valid role, redirect to role selection
      router.replace('/role-selection')
    }
  }, [searchParams, router, isDesktop])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('Login form submitted:', { email: loginForm.email, password: '***', role: loginForm.role })

    if (!loginForm.email || !loginForm.password || !loginForm.role) {
      alert('Please fill in all fields')
      return
    }

    console.log('Starting login request...')
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      })
      const data = await response.json()
      
      console.log('Login API response:', data)

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('token', data.token)

        console.log('Login successful, user role:', data.user.role)

        // Use Next.js router instead of window.location.href
        const role = data.user.role
        if (role === 'admin') {
          console.log('Redirecting to admin dashboard')
          router.push('/admin/dashboard')
        } else if (role === 'worker') {
          console.log('Redirecting to worker dashboard')
          router.push('/worker/dashboard')
        } else if (role === 'vulnerable') {
          console.log('Redirecting to vulnerable dashboard')
          router.push('/vulnerable/dashboard')
        } else {
          console.log('Unknown role, redirecting to intro:', role)
          router.push('/intro')
        }
      } else {
        console.log('Login failed:', data.message)
        if (data.message.includes('pending approval')) {
          alert('Your registration is pending approval. Please wait for an administrator to approve your account.')
        } else if (data.message.includes('rejected')) {
          alert('Your registration was rejected. Please contact your local barangay office for assistance.')
        } else if (data.message.includes('Invalid role access')) {
          alert('Invalid role. Please select the correct role for your account.')
        } else {
          alert(data.message || 'Invalid email or password. Please check your credentials and try again.')
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('Login failed. Please check your internet connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'vulnerable':
        return {
          color: 'blue',
          icon: User,
          title: 'Vulnerable / PWD Portal',
          gradient: 'from-blue-500 to-blue-600'
        }
      case 'worker':
        return {
          color: 'emerald',
          icon: Users,
          title: 'Field Worker Portal',
          gradient: 'from-emerald-500 to-emerald-600'
        }
      case 'admin':
        return {
          color: 'purple',
          icon: Shield,
          title: 'Admin Portal',
          gradient: 'from-purple-500 to-purple-600'
        }
      default:
        return {
          color: 'slate',
          icon: User,
          title: 'Portal',
          gradient: 'from-slate-500 to-slate-600'
        }
    }
  }

  // If no role, show loading
  if (!loginForm.role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    )
  }

  const roleInfo = getRoleInfo(loginForm.role)
  const RoleIcon = roleInfo.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-3 items-center mb-6">
            {/* Top Left - San Policarpo Logo */}
            <div className="flex justify-start">
              <img
                src="/logo-sampolicarpo.jpg"
                alt="San Policarpo Logo"
                className="h-16 md:h-20 w-auto object-contain"
              />
            </div>

            {/* Middle - ESSU Logo */}
            <div className="flex justify-center">
              <img
                src="/logo-essu.jpg"
                alt="ESSU Logo"
                className="h-16 md:h-20 w-auto object-contain"
              />
            </div>

            {/* Top Right - DSWD Logo */}
            <div className="flex justify-end">
              <img
                src="/logo-dswd.png"
                alt="DSWD Logo"
                className="h-16 md:h-20 w-auto object-contain"
              />
            </div>
          </div>

          {/* Back Button */}
          <div className="flex justify-center mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/role-selection')}
              className="gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Role Selection
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <Card className="w-full max-w-md shadow-xl border-2">
          <CardHeader className="text-center pb-6">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg bg-gradient-to-br ${roleInfo.gradient}`}>
              <RoleIcon className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">{roleInfo.title}</CardTitle>
            <CardDescription className="text-base">
              Sign in to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="hidden" name="role" value={loginForm.role} />

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {loginForm.role && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  Signing in as: <strong className="capitalize">{loginForm.role}</strong>
                </div>
              )}

              <Button
                type="submit"
                className={`w-full h-11 bg-gradient-to-r ${roleInfo.gradient} hover:opacity-90 font-semibold`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-600 dark:text-slate-400">
            © 2026 Community Resource Mapping System • San Policarpo, Eastern Samar
          </p>
        </div>
      </footer>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
