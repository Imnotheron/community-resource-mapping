'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CircleHelp, Maximize2, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { AuthUser } from '@/lib/api-client'
import {
  isNewWalkthroughAccount,
  userScopedTourId,
} from '@/components/walkthrough/onboarding-policy'
import {
  markRegistrationModalExperience,
  resizeRegistrationModal,
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
        if (
          current?.modal === next?.modal &&
          current?.controlsHost === next?.controlsHost
        ) {
          return current
        }
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
    if (!experience) return

    // Radix Dialog normally dismisses when a pointer or focus moves outside the
    // DialogContent. Walkthrough controls are intentionally portaled to the
    // document body, so without this guard, clicking Next/Back can be mistaken
    // for an outside click and close a partially completed registration form.
    // While this data-entry modal is open, users close it explicitly with X or
    // Cancel instead of losing work through an accidental outside interaction.
    const preventDismiss = (event: Event) => {
      event.preventDefault()
    }

    document.addEventListener(
      'dismissableLayer.pointerDownOutside',
      preventDismiss,
      true,
    )
    document.addEventListener(
      'dismissableLayer.focusOutside',
      preventDismiss,
      true,
    )

    return () => {
      document.removeEventListener(
        'dismissableLayer.pointerDownOutside',
        preventDismiss,
        true,
      )
      document.removeEventListener(
        'dismissableLayer.focusOutside',
        preventDismiss,
        true,
      )
    }
  }, [experience])

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

      {experience
        ? createPortal(
            <div
              data-registration-form-controls="true"
              data-tour="registration-modal-size-controls"
              className="flex items-center gap-1.5"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  resizeRegistrationModal(experience.modal, 'reset')
                }
                disabled={Boolean(activeTourId)}
                className="h-8 gap-1.5 rounded-full px-2.5 text-xs"
                title="Return the registration window to its recommended size"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden 2xl:inline">Reset size</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  resizeRegistrationModal(experience.modal, 'fit')
                }
                disabled={Boolean(activeTourId)}
                className="h-8 gap-1.5 rounded-full px-2.5 text-xs"
                title="Fit the registration window to the available screen"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden 2xl:inline">Fit screen</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openGuide}
                disabled={Boolean(activeTourId)}
                aria-label="Open registration form guide"
                className="h-8 gap-1.5 rounded-full border-emerald-200 bg-white px-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                <CircleHelp className="h-3.5 w-3.5" />
                Form guide
              </Button>
            </div>,
            experience.controlsHost,
          )
        : null}
    </>
  )
}
