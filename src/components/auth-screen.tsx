'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Shield, HardHat, HeartHandshake, LogIn, ArrowLeft, Sparkles, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { DashboardAmbient } from '@/components/effects/dashboard-ambient'

type Role = 'admin' | 'worker' | 'vulnerable'
type Mode = 'select' | 'login'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type RoleColor = {
  text: string
  bg: string
  border: string
  glow: string
  hex: string
  gradient: string
}

const ROLE_INFO: Record<Role, { label: string; desc: string; icon: any; colors: RoleColor }> = {
  admin: {
    label: 'Administrator',
    desc: 'Manage users, approve registrations, oversee relief operations and analytics.',
    icon: Shield,
    colors: {
      text: 'text-violet-600 dark:text-violet-300',
      bg: 'bg-violet-500/10 dark:bg-violet-500/15',
      border: 'hover:border-violet-400/70',
      glow: 'hover:shadow-violet-500/25',
      hex: '#7c3aed',
      gradient: 'from-violet-500/10 via-white/70 to-violet-500/0 dark:via-slate-950/50',
    },
  },
  worker: {
    label: 'Field Worker',
    desc: 'Register vulnerable individuals, record relief distributions, log field notes.',
    icon: HardHat,
    colors: {
      text: 'text-amber-600 dark:text-amber-300',
      bg: 'bg-amber-500/10 dark:bg-amber-500/15',
      border: 'hover:border-amber-400/70',
      glow: 'hover:shadow-amber-500/25',
      hex: '#d97706',
      gradient: 'from-amber-500/10 via-white/70 to-amber-500/0 dark:via-slate-950/50',
    },
  },
  vulnerable: {
    label: 'Vulnerable Citizen',
    desc: 'Submit assistance requests, track relief history, send feedback to the MSWDO.',
    icon: HeartHandshake,
    colors: {
      text: 'text-teal-600 dark:text-teal-300',
      bg: 'bg-teal-500/10 dark:bg-teal-500/15',
      border: 'hover:border-teal-400/70',
      glow: 'hover:shadow-teal-500/25',
      hex: '#0d9488',
      gradient: 'from-teal-500/10 via-white/70 to-teal-500/0 dark:via-slate-950/50',
    },
  },
}

interface AuthScreenProps {
  onLogin: (email: string, password: string, role: string) => Promise<any>
  onBack?: () => void
  preferredRole?: string
}

function normalizeRole(value?: string | null): Role | null {
  return value === 'admin' || value === 'worker' || value === 'vulnerable' ? value : null
}

