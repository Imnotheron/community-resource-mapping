'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { AuthUser } from '@/lib/api-client'
import {
  isNewWalkthroughAccount,
  userScopedTourId,
} from '@/components/walkthrough/onboarding-policy'
import {
  useWalkthrough,
  useWalkthroughTour,
} from '@/components/walkthrough/walkthrough-provider'
import type { WalkthroughTour } from '@/components/walkthrough/types'

const ANCHOR_ATTRIBUTE = 'data-analytics-tour-anchor'
const DISCOVERY_INTERVAL_MS = 150
const DISCOVERY_TIMEOUT_MS = 12_000

const TARGETS = {
  header: '[data-tour="analytics-feature-header"]',
  metrics: '[data-tour="analytics-summary-metrics"]',
  registrations: '[data-tour="analytics-registration-trend"]',
  distributions: '[data-tour="analytics-distribution-trend"]',
  vulnerabilities: '[data-tour="analytics-vulnerability-breakdown"]',
  distributionTypes: '[data-tour="analytics-distribution-types"]',
} as const

function isVisible(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden'
  )
}

function clearAnalyticsAnchors() {
  document
    .querySelectorAll<HTMLElement>(`[${ANCHOR_ATTRIBUTE}="true"]`)
    .forEach((element) => {
      element.removeAttribute('data-tour')
      element.removeAttribute(ANCHOR_ATTRIBUTE)
    })
}

function setAnchor(element: HTMLElement | null, tourName: string) {
  if (!element) return false

  element.setAttribute('data-tour', tourName)
  element.setAttribute(ANCHOR_ATTRIBUTE, 'true')
  return true
}

function findVisibleAnalyticsHeading() {
  return (
    Array.from(document.querySelectorAll<HTMLHeadingElement>('h1')).find(
      (heading) =>
        heading.textContent?.trim() === 'Analytics' && isVisible(heading),
    ) ?? null
  )
}

function findCardByTitle(root: HTMLElement, title: string) {
  const candidates = Array.from(root.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  )

  return (
    candidates.find((card) =>
      card.textContent?.replace(/\s+/g, ' ').includes(title),
    ) ?? null
  )
}

/**
 * The Admin dashboard currently owns Analytics inside one large dashboard file.
 * Rather than coupling the walkthrough to fragile utility-class selectors, this
 * adapter identifies the visible Analytics screen by its semantic heading and
 * assigns temporary data-tour anchors to the real rendered sections.
 *
 * The anchors are removed as soon as the user leaves Analytics.
 */
function markAnalyticsAnchors() {
  clearAnalyticsAnchors()

  const heading = findVisibleAnalyticsHeading()
  if (!heading) return false

  const header = heading.parentElement
  const root = header?.parentElement

  if (!(header instanceof HTMLElement) || !(root instanceof HTMLElement)) {
    return false
  }

  const directSections = Array.from(root.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  )

  const metrics = directSections[1] ?? null
  const charts = directSections[2] ?? null

  if (!(metrics instanceof HTMLElement) || !(charts instanceof HTMLElement)) {
    return false
  }

  const registrations = findCardByTitle(charts, 'Registrations (90 days)')
  const distributions = findCardByTitle(charts, 'Distributions (90 days)')
  const vulnerabilities = findCardByTitle(charts, 'Vulnerability Breakdown')
  const distributionTypes = findCardByTitle(charts, 'Distribution Types')

  const requiredTargets = [
    header,
    metrics,
    registrations,
    distributions,
    vulnerabilities,
    distributionTypes,
  ]

  if (requiredTargets.some((target) => !(target instanceof HTMLElement))) {
    clearAnalyticsAnchors()
    return false
  }

  setAnchor(header, 'analytics-feature-header')
  setAnchor(metrics, 'analytics-summary-metrics')
  setAnchor(registrations, 'analytics-registration-trend')
  setAnchor(distributions, 'analytics-distribution-trend')
  setAnchor(vulnerabilities, 'analytics-vulnerability-breakdown')
  setAnchor(distributionTypes, 'analytics-distribution-types')

  return true
}

