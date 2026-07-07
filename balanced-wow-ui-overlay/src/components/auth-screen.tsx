'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Shield, HardHat, HeartHandshake, LogIn, UserPlus, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Role = 'admin' | 'worker' | 'vulnerable'
type Mode = 'select' | 'login' | 'register'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type RoleColor = {
  /** Tailwind text color class for the icon */
  text: string
  /** Tailwind background tint class for the icon badge */
  bg: string
  /** Tailwind border color class for the card on hover */
  border: string
  /** Tailwind ring/glow class for hover effect */
  glow: string
  /** Hex color for the accent bar and continue link */
  hex: string
  /** Light gradient background for the card */
  gradient: string
}

const ROLE_INFO: Record<Role, { label: string; desc: string; icon: any; colors: RoleColor }> = {
  admin: {
    label: 'Administrator',
    desc: 'Manage users, approve registrations, oversee relief operations and analytics.',
    icon: Shield,
    // Royal violet — authority & control
    colors: {
      text: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-500/10 dark:bg-violet-500/15',
      border: 'hover:border-violet-400/60',
      glow: 'hover:shadow-violet-500/20',
      hex: '#7c3aed',
      gradient: 'from-violet-500/5 to-violet-500/0',
    },
  },
  worker: {
    label: 'Field Worker',
    desc: 'Register vulnerable individuals, record relief distributions, log field notes.',
    icon: HardHat,
    // Amber/gold — hands-on field work
    colors: {
      text: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10 dark:bg-amber-500/15',
      border: 'hover:border-amber-400/60',
      glow: 'hover:shadow-amber-500/20',
      hex: '#d97706',
      gradient: 'from-amber-500/5 to-amber-500/0',
    },
  },
  vulnerable: {
    label: 'Vulnerable Citizen',
    desc: 'Submit assistance requests, track relief history, send feedback to the MSWDO.',
    icon: HeartHandshake,
    // Teal — care, compassion, safety
    colors: {
      text: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-500/10 dark:bg-teal-500/15',
      border: 'hover:border-teal-400/60',
      glow: 'hover:shadow-teal-500/20',
      hex: '#0d9488',
      gradient: 'from-teal-500/5 to-teal-500/0',
    },
  },
}

interface AuthScreenProps {
  onLogin: (email: string, password: string, role: string) => Promise<any>
  onRegister: (name: string, email: string, password: string, role: string) => Promise<any>
  onBack?: () => void
  preferredRole?: string
}

function normalizeRole(value?: string | null): Role | null {
  return value === 'admin' || value === 'worker' || value === 'vulnerable' ? value : null
}