export function AuthScreen({ onLogin, onBack, preferredRole }: AuthScreenProps) {
  const initialRole = normalizeRole(preferredRole)
  const [mode, setMode] = useState<Mode>(initialRole ? 'login' : 'select')
  const [role, setRole] = useState<Role>(initialRole ?? 'vulnerable')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    setSubmitting(true)
    setErrorMessage(null)

    try {
      await Promise.race([
        onLogin(values.email, values.password, role),
        new Promise((_, reject) =>
          window.setTimeout(
            () => reject(new Error('Login request timed out. Please restart the dev server and try again.')),
            16000
          )
        ),
      ])
      toast.success('Welcome back!')
    } catch (err: any) {
      const message = err?.message || 'Login failed. Please check your credentials and try again.'
      setErrorMessage(message)
      toast.error('Login failed', { description: message })
    } finally {
      setSubmitting(false)
    }
  }


  const selected = ROLE_INFO[role]
  const SelectedIcon = selected.icon

  return (
    <div className="app-shell auth-wow relative overflow-hidden">
      <DashboardAmbient />
      {onBack && (
        <motion.button
          onClick={onBack}
          className="group fixed left-4 top-4 z-50 flex items-center gap-2 rounded-full border border-primary/20 bg-background/70 py-2 pl-3 pr-4 text-sm font-semibold text-muted-foreground shadow-xl backdrop-blur-xl transition-all hover:border-primary/40 hover:bg-background/90 hover:text-foreground hover:shadow-primary/20 md:left-6 md:top-6"
          aria-label="Back to Home"
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -2, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 transition-all group-hover:bg-primary/20">
            <ArrowLeft className="h-3.5 w-3.5 text-primary" />
          </span>
          <span className="hidden sm:inline">Back to Home</span>
        </motion.button>
      )}

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-8 px-4 py-12 md:py-20">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="seal-orbit mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-primary/30 bg-white p-1 shadow-[0_18px_55px_rgba(16,185,129,0.22)]">
            <img
              src="/icon.png"
              alt="Community Resource Mapping System"
              className="h-[118%] w-[118%] scale-[1.4] object-contain"
              onError={(event) => {
                const img = event.currentTarget

                if (img.dataset.fallback === 'logos') {
                  img.src = '/favicon.ico'
                  img.dataset.fallback = 'favicon'
                  return
                }

                if (img.dataset.fallback === 'favicon') {
                  img.src = '/logos/san-policarpo.jpg'
                  img.dataset.fallback = 'seal'
                  return
                }

                if (img.dataset.fallback === 'seal') {
                  img.style.display = 'none'
                  return
                }

                img.src = '/logos/crms-system-icon.png'
                img.dataset.fallback = 'logos'
              }}
            />
          </div>
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Secure role-based access
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-5xl">
            Community Resource Mapping System
          </h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Municipality of San Policarpo, Eastern Samar
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            A partnership of LGU San Policarpo · ESSU · DSWD
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === 'select' && (
            <motion.div
              key="role-select"
              className="w-full max-w-5xl"
              initial={{ opacity: 0, y: 14, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.985 }}
              transition={{ type: 'spring', stiffness: 230, damping: 26 }}
            >
              <h2 className="mb-5 text-center text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Select your role to continue
              </h2>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {(Object.keys(ROLE_INFO) as Role[]).map((r, index) => {
                  const info = ROLE_INFO[r]
                  const Icon = info.icon
                  const c = info.colors
                  return (
                    <motion.button
                      key={r}
                      onClick={() => {
                        setRole(r)
                        setMode('login')
                      }}
                      className={cn(
                        'group auth-role-card relative flex min-h-[190px] flex-col items-start gap-4 overflow-hidden rounded-2xl border border-border bg-gradient-to-br p-6 text-left shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur transition-all',
                        c.gradient,
                        c.border,
                        c.glow
                      )}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08, type: 'spring', stiffness: 220, damping: 22 }}
                      whileHover={{ y: -8, rotateX: 2, rotateY: index === 0 ? -2 : index === 2 ? 2 : 0 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="absolute inset-x-0 top-0 h-[3px] opacity-90 transition-opacity group-hover:opacity-100" style={{ background: `linear-gradient(90deg, transparent, ${c.hex}, transparent)` }} />
                      <span className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-10 blur-2xl transition-transform group-hover:scale-150" style={{ background: c.hex }} />
                      <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 group-hover:-rotate-3', c.bg)}>
                        <Icon className={cn('h-6 w-6', c.text)} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{info.label}</h3>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{info.desc}</p>
                      </div>
                      <span className="mt-auto flex items-center gap-1 text-xs font-bold transition-all group-hover:gap-2" style={{ color: c.hex }}>
                        Continue <span className="transition-transform group-hover:translate-x-1">→</span>
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {mode !== 'select' && (
            <motion.div
              key="auth-form"
              className="w-full max-w-md"
              initial={{ opacity: 0, y: 18, scale: 0.97, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, scale: 0.97, filter: 'blur(8px)' }}
              transition={{ type: 'spring', stiffness: 240, damping: 25 }}
            >
              <Card className="auth-form-card overflow-hidden border-primary/15 bg-card/80 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setMode('select')} className="gap-1 rounded-full px-2">
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl shadow-inner', selected.colors.bg)}>
                      <SelectedIcon className={cn('h-5 w-5', selected.colors.text)} />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Sign In</CardTitle>
                      <CardDescription>{selected.label} portal</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" {...loginForm.register('email')} placeholder="you@example.com" />
                      {loginForm.formState.errors.email && <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          {...loginForm.register('password')}
                          placeholder="••••••••"
                          className="pr-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {loginForm.formState.errors.password && <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>}
                    </div>
                    {errorMessage && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                        {errorMessage}
                      </div>
                    )}

                    <Button type="submit" disabled={submitting} className="wow-button w-full gap-2 rounded-xl">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                      {submitting ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground shadow-sm backdrop-blur"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="font-semibold text-foreground">Demo accounts</p>
          <p className="mt-1">admin@crms.gov.ph / admin123 · worker@sanpolicarpo.gov / worker123 · maria.garcia@email.com / vulnerable123</p>
        </motion.div>
      </div>
    </div>
  )
}
