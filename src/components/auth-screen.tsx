'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  HardHat,
  HeartHandshake,
  Loader2,
  LogIn,
  MailCheck,
  RotateCcw,
  Shield,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { SilkLightBackground } from '@/components/ui/silk-light-background'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

type Role = 'admin' | 'worker' | 'vulnerable'
type Mode = 'select' | 'login' | 'otp'

type LoginChallenge = {
  success: boolean
  otpRequired?: boolean
  challengeId?: string
  maskedEmail?: string
  expiresInSeconds?: number
  resendAfterSeconds?: number
  user?: {
    role?: string
  }
  token?: string
  demoAccount?: boolean
}

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
})

type RoleColor = {
  text: string
  bg: string
  border: string
  glow: string
  hex: string
  gradient: string
}

const ROLE_INFO: Record<
  Role,
  {
    label: string
    desc: string
    icon: typeof Shield
    colors: RoleColor
  }
> = {
  admin: {
    label: 'Administrator',
    desc:
      'Approve registrations, manage accounts, monitor relief operations, and review reports.',
    icon: Shield,
    colors: {
      text:
        'text-violet-600 dark:text-violet-300',
      bg:
        'bg-violet-500/10 dark:bg-violet-500/15',
      border: 'hover:border-violet-400/70',
      glow: 'hover:shadow-violet-500/20',
      hex: '#7c3aed',
      gradient:
        'from-violet-500/10 via-white/70 to-violet-500/0 dark:via-slate-950/50',
    },
  },
  worker: {
    label: 'Field Worker',
    desc:
      'Register vulnerable citizens, record relief distributions, and manage field information.',
    icon: HardHat,
    colors: {
      text:
        'text-amber-600 dark:text-amber-300',
      bg:
        'bg-amber-500/10 dark:bg-amber-500/15',
      border: 'hover:border-amber-400/70',
      glow: 'hover:shadow-amber-500/20',
      hex: '#d97706',
      gradient:
        'from-amber-500/10 via-white/70 to-amber-500/0 dark:via-slate-950/50',
    },
  },
  vulnerable: {
    label: 'Vulnerable Citizen',
    desc:
      'View assistance records, receive community updates, and send feedback to the MSWDO.',
    icon: HeartHandshake,
    colors: {
      text:
        'text-teal-600 dark:text-teal-300',
      bg:
        'bg-teal-500/10 dark:bg-teal-500/15',
      border: 'hover:border-teal-400/70',
      glow: 'hover:shadow-teal-500/20',
      hex: '#0d9488',
      gradient:
        'from-teal-500/10 via-white/70 to-teal-500/0 dark:via-slate-950/50',
    },
  },
}

interface AuthScreenProps {
  onLogin: (
    email: string,
    password: string,
    role: string,
  ) => Promise<LoginChallenge>
  onVerifyOtp: (
    challengeId: string,
    otp: string,
  ) => Promise<any>
  onResendOtp?: (
    challengeId: string,
  ) => Promise<LoginChallenge>
  onRegister?: (
    name: string,
    email: string,
    password: string,
    role: string,
  ) => Promise<any>
  onBack?: () => void
  preferredRole?: string
}

function normalizeRole(
  value?: string | null,
): Role | null {
  return value === 'admin' ||
    value === 'worker' ||
    value === 'vulnerable'
    ? value
    : null
}

