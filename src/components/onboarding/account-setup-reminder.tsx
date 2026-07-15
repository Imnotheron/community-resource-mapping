'use client'

import {
  Camera,
  KeyRound,
  ShieldCheck,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { Button } from '@/components/ui/button'
import type { AuthUser } from '@/lib/api-client'

interface AccountSetupReminderProps {
  user: AuthUser
  onOpenProfile: () => void
}

const REMIND_LATER_HOURS = 24
const EXIT_ANIMATION_MS = 320

function isWithinRemindLaterWindow(
  value?: string | Date | null,
) {
  if (!value) return false

  const dismissedAt = new Date(value).getTime()

  if (Number.isNaN(dismissedAt)) {
    return false
  }

  const remindLaterMs =
    REMIND_LATER_HOURS * 60 * 60 * 1000

  return (
    Date.now() - dismissedAt <
    remindLaterMs
  )
}

function patchStoredUser(
  patch: Partial<AuthUser>,
) {
  if (typeof window === 'undefined') {
    return
  }

  for (const key of [
    'crms_user',
    'user',
  ]) {
    try {
      const raw =
        localStorage.getItem(key)

      if (!raw) continue

      const current = JSON.parse(raw)

      localStorage.setItem(
        key,
        JSON.stringify({
          ...current,
          ...patch,
        }),
      )
    } catch {
      // Ignore an invalid or unavailable storage entry.
    }
  }
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds)
  })
}