export function AuthScreen({ onLogin, onRegister, onBack, preferredRole }: AuthScreenProps) {
  const initialRole = normalizeRole(preferredRole)
  const [mode, setMode] = useState<Mode>(initialRole ? 'login' : 'select')
  const [role, setRole] = useState<Role>(initialRole ?? 'vulnerable')
  const [submitting, setSubmitting] = useState(false)

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  })

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    setSubmitting(true)
    try {
      await onLogin(values.email, values.password, role)
      toast.success('Welcome back!')
    } catch (err: any) {
      toast.error('Login failed', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRegister = async (values: z.infer<typeof registerSchema>) => {
    setSubmitting(true)
    try {
      await onRegister(values.name, values.email, values.password, role)
      toast.success('Account created', {
        description:
          role === 'vulnerable'
            ? 'Please complete your registration profile next.'
            : 'Welcome! You can now sign in.',
      })
    } catch (err: any) {
      toast.error('Registration failed', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-shell">
      {/* Floating back button — fixed top-left, glassmorphic, always accessible.
          Premium placement: icon-forward with label, subtle elevation, hover glow. */}
      {onBack && (
        <button
          onClick={onBack}
          className="group fixed left-4 top-4 z-50 flex items-center gap-2 rounded-full border border-primary/20 bg-background/70 py-2 pl-3 pr-4 text-sm font-medium text-muted-foreground shadow-lg backdrop-blur-md transition-all hover:border-primary/40 hover:bg-background/90 hover:text-foreground hover:shadow-primary/10 md:left-6 md:top-6"
          aria-label="Back to Home"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 transition-all group-hover:bg-primary/20 group-hover:-translate-x-0.5">
            <ArrowLeft className="h-3.5 w-3.5 text-primary" />
          </span>
          <span className="hidden sm:inline">Back to Home</span>
        </button>
      )}
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-8 px-4 py-12 md:py-20">
        {/* Hero */}
        <div className="text-center animate-fade-in">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-primary/30 bg-white">
            <img src="/logos/san-policarpo.jpg" alt="San Policarpo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Community Resource Mapping System
          </h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            Municipality of San Policarpo, Eastern Samar
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            A partnership of LGU San Policarpo · ESSU · DSWD
          </p>
        </div>

        {mode === 'select' && (
          <div className="w-full max-w-4xl animate-scale-in">
            <h2 className="mb-4 text-center text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Select your role to continue
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {(Object.keys(ROLE_INFO) as Role[]).map((r) => {
                const info = ROLE_INFO[r]
                const Icon = info.icon
                const c = info.colors
                return (
                  <button
                    key={r}
                    onClick={() => {
                      setRole(r)
                      setMode('login')
                    }}
                    className={cn(
                      'group relative flex flex-col items-start gap-3 overflow-hidden rounded-md border border-border bg-gradient-to-b p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg',
                      c.gradient,
                      c.border,
                      c.glow
                    )}
                  >
                    {/* Top accent bar in role color */}
                    <span
                      className="absolute inset-x-0 top-0 h-[3px] opacity-80 transition-opacity group-hover:opacity-100"
                      style={{ background: `linear-gradient(90deg, transparent, ${c.hex}, transparent)` }}
                    />
                    <div className={cn('flex h-11 w-11 items-center justify-center rounded-full transition-transform group-hover:scale-110', c.bg)}>
                      <Icon className={cn('h-6 w-6', c.text)} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{info.label}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {info.desc}
                      </p>
                    </div>
                    <span
                      className="mt-auto flex items-center gap-1 text-xs font-semibold transition-all group-hover:gap-1.5"
                      style={{ color: c.hex }}
                    >
                      Continue
                      <span className="transition-transform group-hover:translate-x-0.5">→</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {mode !== 'select' && (
          <Card className="w-full max-w-md animate-scale-in">
            <CardHeader>
              <div className="mb-2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode('select')}
                  className="gap-1 px-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = ROLE_INFO[role].icon
                  const c = ROLE_INFO[role].colors
                  return (
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', c.bg)}>
                      <Icon className={cn('h-5 w-5', c.text)} />
                    </div>
                  )
                })()}
                <div>
                  <CardTitle className="text-xl">
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                  </CardTitle>
                  <CardDescription>{ROLE_INFO[role].label} portal</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {mode === 'login' ? (
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...loginForm.register('email')} placeholder="you@example.com" />
                    {loginForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" {...loginForm.register('password')} placeholder="••••••••" />
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full gap-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                    Sign In
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className="font-medium text-primary hover:underline"
                    >
                      Register here
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Full Name</Label>
                    <Input id="reg-name" {...registerForm.register('name')} placeholder="Juan Dela Cruz" />
                    {registerForm.formState.errors.name && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input id="reg-email" type="email" {...registerForm.register('email')} placeholder="you@example.com" />
                    {registerForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input id="reg-password" type="password" {...registerForm.register('password')} placeholder="At least 6 characters" />
                    {registerForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full gap-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    Create Account
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="font-medium text-primary hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Demo accounts</p>
          <p className="mt-1">admin@crms.gov.ph / admin123 · worker@sanpolicarpo.gov / worker123 · maria.garcia@email.com / vulnerable123</p>
        </div>
      </div>
    </div>
  )
}