export function AnalyticsWalkthrough({ user }: { user: AuthUser }) {
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const discoveryIntervalRef = useRef<number | null>(null)
  const discoveryTimeoutRef = useRef<number | null>(null)

  const { hydrated, activeTourId, startTour } = useWalkthrough()

  const tour = useMemo<WalkthroughTour>(
    () => ({
      id: userScopedTourId('admin-analytics-first-use', user.id),
      version: 1,
      title: 'Analytics guide',
      role: 'ADMIN',
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to Analytics',
          description:
            'This short feature guide explains what each 90-day chart means and, just as importantly, what it does not mean. Analytics is read-only: this guide will not change any records.',
          placement: 'center',
          eyebrow: 'Analytics guide',
        },
        {
          id: 'scope',
          title: 'Start with the reporting window',
          description:
            'This page summarizes the most recent 90 days of registration, relief-distribution, vulnerability, and feedback activity. Use it to identify patterns that deserve closer review.',
          target: TARGETS.header,
          placement: 'bottom',
          padding: 4,
        },
        {
          id: 'summary-metrics',
          title: 'Read the four summary numbers carefully',
          description:
            'Distributions counts recorded relief events. Items Distributed is the total quantity released. Feedback counts submitted messages, while Pending Feedback shows messages that still require administrative attention.',
          target: TARGETS.metrics,
          placement: 'bottom',
          padding: 4,
        },
        {
          id: 'registration-trend',
          title: 'See when registration demand changes',
          description:
            'The registration trend shows how many vulnerable-citizen registrations were recorded on each date. A rise can signal more workload for verification and approval, but the chart alone does not explain why the increase happened.',
          target: TARGETS.registrations,
          placement: 'auto',
          padding: 4,
        },
        {
          id: 'distribution-trend',
          title: 'Separate relief events from item quantity',
          description:
            'This chart shows the number of distribution events by date. One event can contain multiple items, so do not treat the bar height as the quantity of goods released.',
          target: TARGETS.distributions,
          placement: 'auto',
          padding: 4,
        },
        {
          id: 'vulnerability-breakdown',
          title: 'Interpret vulnerability categories correctly',
          description:
            'Each slice represents a recorded vulnerability category. A person may belong to more than one category, so these category totals should not be added together and treated as a count of unique citizens. Always match the legend label to its chart color and value.',
          target: TARGETS.vulnerabilities,
          placement: 'auto',
          padding: 4,
        },
        {
          id: 'distribution-types',
          title: 'Compare the kinds of relief being recorded',
          description:
            'Distribution Types compares recorded relief events by category. It helps show which kinds of assistance are being delivered most often, but it is not an inventory or remaining-stock report.',
          target: TARGETS.distributionTypes,
          placement: 'auto',
          padding: 4,
        },
        {
          id: 'finish',
          title: 'Use Analytics as a signal, then verify the record',
          description:
            'Charts help you notice trends and priorities. Before making a sensitive decision about a citizen, household, worker, or relief record, open the appropriate source record and verify the underlying details.',
          placement: 'center',
          eyebrow: 'Good practice',
        },
      ],
    }),
    [user.id],
  )

  const { start } = useWalkthroughTour(tour)

  useEffect(() => {
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

    const discover = () => {
      const found = markAnalyticsAnchors()
      setAnalyticsOpen(found)
      if (found) stopDiscovery()
      return found
    }

    const beginDiscovery = () => {
      stopDiscovery()
      clearAnalyticsAnchors()
      setAnalyticsOpen(false)

      if (discover()) return

      discoveryIntervalRef.current = window.setInterval(() => {
        discover()
      }, DISCOVERY_INTERVAL_MS)

      discoveryTimeoutRef.current = window.setTimeout(() => {
        stopDiscovery()
      }, DISCOVERY_TIMEOUT_MS)
    }

    const leaveAnalytics = () => {
      stopDiscovery()
      clearAnalyticsAnchors()
      setAnalyticsOpen(false)
    }

    const handleNavigationClick = (event: MouseEvent) => {
      const origin = event.target
      if (!(origin instanceof Element)) return

      const navItem = origin.closest<HTMLElement>('[data-tour^="nav-"]')
      if (!navItem) return

      if (navItem.dataset.tour === 'nav-analytics') {
        window.setTimeout(beginDiscovery, 0)
      } else {
        leaveAnalytics()
      }
    }

    document.addEventListener('click', handleNavigationClick, true)

    // Covers development hot reloads and any future route that restores the
    // Analytics view directly instead of navigating through the sidebar.
    discover()

    return () => {
      document.removeEventListener('click', handleNavigationClick, true)
      stopDiscovery()
      clearAnalyticsAnchors()
    }
  }, [])

  useEffect(() => {
    if (
      !hydrated ||
      !analyticsOpen ||
      !isNewWalkthroughAccount(user.createdAt) ||
      activeTourId
    ) {
      return
    }

    const timer = window.setTimeout(() => {
      startTour(tour.id)
    }, 700)

    return () => window.clearTimeout(timer)
  }, [
    activeTourId,
    analyticsOpen,
    hydrated,
    startTour,
    tour.id,
    user.createdAt,
  ])

  if (!analyticsOpen || activeTourId) return null

  return (
    <Button
      type="button"
      variant="outline"
      onClick={start}
      aria-label="Open Analytics guide"
      className="fixed bottom-24 right-4 z-40 rounded-full border-blue-200 bg-white/95 text-blue-700 shadow-lg backdrop-blur-xl hover:bg-blue-50 sm:right-6"
    >
      <BarChart3 className="h-4 w-4" />
      Analytics guide
    </Button>
  )
}