export function AuthScreen({
  onLogin,
  onVerifyOtp,
  onResendOtp,
  onBack,
  preferredRole,
}: AuthScreenProps) {
  const initialRole =
    normalizeRole(preferredRole)

  const [mode, setMode] = useState<Mode>(
    initialRole ? 'login' : 'select',
  )
  const [role, setRole] = useState<Role>(
    initialRole ?? 'vulnerable',
  )
  const [submitting, setSubmitting] =
    useState(false)
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null)
  const [showPassword, setShowPassword] =
    useState(false)
  const [challengeId, setChallengeId] =
    useState('')
  const [maskedEmail, setMaskedEmail] =
    useState('')
  const [otp, setOtp] = useState('')
  const [
    resendCooldown,
    setResendCooldown,
  ] = useState(0)

  const isMobile = useIsMobile()
  const reduceMotion = useReducedMotion()
  const minimalMotion =
    Boolean(isMobile) || Boolean(reduceMotion)

  const loginForm = useForm<
    z.infer<typeof loginSchema>
  >({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  useEffect(() => {
    if (isMobile && role === 'admin') {
      setRole('vulnerable')
      setMode('select')
      setErrorMessage(null)
      setChallengeId('')
      setOtp('')
      loginForm.reset()
    }
  }, [isMobile, role, loginForm])

  useEffect(() => {
    if (resendCooldown <= 0) return

    const timer = window.setInterval(() => {
      setResendCooldown((value) =>
        Math.max(0, value - 1),
      )
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [resendCooldown])

  const selected = ROLE_INFO[role]
  const SelectedIcon = selected.icon

  const pageMotion = useMemo(
    () =>
      minimalMotion
        ? {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
          }
        : {
            initial: {
              opacity: 0,
              y: 14,
              scale: 0.985,
            },
            animate: {
              opacity: 1,
              y: 0,
              scale: 1,
            },
            exit: {
              opacity: 0,
              y: -10,
              scale: 0.985,
            },
          },
    [minimalMotion],
  )

  function resetOtpState() {
    setChallengeId('')
    setMaskedEmail('')
    setOtp('')
    setResendCooldown(0)
    setErrorMessage(null)
  }

  function chooseRole(nextRole: Role) {
    setRole(nextRole)
    resetOtpState()
    setMode('login')
  }

  function backToRoleSelection() {
    resetOtpState()
    setMode('select')
  }

  async function handleLogin(
    values: z.infer<typeof loginSchema>,
  ) {
    if (isMobile && role === 'admin') {
      const message =
        'Administrator access is available on a desktop or laptop.'

      setErrorMessage(message)
      toast.error('Desktop required', {
        description: message,
      })
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const result = await Promise.race([
        onLogin(
          values.email,
          values.password,
          role,
        ),
        new Promise<never>((_, reject) =>
          window.setTimeout(
            () =>
              reject(
                new Error(
                  'The sign-in request timed out. Check your connection and try again.',
                ),
              ),
            18000,
          ),
        ),
      ])

      if (
        result?.otpRequired === false &&
        result.user &&
        result.token
      ) {
        toast.success(
          result.demoAccount
            ? 'Demo account signed in'
            : 'Welcome back!',
        )
        return
      }

      if (
        !result?.otpRequired ||
        !result.challengeId
      ) {
        throw new Error(
          'Verification could not be started. Please try again.',
        )
      }

      setChallengeId(result.challengeId)
      setMaskedEmail(
        result.maskedEmail ||
          values.email,
      )
      setResendCooldown(
        result.resendAfterSeconds ?? 45,
      )
      setOtp('')
      setMode('otp')

      toast.success(
        'Verification code sent',
        {
          description:
            'Check your email for the 6-digit code.',
        },
      )
    } catch (error: any) {
      const message =
        error?.message ||
        'Sign in failed. Check your email and password.'

      setErrorMessage(message)
      toast.error('Unable to sign in', {
        description: message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyOtp() {
    if (!challengeId) {
      setMode('login')
      return
    }

    if (!/^\d{6}$/.test(otp)) {
      setErrorMessage(
        'Enter the complete 6-digit verification code.',
      )
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      await onVerifyOtp(challengeId, otp)
      toast.success('Sign in complete')
    } catch (error: any) {
      const message =
        error?.message ||
        'The verification code could not be confirmed.'

      setErrorMessage(message)
      toast.error(
        'Verification failed',
        {
          description: message,
        },
      )

      if (
        /sign in again|no longer valid|expired/i.test(
          message,
        )
      ) {
        resetOtpState()
        setMode('login')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResendOtp() {
    if (
      !onResendOtp ||
      !challengeId ||
      resendCooldown > 0
    ) {
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const result =
        await onResendOtp(challengeId)

      if (!result?.challengeId) {
        throw new Error(
          'A new code could not be requested.',
        )
      }

      setChallengeId(result.challengeId)
      setMaskedEmail(
        result.maskedEmail ||
          maskedEmail,
      )
      setResendCooldown(
        result.resendAfterSeconds ?? 45,
      )
      setOtp('')

      toast.success('New code sent')
    } catch (error: any) {
      const message =
        error?.message ||
        'Unable to resend the verification code.'

      setErrorMessage(message)
      toast.error('Could not resend code', {
        description: message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-shell relative min-h-dvh overflow-x-hidden bg-white">
      {!isMobile ? (
        <SilkLightBackground intensity="medium" />
      ) : null}

      {!minimalMotion ? (
        <>
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[8%] h-72 w-[62rem] max-w-[92vw] -translate-x-1/2 rounded-full bg-emerald-100/55 blur-[90px]"
            animate={{
              opacity: [0.45, 0.82, 0.45],
              scale: [1, 1.06, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[-8rem] right-[4%] h-80 w-80 rounded-full bg-sky-100/50 blur-[100px]"
            animate={{
              x: [0, -22, 0],
              y: [0, -14, 0],
              opacity: [0.35, 0.72, 0.35],
            }}
            transition={{
              duration: 11,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </>
      ) : null}

      {onBack ? (
        <button
          onClick={onBack}
          className="fixed left-3 top-3 z-50 flex min-h-11 items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-md md:left-6 md:top-6"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">
            Back to Home
          </span>
        </button>
      ) : null}

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-6xl flex-col items-center justify-center gap-6 px-4 pb-8 pt-16 sm:gap-8 sm:py-16 md:py-20">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-200 bg-white p-1 shadow-md sm:h-20 sm:w-20">
            <img
              src="/icon.png"
              alt="Community Resource Mapping System"
              className="h-[118%] w-[118%] scale-[1.35] object-contain"
              onError={(event) => {
                const img =
                  event.currentTarget

                if (
                  img.dataset.fallback ===
                  'logos'
                ) {
                  img.src = '/favicon.ico'
                  img.dataset.fallback =
                    'favicon'
                  return
                }

                if (
                  img.dataset.fallback ===
                  'favicon'
                ) {
                  img.src =
                    '/logos/san-policarpo.jpg'
                  img.dataset.fallback =
                    'seal'
                  return
                }

                if (
                  img.dataset.fallback ===
                  'seal'
                ) {
                  img.style.display = 'none'
                  return
                }

                img.src =
                  '/logos/crms-system-icon.png'
                img.dataset.fallback =
                  'logos'
              }}
            />
          </div>

          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure two-step sign in
          </div>

          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl md:text-5xl">
            Community Resource Mapping System
          </h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            Municipality of San Policarpo,
            Eastern Samar
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            LGU San Policarpo · ESSU · DSWD
          </p>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'select' ? (
            <motion.div
              key="role-select"
              className="w-full max-w-5xl"
              {...pageMotion}
              transition={{
                duration: minimalMotion
                  ? 0.12
                  : 0.3,
              }}
            >
              <div className="mb-5 text-center">
                <h2 className="text-base font-bold text-foreground sm:text-lg">
                  How will you use the system?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose your account type to
                  continue.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-5 md:grid-cols-3">
                {(Object.keys(
                  ROLE_INFO,
                ) as Role[])
                  .filter(
                    (availableRole) =>
                      !(
                        isMobile &&
                        availableRole ===
                          'admin'
                      ),
                  )
                  .map((nextRole) => {
                    const info =
                      ROLE_INFO[nextRole]
                    const Icon = info.icon
                    const colors =
                      info.colors

                    return (
                      <button
                        key={nextRole}
                        onClick={() =>
                          chooseRole(
                            nextRole,
                          )
                        }
                        className={cn(
                          'auth-role-card relative flex min-h-[150px] flex-col items-start gap-3 overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br p-5 text-left shadow-md transition md:min-h-[190px] md:p-6',
                          nextRole ===
                            'admin' &&
                            'hidden md:flex',
                          colors.gradient,
                          colors.border,
                          !minimalMotion &&
                            colors.glow,
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-11 w-11 items-center justify-center rounded-2xl',
                            colors.bg,
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-5 w-5',
                              colors.text,
                            )}
                          />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-foreground sm:text-lg">
                            {info.label}
                          </h3>
                          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                            {info.desc}
                          </p>
                        </div>
                        <span
                          className="mt-auto text-sm font-bold"
                          style={{
                            color:
                              colors.hex,
                          }}
                        >
                          Continue →
                        </span>
                      </button>
                    )
                  })}
              </div>

              {isMobile ? (
                <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
                  Administrator tools are
                  available on desktop or
                  laptop for the alpha test.
                </p>
              ) : null}
            </motion.div>
          ) : (
            <motion.div
              key={mode}
              className="w-full max-w-md"
              {...pageMotion}
              transition={{
                duration: minimalMotion
                  ? 0.12
                  : 0.3,
              }}
            >
              <Card className="auth-form-card overflow-hidden border-primary/15 bg-card shadow-xl sm:bg-card/90">
                <CardHeader className="pb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={
                      mode === 'otp'
                        ? () => {
                            resetOtpState()
                            setMode('login')
                          }
                        : backToRoleSelection
                    }
                    className="mb-2 w-fit gap-1 rounded-full px-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {mode === 'otp'
                      ? 'Change account'
                      : 'Back'}
                  </Button>

                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-2xl shadow-inner',
                        selected.colors.bg,
                      )}
                    >
                      {mode === 'otp' ? (
                        <MailCheck className="h-5 w-5 text-primary" />
                      ) : (
                        <SelectedIcon
                          className={cn(
                            'h-5 w-5',
                            selected.colors.text,
                          )}
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <CardTitle className="text-xl">
                        {mode === 'otp'
                          ? 'Verify your login'
                          : 'Sign in'}
                      </CardTitle>
                      <CardDescription>
                        {mode === 'otp'
                          ? 'One more step keeps your account safer.'
                          : `${selected.label} account`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {mode === 'login' ? (
                    <form
                      onSubmit={loginForm.handleSubmit(
                        handleLogin,
                      )}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="email">
                          Email address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          {...loginForm.register(
                            'email',
                          )}
                          placeholder="name@example.com"
                          className="h-11"
                        />
                        {loginForm.formState
                          .errors.email ? (
                          <p className="text-xs text-destructive">
                            {
                              loginForm
                                .formState
                                .errors.email
                                .message
                            }
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={
                              showPassword
                                ? 'text'
                                : 'password'
                            }
                            autoComplete="current-password"
                            {...loginForm.register(
                              'password',
                            )}
                            placeholder="Enter your password"
                            className="h-11 pr-11"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword(
                                (value) =>
                                  !value,
                              )
                            }
                            className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={
                              showPassword
                                ? 'Hide password'
                                : 'Show password'
                            }
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {loginForm.formState
                          .errors.password ? (
                          <p className="text-xs text-destructive">
                            {
                              loginForm
                                .formState
                                .errors.password
                                .message
                            }
                          </p>
                        ) : null}
                      </div>

                      {errorMessage ? (
                        <div
                          role="alert"
                          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700"
                        >
                          {errorMessage}
                        </div>
                      ) : null}

                      <Button
                        type="submit"
                        disabled={submitting}
                        className="w-full gap-2 rounded-xl"
                        size="lg"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogIn className="h-4 w-4" />
                        )}
                        {submitting
                          ? 'Checking account...'
                          : 'Continue securely'}
                      </Button>

                      <div className="rounded-xl bg-muted/70 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                        After your password is
                        confirmed, we will email
                        you a 6-digit verification
                        code.
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-5">
                      <div className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-3 text-sm leading-relaxed text-muted-foreground">
                        We sent a 6-digit code to{' '}
                        <strong className="text-foreground">
                          {maskedEmail}
                        </strong>
                        . The code expires in 5
                        minutes.
                      </div>

                      <div className="space-y-2">
                        <Label>
                          Verification code
                        </Label>
                        <InputOTP
                          maxLength={6}
                          value={otp}
                          onChange={(value) => {
                            setOtp(
                              value.replace(
                                /\D/g,
                                '',
                              ),
                            )
                            setErrorMessage(
                              null,
                            )
                          }}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          containerClassName="justify-center"
                          disabled={submitting}
                        >
                          <InputOTPGroup>
                            {Array.from({
                              length: 6,
                            }).map(
                              (_, index) => (
                                <InputOTPSlot
                                  key={index}
                                  index={
                                    index
                                  }
                                  className="h-12 w-10 text-base font-bold sm:w-11"
                                />
                              ),
                            )}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>

                      {errorMessage ? (
                        <div
                          role="alert"
                          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700"
                        >
                          {errorMessage}
                        </div>
                      ) : null}

                      <Button
                        type="button"
                        onClick={
                          handleVerifyOtp
                        }
                        disabled={
                          submitting ||
                          otp.length !== 6
                        }
                        className="w-full gap-2 rounded-xl"
                        size="lg"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                        {submitting
                          ? 'Verifying...'
                          : 'Verify and sign in'}
                      </Button>

                      <div className="flex flex-col items-center gap-2 text-center">
                        <p className="text-xs text-muted-foreground">
                          Didn&apos;t receive the
                          email? Check your spam
                          folder first.
                        </p>

                        {onResendOtp ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={
                              handleResendOtp
                            }
                            disabled={
                              submitting ||
                              resendCooldown >
                                0
                            }
                            className="gap-2 rounded-full"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            {resendCooldown >
                            0
                              ? `Resend in ${resendCooldown}s`
                              : 'Resend code'}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-xl rounded-2xl border border-emerald-100 bg-white/90 px-4 py-3 text-center text-xs leading-relaxed text-slate-600 shadow-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            Alpha testing
          </span>
          <span className="mx-2 text-slate-300">
            ·
          </span>
          Use your assigned account and a real
          email address so you can receive the
          login code.
        </div>
      </div>
    </div>
  )
}
