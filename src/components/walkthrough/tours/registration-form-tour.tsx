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

  const registrationRole = String(user.role || '').toUpperCase() === 'WORKER'
    ? 'WORKER'
    : 'ADMIN'
  const baseTourId = registrationRole === 'WORKER'
    ? 'worker-registration-form-first-use'
    : 'admin-registration-form-first-use'

  const tour = useMemo(
    () =>
      createRegistrationFormTour(
        userScopedTourId(baseTourId, user.id),
        registrationRole,
      ),
    [baseTourId, registrationRole, user.id],
  )

  // Register without automatic provider start. The modal detector below starts
  // the role-specific tour only after the real registration window exists.
  useWalkthroughTour(tour)

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

    // A page-level registration guide may still be active when the modal opens.
    // Close it first, then force-start the form guide on the next paint.
    if (activeTourId && activeTourId !== tour.id) {
      closeTour()
    }

    window.requestAnimationFrame(() => {
      startTour(tour.id, { force: true })
    })
  }

  return (
    <>
      <RegistrationModalLayoutStyles />

      {experience
        ? createPortal(
            <div
              data-registration-form-controls="true"
              data-tour="registration-modal-size-controls"
              className="relative z-[120] flex items-center gap-1.5 pointer-events-auto"
              style={{ pointerEvents: 'auto' }}
              onPointerDown={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
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
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  openGuide()
                }}
                aria-label="Open registration form guide"
                className="h-8 gap-1.5 rounded-full border-emerald-200 bg-white px-2.5 text-xs font-semibold text-emerald-700 pointer-events-auto hover:bg-emerald-50"
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