export default function AccountSetupReminder({
  user,
  onOpenProfile,
}: AccountSetupReminderProps) {
  const [
    isDismissedForSession,
    setIsDismissedForSession,
  ] = useState(false)
  const [
    isDismissing,
    setIsDismissing,
  ] = useState(false)
  const [
    dismissedAt,
    setDismissedAt,
  ] = useState<
    string | Date | null | undefined
  >(
    user.onboardingReminderDismissedAt,
  )
  const [
    isMounted,
    setIsMounted,
  ] = useState(false)
  const [
    isVisible,
    setIsVisible,
  ] = useState(false)

  const enterFrameRef =
    useRef<number | null>(null)
  const enterSecondFrameRef =
    useRef<number | null>(null)
  const unmountTimerRef =
    useRef<number | null>(null)

  useEffect(() => {
    setIsDismissedForSession(false)
    setDismissedAt(
      user.onboardingReminderDismissedAt,
    )
  }, [
    user.id,
    user.onboardingReminderDismissedAt,
  ])

  const stillUsingTemporaryPassword =
    useMemo(
      () =>
        Boolean(
          user.temporaryPasswordIssued &&
            !user.passwordChangedAt,
        ),
      [
        user.temporaryPasswordIssued,
        user.passwordChangedAt,
      ],
    )

  const shouldMentionProfilePicture =
    Boolean(!user.profilePicture)

  const reminderRecentlyDismissed =
    isWithinRemindLaterWindow(
      dismissedAt,
    )

  const shouldShow =
    stillUsingTemporaryPassword &&
    !isDismissedForSession &&
    !reminderRecentlyDismissed

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (unmountTimerRef.current !== null) {
      window.clearTimeout(
        unmountTimerRef.current,
      )
      unmountTimerRef.current = null
    }

    if (shouldShow) {
      setIsMounted(true)
      setIsVisible(false)

      enterFrameRef.current =
        window.requestAnimationFrame(() => {
          enterSecondFrameRef.current =
            window.requestAnimationFrame(() => {
              setIsVisible(true)
            })
        })

      return
    }

    setIsVisible(false)

    if (isMounted) {
      unmountTimerRef.current =
        window.setTimeout(() => {
          setIsMounted(false)
        }, EXIT_ANIMATION_MS)
    }

    return () => {
      if (enterFrameRef.current !== null) {
        window.cancelAnimationFrame(
          enterFrameRef.current,
        )
      }

      if (
        enterSecondFrameRef.current !==
        null
      ) {
        window.cancelAnimationFrame(
          enterSecondFrameRef.current,
        )
      }
    }
  }, [shouldShow, isMounted])

  useEffect(
    () => () => {
      if (enterFrameRef.current !== null) {
        window.cancelAnimationFrame(
          enterFrameRef.current,
        )
      }

      if (
        enterSecondFrameRef.current !==
        null
      ) {
        window.cancelAnimationFrame(
          enterSecondFrameRef.current,
        )
      }

      if (unmountTimerRef.current !== null) {
        window.clearTimeout(
          unmountTimerRef.current,
        )
      }
    },
    [],
  )

  async function handleRemindLater() {
    if (isDismissing) return

    setIsDismissing(true)
    setIsVisible(false)

    await wait(EXIT_ANIMATION_MS)

    const localDismissedAt =
      new Date().toISOString()

    try {
      const response = await fetch(
        '/api/user/onboarding-reminder',
        {
          method: 'PUT',
          headers: {
            'Content-Type':
              'application/json',
            'x-user-id': user.id,
          },
          body: JSON.stringify({
            action: 'dismiss',
          }),
        },
      )

      const data = await response
        .json()
        .catch(() => null)

      const serverDismissedAt =
        data?.user
          ?.onboardingReminderDismissedAt

      const finalDismissedAt =
        serverDismissedAt ||
        localDismissedAt

      patchStoredUser({
        onboardingReminderDismissedAt:
          finalDismissedAt,
      })
      setDismissedAt(finalDismissedAt)
    } catch {
      patchStoredUser({
        onboardingReminderDismissedAt:
          localDismissedAt,
      })
      setDismissedAt(
        localDismissedAt,
      )
    } finally {
      setIsDismissedForSession(true)
      setIsDismissing(false)
      setIsMounted(false)
    }
  }

  function handleOpenProfile() {
    setIsVisible(false)

    window.setTimeout(() => {
      onOpenProfile()
    }, 180)
  }

  if (!isMounted) {
    return null
  }

  return (
    <aside
      aria-label="Account setup reminder"
      aria-live="polite"
      className={[
        'fixed bottom-5 right-5 z-[70]',
        'w-[min(420px,calc(100vw-2rem))]',
        'overflow-hidden rounded-2xl',
        'border border-emerald-200',
        'bg-white p-4',
        'shadow-2xl shadow-slate-900/15',
        'dark:border-emerald-900/60',
        'dark:bg-slate-950',
        'origin-bottom-right',
        'will-change-[transform,opacity,filter]',
        'transition-[transform,opacity,filter]',
        'duration-500',
        'ease-[cubic-bezier(0.22,1,0.36,1)]',
        'motion-reduce:transition-none',
        isVisible
          ? 'translate-y-0 scale-100 opacity-100 blur-0'
          : 'pointer-events-none translate-y-8 scale-[0.96] opacity-0 blur-[2px]',
      ].join(' ')}
    >
      <div
        aria-hidden="true"
        className={[
          'absolute inset-x-0 top-0 h-1',
          'origin-left bg-gradient-to-r',
          'from-emerald-400 via-teal-400 to-cyan-400',
          'transition-transform duration-700',
          'ease-[cubic-bezier(0.22,1,0.36,1)]',
          'motion-reduce:transition-none',
          isVisible
            ? 'scale-x-100'
            : 'scale-x-0',
        ].join(' ')}
      />

      <button
        type="button"
        onClick={() =>
          void handleRemindLater()
        }
        className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 transition hover:rotate-90 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 motion-reduce:hover:rotate-0 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        aria-label="Remind me later"
        disabled={isDismissing}
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex gap-3 pr-8">
        <div
          className={[
            'grid h-11 w-11 shrink-0',
            'place-items-center rounded-2xl',
            'bg-emerald-100 text-emerald-700',
            'dark:bg-emerald-950',
            'dark:text-emerald-300',
            'transition-[transform,opacity]',
            'duration-700 delay-100',
            'ease-[cubic-bezier(0.22,1,0.36,1)]',
            'motion-reduce:transition-none',
            isVisible
              ? 'rotate-0 scale-100 opacity-100'
              : '-rotate-12 scale-75 opacity-0',
          ].join(' ')}
        >
          <ShieldCheck className="h-5 w-5" />
        </div>

        <div
          className={[
            'min-w-0 space-y-3',
            'transition-[transform,opacity]',
            'duration-500 delay-100',
            'ease-out',
            'motion-reduce:transition-none',
            isVisible
              ? 'translate-x-0 opacity-100'
              : 'translate-x-3 opacity-0',
          ].join(' ')}
        >
          <div>
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
              Complete your account setup
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
              Welcome to your new account. You can continue
              using the system now, but completing these
              recommendations will make your account more
              secure and recognizable.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                You are still using the temporary password
                from your welcome email. Changing it is
                recommended, but it will not block you from
                using the system.
              </span>
            </div>

            {shouldMentionProfilePicture && (
              <div className="flex gap-2 rounded-xl border border-sky-200 bg-sky-50 p-2.5 text-xs text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100">
                <Camera className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  You may also add a profile picture so
                  other authorized users can recognize your
                  account.
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 transition-transform hover:-translate-y-0.5 hover:bg-emerald-700 active:translate-y-0 motion-reduce:transform-none"
              onClick={handleOpenProfile}
            >
              Open Profile Settings
            </Button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                void handleRemindLater()
              }
              disabled={isDismissing}
            >
              {isDismissing
                ? 'Saving…'
                : 'Remind Me Later'}
            </Button>
          </div>

          <p className="text-[0.6875rem] leading-4 text-slate-500 dark:text-slate-400">
            This reminder disappears permanently after you
            replace the temporary password. “Remind Me
            Later” hides it for 24 hours.
          </p>
        </div>
      </div>
    </aside>
  )
}
