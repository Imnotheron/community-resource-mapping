'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { CircleHelp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { AuthUser } from '@/lib/api-client'
import { isNewWalkthroughAccount } from '@/components/walkthrough/onboarding-policy'
import {
  useWalkthrough,
  useWalkthroughTour,
} from '@/components/walkthrough/walkthrough-provider'
import type { WalkthroughTour } from '@/components/walkthrough/types'

type ContextualFeatureGuideProps = {
  user: AuthUser
  tour: WalkthroughTour
  navId: string
  label: string
  ariaLabel?: string
  icon?: ReactNode
  discover: () => boolean
  clear: () => void
  isFeatureVisible: () => boolean
  onLeave?: () => void | Promise<void>
  onTourClosed?: () => void | Promise<void>
  discoveryTimeoutMs?: number
}

function navTargetFromEvent(event: MouseEvent) {
  const origin = event.target
  if (!(origin instanceof Element)) return null

  return origin.closest<HTMLElement>(
    '[data-tour^="nav-"], [data-tour^="mobile-nav-"]',
  )
}

function isFeatureNav(target: HTMLElement, navId: string) {
  return (
    target.dataset.tour === `nav-${navId}` ||
    target.dataset.tour === `mobile-nav-${navId}`
  )
}

export function ContextualFeatureGuide({
  user,
  tour,
  navId,
  label,
  ariaLabel,
  icon,
  discover,
  clear,
  isFeatureVisible,
  onLeave,
  onTourClosed,
  discoveryTimeoutMs = 12_000,
}: ContextualFeatureGuideProps) {
  const [featureOpen, setFeatureOpen] = useState(false)
  const featureOpenRef = useRef(false)
  const activeTourIdRef = useRef<string | null>(null)
  const wasOwnTourActiveRef = useRef(false)
  const discoveryIntervalRef = useRef<number | null>(null)
  const discoveryTimeoutRef = useRef<number | null>(null)

  const {
    hydrated,
    activeTourId,
    startTour,
    closeTour,
  } = useWalkthrough()
  const { start } = useWalkthroughTour(tour)

  useEffect(() => {
    activeTourIdRef.current = activeTourId

    const ownTourActive = activeTourId === tour.id
    if (wasOwnTourActiveRef.current && !ownTourActive) {
      void onTourClosed?.()
    }
    wasOwnTourActiveRef.current = ownTourActive
  }, [activeTourId, onTourClosed, tour.id])

  useEffect(() => {
    const setOpen = (open: boolean) => {
      featureOpenRef.current = open
      setFeatureOpen(open)
    }

    const stopDiscovery = () => {
      if (discoveryIntervalRef.current !== null) {
        window.clearInterval(discoveryIntervalRef.current)
        discoveryIntervalRef.current = null
      }
      if (discoveryTimeoutRef.current !== null) {
        window.clearTimeout(discoveryTimeoutRef.current)
        discoveryTimeoutRef.current = null
      }
    }

    const attemptDiscovery = () => {
      const found = isFeatureVisible() && discover()
      setOpen(found)
      if (found) stopDiscovery()
      return found
    }

    const beginDiscovery = () => {
      stopDiscovery()
      clear()
      setOpen(false)

      if (attemptDiscovery()) return

      discoveryIntervalRef.current = window.setInterval(
        attemptDiscovery,
        150,
      )
      discoveryTimeoutRef.current = window.setTimeout(
        stopDiscovery,
        discoveryTimeoutMs,
      )
    }

    const leaveFeature = () => {
      stopDiscovery()
      clear()
      setOpen(false)
      void onLeave?.()

      if (activeTourIdRef.current === tour.id) {
        closeTour()
      }
    }

    const handleNavigationClick = (event: MouseEvent) => {
      const target = navTargetFromEvent(event)
      if (!target) return

      if (isFeatureNav(target, navId)) {
        window.setTimeout(beginDiscovery, 0)
      } else if (featureOpenRef.current || activeTourIdRef.current === tour.id) {
        leaveFeature()
      }
    }

    const observer = new MutationObserver(() => {
      if (featureOpenRef.current && !isFeatureVisible()) {
        leaveFeature()
      }
    })

    document.addEventListener('click', handleNavigationClick, true)
    observer.observe(document.body, { childList: true, subtree: true })
    attemptDiscovery()

    return () => {
      document.removeEventListener('click', handleNavigationClick, true)
      observer.disconnect()
      stopDiscovery()
      clear()
    }
  }, [
    clear,
    closeTour,
    discover,
    discoveryTimeoutMs,
    isFeatureVisible,
    navId,
    onLeave,
    tour.id,
  ])

  useEffect(() => {
    if (
      !hydrated ||
      !featureOpen ||
      activeTourId ||
      !isNewWalkthroughAccount(user.createdAt)
    ) {
      return
    }

    const timer = window.setTimeout(() => {
      if (!isFeatureVisible() || !discover()) {
        featureOpenRef.current = false
        setFeatureOpen(false)
        return
      }
      startTour(tour.id)
    }, 700)

    return () => window.clearTimeout(timer)
  }, [
    activeTourId,
    discover,
    featureOpen,
    hydrated,
    isFeatureVisible,
    startTour,
    tour.id,
    user.createdAt,
  ])

  if (!featureOpen || activeTourId) return null

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        if (!isFeatureVisible() || !discover()) {
          featureOpenRef.current = false
          setFeatureOpen(false)
          return
        }
        start()
      }}
      aria-label={ariaLabel || `Open ${label}`}
      className="fixed bottom-40 right-4 z-40 rounded-full border-emerald-200 bg-white/95 text-emerald-700 shadow-lg backdrop-blur-xl hover:bg-emerald-50 md:bottom-24 md:right-6"
    >
      {icon || <CircleHelp className="h-4 w-4" />}
      {label}
    </Button>
  )
}
