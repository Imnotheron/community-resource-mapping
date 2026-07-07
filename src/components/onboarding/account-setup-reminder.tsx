'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Camera, KeyRound, ShieldCheck, X } from 'lucide-react'

type AccountSetupUser = {
  id: string
  name?: string | null
  email?: string | null
  role?: string | null
  profilePicture?: string | null
  temporaryPasswordIssued?: boolean
  passwordChangedAt?: string | Date | null
  onboardingReminderDismissedAt?: string | Date | null
}

const REMIND_LATER_HOURS = 24

function isWithinRemindLaterWindow(value?: string | Date | null) {
  if (!value) return false

  const dismissedAt = new Date(value).getTime()

  if (Number.isNaN(dismissedAt)) return false

  const remindLaterMs = REMIND_LATER_HOURS * 60 * 60 * 1000

  return Date.now() - dismissedAt < remindLaterMs
}

function getStoredUser(): AccountSetupUser | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveStoredUserPatch(patch: Partial<AccountSetupUser>) {
  if (typeof window === 'undefined') return

  try {
    const current = getStoredUser() || {}
    localStorage.setItem('user', JSON.stringify({ ...current, ...patch }))
  } catch {
    // Ignore localStorage write failures.
  }
}

export default function AccountSetupReminder() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<AccountSetupUser | null>(null)
  const [isDismissedForSession, setIsDismissedForSession] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)

  const shouldCheck = useMemo(() => {
    if (!pathname) return false

    const blockedPaths = ['/', '/intro', '/login', '/register', '/profile']

    return !blockedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  }, [pathname])

  useEffect(() => {
    let cancelled = false

    async function loadAccountSetupState() {
      setIsDismissedForSession(false)

      if (!shouldCheck) {
        setUser(null)
        return
      }

      const storedUser = getStoredUser()

      if (!storedUser?.id) {
        setUser(null)
        return
      }

      setUser(storedUser)

      try {
        const response = await fetch('/api/user/settings', {
          headers: {
            'x-user-id': storedUser.id,
          },
          cache: 'no-store',
        })

        const data = await response.json().catch(() => null)

        if (!cancelled && response.ok && data?.success && data.user) {
          setUser(data.user)
          saveStoredUserPatch({
            profilePicture: data.user.profilePicture,
            temporaryPasswordIssued: data.user.temporaryPasswordIssued,
            passwordChangedAt: data.user.passwordChangedAt,
            onboardingReminderDismissedAt: data.user.onboardingReminderDismissedAt,
          })
        }
      } catch {
        // Keep using localStorage data when the request fails.
      }
    }

    loadAccountSetupState()

    return () => {
      cancelled = true
    }
  }, [shouldCheck, pathname])

  const shouldRecommendPasswordChange = Boolean(
    user?.temporaryPasswordIssued && !user?.passwordChangedAt
  )

  const shouldRecommendProfilePicture = Boolean(user && !user.profilePicture)

  const isReminderRecentlyDismissed = isWithinRemindLaterWindow(user?.onboardingReminderDismissedAt)

  const shouldShow = Boolean(
    user?.id &&
      !isDismissedForSession &&
      !isReminderRecentlyDismissed &&
      (shouldRecommendPasswordChange || shouldRecommendProfilePicture)
  )

  async function handleRemindLater() {
    if (!user?.id || isDismissing) return

    setIsDismissing(true)

    const dismissedAt = new Date().toISOString()

    try {
      await fetch('/api/user/onboarding-reminder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ action: 'dismiss' }),
      })
    } catch {
      // Still hide the reminder locally even if the server is offline.
    } finally {
      saveStoredUserPatch({ onboardingReminderDismissedAt: dismissedAt })
      setUser((current) =>
        current ? { ...current, onboardingReminderDismissedAt: dismissedAt } : current
      )
      setIsDismissedForSession(true)
      setIsDismissing(false)
    }
  }

  if (!shouldShow) return null

  return (
    <div className="fixed bottom-5 right-5 z-[70] w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl shadow-slate-900/15 dark:border-emerald-900/60 dark:bg-slate-950">
      <button
        type="button"
        onClick={handleRemindLater}
        className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        aria-label="Dismiss account setup reminder"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex gap-3 pr-8">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <ShieldCheck className="h-5 w-5" />
        </div>

        <div className="min-w-0 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
              Complete your account setup
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
              You can continue using the system, but we recommend improving your account security and recognizability.
            </p>
          </div>

          <div className="space-y-2">
            {shouldRecommendPasswordChange && (
              <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  You are still using a temporary password. We recommend changing it to one only you know.
                </span>
              </div>
            )}

            {shouldRecommendProfilePicture && (
              <div className="flex gap-2 rounded-xl border border-sky-200 bg-sky-50 p-2.5 text-xs text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100">
                <Camera className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Add a profile picture so admins, workers, and vulnerable users can recognize your account faster.
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => router.push('/profile')}
            >
              Open Profile Settings
            </Button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleRemindLater}
              disabled={isDismissing}
            >
              Remind Me Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
