'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
    <div className="min-h-screen !bg-white flex flex-col">
      {/* Header with Logos */}
      <header className="border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8 py-3 landscape:py-2">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-3 items-center mb-1">
            {/* Top Left - San Policarpo Logo */}
            <div className="flex justify-start">
              <img
                src="/logo-sampolicarpo.jpg"
                alt="San Policarpo Logo"
                className="h-10 landscape:h-8 md:h-16 w-auto object-contain"
              />
            </div>

            {/* Middle - ESSU Logo */}
            <div className="flex justify-center">
              <img
                src="/logo-essu.jpg"
                alt="ESSU Logo"
                className="h-10 landscape:h-8 md:h-16 w-auto object-contain"
              />
            </div>

            {/* Top Right - DSWD Logo */}
            <div className="flex justify-end">
              <img
                src="/logo-dswd.png"
                alt="DSWD Logo"
                className="h-10 landscape:h-8 md:h-16 w-auto object-contain"
              />
            </div>
          </div>
          
          {/* Title */}
          <div className="text-center mt-3 landscape:mt-1">
            <h1 className="text-xl landscape:text-lg md:text-3xl font-bold text-gray-900">
              Community Resource Mapping System
            </h1>
            <p className="text-gray-500 mt-1 text-sm landscape:text-xs">San Policarpo, Eastern Samar</p>
          </div>

          {/* Back Button - below the title */}
          <div className="flex justify-center mt-3 landscape:mt-1">
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
      <main className="flex-1 flex items-start landscape:items-start justify-center px-4 sm:px-6 lg:px-8 py-6 landscape:py-3 overflow-y-auto">
        <div className="w-full max-w-6xl">
          {/* Role Selection */}
          <div className="mb-6 landscape:mb-3">
            <h2 className="text-center text-xl md:text-2xl font-semibold text-gray-900 mb-4 landscape:mb-2 landscape:text-lg">
              Select Your Role to Continue
            </h2>
            <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-3 gap-4 landscape:gap-3">
              {roles
                .filter(role => !(role.id === 'admin' && !isDesktop))
                .map((role) => {
                const RoleIcon = role.icon
                const colors = getRoleColor(role.color)
                return (
                  <Card
                    key={role.id}
                    className={`border-2 ${colors.hover} bg-white transition-all cursor-pointer hover:scale-105 group flex flex-col ${
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
          <Card className="border border-gray-200 bg-gray-50">
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
      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © 2026 Community Resource Mapping System • San Policarpo, Eastern Samar
          </p>
        </div>
      </footer>
    </div>
  )
}
