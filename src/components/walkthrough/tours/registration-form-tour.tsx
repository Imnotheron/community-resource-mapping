'use client'

import { useEffect, useMemo, useState } from 'react'
import { CircleHelp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { AuthUser } from '@/lib/api-client'
import {
  isNewWalkthroughAccount,
  userScopedTourId,
} from '@/components/walkthrough/onboarding-policy'
import {
  markRegistrationModalExperience,
  type RegistrationModalExperience,
} from '@/components/walkthrough/registration-modal-dom'
import { RegistrationModalLayoutStyles } from '@/components/walkthrough/registration-modal-layout'
import {
  useWalkthrough,
  useWalkthroughTour,
} from '@/components/walkthrough/walkthrough-provider'
import { createRegistrationFormTour } from '@/components/walkthrough/tours/registration-form-tour-config'

export function RegistrationFormWalkthrough({ user }: { user: AuthUser }) {
  const [experience, setExperience] = useState<RegistrationModalExperience | null>(null)

  const {
    hydrated,
    activeTourId,
    closeTour,
    startTour,
  } = useWalkthrough()

  const tour = useMemo(
    () =>
      createRegistrationFormTour(
        userScopedTourId('admin-registration-form-first-use', user.id),
      ),
    [user.id],
  )

  const { start } = useWalkthroughTour(tour)

  useEffect(() => {
    const refresh = () => {
      const next = markRegistrationModalExperience()
      setExperience((current) => {
        if (current?.modal === next?.modal) return current
        return next
      })
    }

    refresh()
    const interval = window.setInterval(refresh, 250)
    window.addEventListener('resize', refresh)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('resize', refresh)
    }
  }, [])

  useEffect(() => {
    if (!experience && activeTourId === tour.id) {
      closeTour()
    }
  }, [activeTourId, closeTour, experience, tour.id])

  useEffect(() => {
    if (
      !hydrated ||
      !experience ||
      !isNewWalkthroughAccount(user.createdAt) ||
      activeTourId
    ) {
      return
    }

    const timer = window.setTimeout(() => {
      markRegistrationModalExperience()
      startTour(tour.id)
    }, 750)

    return () => window.clearTimeout(timer)
  }, [
    activeTourId,
    experience,
    hydrated,
    startTour,
    tour.id,
    user.createdAt,
  ])

  const openGuide = () => {
    markRegistrationModalExperience()
    start()
  }

  return (
    <>
      <RegistrationModalLayoutStyles />

      {experience && !activeTourId ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openGuide}
          aria-label="Open registration form guide"
          className="fixed bottom-44 right-6 z-[110] rounded-full border-emerald-200 bg-white/95 px-3 text-xs font-semibold text-emerald-700 shadow-lg backdrop-blur hover:bg-emerald-50"
        >
          <CircleHelp className="h-3.5 w-3.5" />
          Form guide
        </Button>
      ) : null}
    </>
  )
}
