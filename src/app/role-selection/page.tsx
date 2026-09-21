'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SilkLightBackground } from '@/components/ui/silk-light-background'
import { User, Shield, Users, LogIn, CheckCircle, Monitor, ArrowLeft } from 'lucide-react'

const DESKTOP_BREAKPOINT = 1024

export default function RoleSelectionPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(true)

  // Force light mode for this page
  // Detect desktop (>= 1024px) — admin is only shown on desktop
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT)
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  useEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
  }, [])

  const roles = [
    {
      id: 'vulnerable',
      title: 'Vulnerable / PWD',
      description: 'Access your profile, track assistance, and manage your account',
      icon: User,
      color: 'blue',
      features: [
        'View and update your personal profile',
        'Track relief distribution history',
        'Submit feedback on received assistance'
      ]
    },
    {
      id: 'worker',
      title: 'Field Worker',
      description: 'Register vulnerable individuals and manage relief distributions',
      icon: Users,
      color: 'emerald',
      features: [
        'Register vulnerable/PWD accounts',
        'Record and track relief distributions',
        'Access interactive maps with heatmaps',
        'Submit field reports and notes'
      ]
    },
    {
      id: 'admin',
      title: 'Administrator',
      description: 'Oversee the entire system and manage all operations',
      icon: Shield,
      color: 'purple',
      features: [
        'Approve vulnerable registrations',
        'Create and manage worker accounts',
        'View comprehensive analytics and reports',
        'Manage resources and distributions'
      ]
    }
  ]

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role)
    router.push(`/login?role=${role}`)
  }

  const getRoleColor = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'from-blue-500 to-blue-600',
          hover: 'hover:border-blue-400 hover:shadow-blue-500/20',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          iconBgLight: 'bg-blue-50'
        }
      case 'emerald':
        return {
          bg: 'from-emerald-500 to-emerald-600',
          hover: 'hover:border-emerald-400 hover:shadow-emerald-500/20',
          iconBg: 'bg-emerald-100',
          iconColor: 'text-emerald-600',
          iconBgLight: 'bg-emerald-50'
        }
      case 'purple':
        return {
          bg: 'from-purple-500 to-purple-600',
          hover: 'hover:border-purple-400 hover:shadow-purple-500/20',
          iconBg: 'bg-purple-100',
          iconColor: 'text-purple-600',
          iconBgLight: 'bg-purple-50'
        }
      default:
        return {
          bg: 'from-gray-500 to-gray-600',
          hover: 'hover:border-gray-400',
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
          iconBgLight: 'bg-gray-50'
        }
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden !bg-white flex flex-col">
      <SilkLightBackground intensity="medium" />
      <div className="pointer-events-none absolute left-1/2 top-24 h-40 w-[44rem] max-w-[80vw] -translate-x-1/2 rounded-full bg-white/70 blur-3xl" />
      {/* Header with Logos */}
      <header className="relative z-10 border-b border-white/70 bg-white/68 px-4 py-6 shadow-[0_12px_45px_rgba(15,23,42,0.04)] backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-3 items-center mb-2">
            {/* Top Left - San Policarpo Logo */}
            <div className="flex justify-start">
              <img
                src="/logo-sampolicarpo.jpg"
                alt="San Policarpo Logo"
                className="h-14 md:h-16 w-auto object-contain"
              />
            </div>

            {/* Middle - ESSU Logo */}
            <div className="flex justify-center">
              <img
                src="/logo-essu.jpg"
                alt="ESSU Logo"
                className="h-14 md:h-16 w-auto object-contain"
              />
            </div>

            {/* Top Right - DSWD Logo */}
            <div className="flex justify-end">
              <img
                src="/logo-dswd.png"
                alt="DSWD Logo"
                className="h-14 md:h-16 w-auto object-contain"
              />
            </div>
          </div>
          
          {/* Title */}
          <div className="text-center mt-6 flex flex-col items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Community Resource Mapping System
            </h1>
            <p className="text-gray-500 mt-2 mb-4">San Policarpo, Eastern Samar</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <div className="w-full max-w-6xl mx-auto">
          {/* Role Selection */}
          <div className="mb-12">
            <h2 className="text-center text-xl md:text-2xl font-semibold text-gray-900 mb-8">
              Select Your Role to Continue
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {roles
                .filter(role => !(role.id === 'admin' && !isDesktop))
                .map((role) => {
                const RoleIcon = role.icon
                const colors = getRoleColor(role.color)
                return (
                  <Card
                    key={role.id}
                    className={`group flex cursor-pointer flex-col border border-white/80 bg-white/76 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:scale-[1.015] hover:border-white ${colors.hover} ${
                      selectedRole === role.id ? `ring-2 ring-offset-2 ring-${role.color}-500` : ''
                    }`}
                    onClick={() => handleRoleSelect(role.id)}
                  >
                    <CardHeader className="text-center pb-4 flex-shrink-0">
                      <div className={`mx-auto w-16 h-16 ${colors.iconBgLight} rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <RoleIcon className={`w-8 h-8 ${colors.iconColor}`} />
                      </div>
                      <CardTitle className="text-xl text-gray-900">{role.title}</CardTitle>
                      <CardDescription className="text-gray-500">{role.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between">
                      <ul className="space-y-2 text-sm text-gray-600 mb-4">
                        {role.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colors.iconColor}`} />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={`w-full bg-gradient-to-r ${colors.bg} hover:opacity-90 gap-2 shadow-md text-white`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRoleSelect(role.id)
                        }}
                      >
                        <LogIn className="w-4 h-4" />
                        Continue as {role.title}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Notice about admin access on non-desktop devices */}
          {!isDesktop && (
            <div className="flex items-center justify-center gap-2 mb-8 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
              <Monitor className="w-4 h-4 flex-shrink-0" />
              <span>Admin access is available on desktop computers only.</span>
            </div>
          )}

          {/* Quick Info */}
          <Card className="border border-white/80 bg-white/72 shadow-[0_18px_55px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Need to Register?
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
                  <div>
                    <p className="font-medium text-gray-900 mb-1">For Vulnerable Individuals:</p>
                    <p>Visit your local barangay office with valid ID and supporting documents.</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 mb-1">For Field Workers:</p>
                    <p>Contact your supervisor or the local government office.</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 mb-1">For Administrators:</p>
                    <p>Contact your system administrator for access.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/70 bg-white/68 py-6 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © 2026 Community Resource Mapping System • San Policarpo, Eastern Samar
          </p>
        </div>
      </footer>
    </div>
  )
}
