'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPinned } from 'lucide-react'

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

const ANCHOR_ATTRIBUTE = 'data-vulnerable-map-tour-anchor'
const FALLBACK_ATTRIBUTES = {
  summary: 'data-vulnerable-map-summary-fallback',
  legend: 'data-vulnerable-map-legend-fallback',
  controls: 'data-vulnerable-map-controls-fallback',
  marker: 'data-vulnerable-map-marker-fallback',
  drawer: 'data-vulnerable-map-drawer-fallback',
  details: 'data-vulnerable-map-details-fallback',
  fullProfile: 'data-vulnerable-map-full-profile-fallback',
} as const

const DISCOVERY_INTERVAL_MS = 150
const DISCOVERY_TIMEOUT_MS = 12_000

const TARGETS = {
  header: '[data-tour="vulnerable-map-header"]',
  workspace: '[data-tour="vulnerable-map-workspace"]',
  summary:
    '[data-tour="vulnerable-map-summary"], [data-vulnerable-map-summary-fallback="true"]',
  legend:
    '[data-tour="vulnerable-map-legend"], [data-vulnerable-map-legend-fallback="true"]',
  controls:
    '[data-tour="vulnerable-map-controls"], [data-vulnerable-map-controls-fallback="true"]',
  marker:
    '[data-tour="vulnerable-map-marker"], [data-vulnerable-map-marker-fallback="true"]',
  drawer:
    '[data-tour="vulnerable-map-drawer"], [data-vulnerable-map-drawer-fallback="true"]',
  details:
    '[data-tour="vulnerable-map-drawer-details"], [data-vulnerable-map-details-fallback="true"]',
  fullProfile:
    '[data-tour="vulnerable-map-full-profile"], [data-vulnerable-map-full-profile-fallback="true"]',
} as const

function normalizedText(value: string | null | undefined) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function isVisible(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number.parseFloat(style.opacity || '1') > 0.01
  )
}

function clearMapAnchors() {
  document
    .querySelectorAll<HTMLElement>(`[${ANCHOR_ATTRIBUTE}="true"]`)
    .forEach((element) => {
      element.removeAttribute('data-tour')
      element.removeAttribute(ANCHOR_ATTRIBUTE)
    })

  Object.values(FALLBACK_ATTRIBUTES).forEach((attribute) => {
    document
      .querySelectorAll<HTMLElement>(`[${attribute}="true"]`)
      .forEach((element) => element.removeAttribute(attribute))
  })
}

function setAnchor(element: HTMLElement | null, name: string) {
  if (!element) return
  element.setAttribute('data-tour', name)
  element.setAttribute(ANCHOR_ATTRIBUTE, 'true')
}

function setFallback(element: HTMLElement | null, attribute: string) {
  element?.setAttribute(attribute, 'true')
}

function findVisibleExact<T extends HTMLElement>(
  root: ParentNode,
  selector: string,
  text: string,
) {
  return (
    Array.from(root.querySelectorAll<T>(selector)).find(
      (element) =>
        isVisible(element) && normalizedText(element.textContent) === text,
    ) ?? null
  )
}

function findVisibleButton(root: ParentNode, text: string) {
  return (
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) =>
        isVisible(button) && normalizedText(button.textContent) === text,
    ) ?? null
  )
}

function ancestorContaining(
  start: HTMLElement | null,
  requiredText: string[],
  stopAfter = 8,
) {
  let candidate = start
  let depth = 0

  while (candidate && depth <= stopAfter) {
    const text = normalizedText(candidate.textContent)
    if (requiredText.every((value) => text.includes(value))) return candidate
    candidate = candidate.parentElement
    depth += 1
  }

  return null
}

function nextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve())
    })
  })
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(() => resolve(), milliseconds)
  })
}

function findMapHeading() {
  return findVisibleExact<HTMLHeadingElement>(
    document,
    'h1',
    'Vulnerable Citizens Map',
  )
}

function isMapVisible() {
  return Boolean(findMapHeading())
}

function getFeatureRoot() {
  const heading = findMapHeading()
  if (!heading) return null

  const headingBlock = ancestorContaining(heading, [
    'Vulnerable Citizens Map',
    'Geospatial view of approved vulnerable individuals.',
  ])

  if (!headingBlock) return null

  return {
    headingBlock,
    root:
      headingBlock.parentElement instanceof HTMLElement
        ? headingBlock.parentElement
        : headingBlock,
  }
}

function findMapWorkspace(root: ParentNode) {
  return (
    Array.from(root.querySelectorAll<HTMLElement>('section')).find((section) => {
      if (!isVisible(section)) return false
      const text = normalizedText(section.textContent)
      return (
        text.includes('San Policarpo Map View') &&
        text.includes('Vulnerable Citizen Locations')
      )
    }) ?? null
  )
}

function findOpenDrawer(workspace: HTMLElement) {
  return (
    Array.from(workspace.querySelectorAll<HTMLElement>('aside')).find(
      (aside) =>
        isVisible(aside) &&
        aside.getAttribute('aria-hidden') === 'false' &&
        normalizedText(aside.textContent).includes('Registered Citizen'),
    ) ?? null
  )
}

function markMapAnchors() {
  clearMapAnchors()

  const feature = getFeatureRoot()
  if (!feature) return false

  const loading = Array.from(
    feature.root.querySelectorAll<HTMLElement>('p, span, div'),
  ).some((element) => {
    if (!isVisible(element)) return false
    const text = normalizedText(element.textContent)
    return (
      text === 'Loading map data' ||
      text === 'Plotting approved vulnerable citizen locations...'
    )
  })

  const workspace = findMapWorkspace(feature.root)
  if (loading || !workspace) return false

  const summaryLabel = findVisibleExact<HTMLElement>(
    workspace,
    'p',
    'San Policarpo Map View',
  )
  const summary = summaryLabel
    ? ancestorContaining(
        summaryLabel,
        ['Vulnerable Citizen Locations', 'Showing'],
        3,
      )
    : null

  const legendLabel = findVisibleExact<HTMLElement>(workspace, 'p', 'Marker Legend')
  const legend = legendLabel
    ? ancestorContaining(
        legendLabel,
        ['Needs assistance', 'No relief yet', 'Relief received'],
        3,
      )
    : null

  const controls =
    Array.from(
      workspace.querySelectorAll<HTMLElement>('.maplibregl-ctrl-group'),
    ).find(isVisible) ?? null

  const marker =
    Array.from(
      workspace.querySelectorAll<HTMLButtonElement>('.crms-maplibre-marker'),
    ).find(isVisible) ?? null

  const emptyLabel = findVisibleExact<HTMLElement>(
    workspace,
    'p',
    'No recorded map locations',
  )
  const emptyState = emptyLabel
    ? ancestorContaining(emptyLabel, ['The map only displays valid locations'], 4)
    : null

  const markerTarget = marker ?? emptyState
  if (!markerTarget) return false

  const drawer = findOpenDrawer(workspace)
  const details = drawer
    ? Array.from(drawer.querySelectorAll<HTMLElement>('div')).find(
        (element) =>
          isVisible(element) &&
          element.classList.contains('overflow-y-auto') &&
          normalizedText(element.textContent).includes('Location Details') &&
          normalizedText(element.textContent).includes('Relief History'),
      ) ?? drawer
    : null
  const fullProfile = drawer
    ? findVisibleButton(drawer, 'View full profile')
    : null

  setAnchor(feature.headingBlock, 'vulnerable-map-header')
  setAnchor(workspace, 'vulnerable-map-workspace')

  if (summary) setAnchor(summary, 'vulnerable-map-summary')
  else setFallback(workspace, FALLBACK_ATTRIBUTES.summary)

  if (legend) setAnchor(legend, 'vulnerable-map-legend')
  else setFallback(summary ?? workspace, FALLBACK_ATTRIBUTES.legend)

  if (controls) setAnchor(controls, 'vulnerable-map-controls')
  else setFallback(workspace, FALLBACK_ATTRIBUTES.controls)

  setAnchor(markerTarget, 'vulnerable-map-marker')

  if (drawer) setAnchor(drawer, 'vulnerable-map-drawer')
  else setFallback(markerTarget, FALLBACK_ATTRIBUTES.drawer)

  if (details) setAnchor(details, 'vulnerable-map-drawer-details')
  else setFallback(drawer ?? markerTarget, FALLBACK_ATTRIBUTES.details)

  if (fullProfile) setAnchor(fullProfile, 'vulnerable-map-full-profile')
  else setFallback(drawer ?? markerTarget, FALLBACK_ATTRIBUTES.fullProfile)

  return true
}

async function openFirstMarker() {
  if (!isMapVisible()) return

  const feature = getFeatureRoot()
  if (!feature) return
  const workspace = findMapWorkspace(feature.root)
  if (!workspace) return

  if (!findOpenDrawer(workspace)) {
    const marker = Array.from(
      workspace.querySelectorAll<HTMLButtonElement>('.crms-maplibre-marker'),
    ).find(isVisible)

    marker?.click()
    await nextPaint()
    await delay(540)
  }

  markMapAnchors()
}

async function showFullProfileAction() {
  await openFirstMarker()

  const feature = getFeatureRoot()
  if (!feature) return
  const workspace = findMapWorkspace(feature.root)
  if (!workspace) return

  const drawer = findOpenDrawer(workspace)
  const button = drawer ? findVisibleButton(drawer, 'View full profile') : null

  button?.scrollIntoView({ behavior: 'auto', block: 'nearest' })
  await nextPaint()
  await delay(120)
  markMapAnchors()
}

async function closeMapDrawer() {
  const feature = getFeatureRoot()
  if (!feature) return
  const workspace = findMapWorkspace(feature.root)
  if (!workspace) return

  const closeButton = Array.from(
    workspace.querySelectorAll<HTMLButtonElement>(
      'button[aria-label="Close profile panel"]',
    ),
  ).find(isVisible)

  if (closeButton) {
    closeButton.click()
    await nextPaint()
    await delay(460)
  }

  markMapAnchors()
}

export function VulnerableMapWalkthrough({ user }: { user: AuthUser }) {
  const [featureOpen, setFeatureOpen] = useState(false)
  const featureOpenRef = useRef(false)
  const activeTourIdRef = useRef<string | null>(null)
  const wasMapTourActiveRef = useRef(false)
  const discoveryIntervalRef = useRef<number | null>(null)
  const discoveryTimeoutRef = useRef<number | null>(null)

  const { hydrated, activeTourId, startTour, closeTour } = useWalkthrough()

  const tour = useMemo<WalkthroughTour>(
    () => ({
      id: userScopedTourId('admin-vulnerable-map-first-use', user.id),
      version: 1,
      title: 'Vulnerable Map guide',
      role: 'ADMIN',
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to the Vulnerable Citizens Map',
          description:
            'This operational map helps authorized staff understand where approved vulnerable citizens are recorded. The guide will not move a marker, change a profile, or open the full sensitive record automatically.',
          placement: 'center',
          eyebrow: 'Vulnerable Map guide',
        },
        {
          id: 'purpose',
          title: 'Use the map for planning—not public display',
          description:
            'The live map contains names, contact information, addresses, exact coordinates, vulnerability information, and relief status. Access is restricted to Administrators and Field Workers. Do not copy, photograph, or share this screen unless the information is required for authorized municipal work.',
          target: TARGETS.header,
          placement: 'bottom',
          padding: 4,
        },
        {
          id: 'workspace',
          title: 'Only approved profiles with usable local coordinates appear',
          description:
            'The map loads Approved vulnerable profiles that have latitude and longitude values. It then displays only valid points inside the configured San Policarpo boundary. A missing marker can mean missing, invalid, or out-of-bound coordinates; it does not prove that the person is not registered or not vulnerable.',
          target: TARGETS.workspace,
          placement: 'auto',
          padding: 4,
        },
        {
          id: 'summary',
          title: 'The location count is a map count, not the total registry',
          description:
            'Showing recorded locations counts only the valid points currently visible to this map. Do not treat it as the total number of vulnerable citizens in the municipality, because approved records without usable local coordinates are excluded.',
          target: TARGETS.summary,
          placement: 'bottom',
          padding: 3,
        },
        {
          id: 'legend',
          title: 'Read marker colors in the correct order',
          description:
            'Red means Needs assistance and takes priority even when a relief record also exists. Amber means no active Needs Assistance flag and no recorded relief distribution. Green means no active Needs Assistance flag and at least one relief distribution exists. These colors summarize database fields; they are not a final needs assessment.',
          target: TARGETS.legend,
          placement: 'left',
          padding: 3,
        },
        {
          id: 'navigation',
          title: 'Pan and zoom without changing the saved location',
          description:
            'Drag the map to look around and use the plus/minus controls to zoom. The view is constrained to the San Policarpo area. These controls only change what you see on screen—they do not edit a citizen’s saved coordinates.',
          target: TARGETS.controls,
          placement: 'left',
          padding: 3,
        },
        {
          id: 'marker',
          title: 'Select a marker to inspect its summary',
          description:
            'Clicking a marker selects that citizen and opens a profile drawer. Selection is read-only and does not update the record. If the map has no valid locations, this step stays on the empty-state message instead.',
          target: TARGETS.marker,
          placement: 'auto',
          padding: 4,
        },
        {
          id: 'drawer',
          title: 'The drawer shows sensitive identity and location details',
          description:
            'The guide opens the first available marker for demonstration. The drawer can show the citizen’s name, barangay, mobile number, age, address, and exact coordinates. Missing contact information now appears as Not recorded—never assume a displayed phone number belongs to the citizen without verifying it.',
          target: TARGETS.drawer,
          placement: 'left',
          padding: 4,
          beforeEnter: openFirstMarker,
        },
        {
          id: 'details',
          title: 'Needs and relief history require human verification',
          description:
            'The drawer also summarizes specific needs, vulnerability categories, and the latest known distribution date. Relief received only means at least one distribution record exists; it does not prove the assistance was recent, sufficient, appropriate, or received by every household member.',
          target: TARGETS.details,
          placement: 'left',
          padding: 3,
          beforeEnter: openFirstMarker,
        },
        {
          id: 'full-profile',
          title: 'Open the full profile only when the task requires it',
          description:
            'View full profile opens the complete registered record, including personal, contact, location, vulnerability, medical, and emergency-contact information. The walkthrough brings this action into view but will not press it. Close the record as soon as the authorized task is complete.',
          target: TARGETS.fullProfile,
          placement: 'top',
          padding: 3,
          beforeEnter: showFullProfileAction,
        },
        {
          id: 'decision-support',
          title: 'A marker is a planning signal, not proof by itself',
          description:
            'Before assigning assistance, contacting a household, or reporting a location, confirm the underlying profile and recent field information. Coordinates can be entered incorrectly, households can move, needs can change, and an old distribution record can make the map look more current than it is.',
          target: TARGETS.workspace,
          placement: 'auto',
          padding: 4,
          beforeEnter: closeMapDrawer,
        },
        {
          id: 'finish',
          title: 'Protect location data and verify before acting',
          description:
            'Final check: Am I using this information for an authorized purpose? Is the selected person and location correct? Is the status current enough for the decision? Have I avoided exposing names, contact details, medical information, and household coordinates to anyone who does not need them?',
          placement: 'center',
          eyebrow: 'Good map practice',
        },
      ],
    }),
    [user.id],
  )

  const { start } = useWalkthroughTour(tour)

  useEffect(() => {
    activeTourIdRef.current = activeTourId

    const isMapTourActive = activeTourId === tour.id
    if (wasMapTourActiveRef.current && !isMapTourActive) {
      void closeMapDrawer()
    }
    wasMapTourActiveRef.current = isMapTourActive
  }, [activeTourId, tour.id])

  useEffect(() => {
    const setFeatureState = (open: boolean) => {
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

    const discover = () => {
      const found = markMapAnchors()
      setFeatureState(found)
      if (found) stopDiscovery()
      return found
    }

    const beginDiscovery = () => {
      stopDiscovery()
      clearMapAnchors()
      setFeatureState(false)

      if (discover()) return

      discoveryIntervalRef.current = window.setInterval(
        discover,
        DISCOVERY_INTERVAL_MS,
      )
      discoveryTimeoutRef.current = window.setTimeout(
        stopDiscovery,
        DISCOVERY_TIMEOUT_MS,
      )
    }

    const leaveFeature = () => {
      stopDiscovery()
      clearMapAnchors()
      setFeatureState(false)
      void closeMapDrawer()

      if (activeTourIdRef.current === tour.id) closeTour()
    }

    const handleNavigationClick = (event: MouseEvent) => {
      const origin = event.target
      if (!(origin instanceof Element)) return

      const navItem = origin.closest<HTMLElement>('[data-tour^="nav-"]')
      if (!navItem) return

      if (navItem.dataset.tour === 'nav-map') {
        window.setTimeout(beginDiscovery, 0)
      } else {
        leaveFeature()
      }
    }

    const viewObserver = new MutationObserver(() => {
      if (featureOpenRef.current && !isMapVisible()) leaveFeature()
    })

    document.addEventListener('click', handleNavigationClick, true)
    viewObserver.observe(document.body, { childList: true, subtree: true })
    discover()

    return () => {
      document.removeEventListener('click', handleNavigationClick, true)
      viewObserver.disconnect()
      stopDiscovery()
      clearMapAnchors()
    }
  }, [closeTour, tour.id])

  useEffect(() => {
    if (
      !hydrated ||
      !featureOpen ||
      !isNewWalkthroughAccount(user.createdAt) ||
      activeTourId
    ) {
      return
    }

    const timer = window.setTimeout(() => {
      if (!markMapAnchors() || !isMapVisible()) {
        featureOpenRef.current = false
        setFeatureOpen(false)
        return
      }

      startTour(tour.id)
    }, 700)

    return () => window.clearTimeout(timer)
  }, [
    activeTourId,
    featureOpen,
    hydrated,
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
        if (!markMapAnchors() || !isMapVisible()) {
          featureOpenRef.current = false
          setFeatureOpen(false)
          return
        }
        start()
      }}
      aria-label="Open Vulnerable Map guide"
      className="fixed bottom-24 right-4 z-40 rounded-full border-emerald-200 bg-white/95 text-emerald-700 shadow-lg backdrop-blur-xl hover:bg-emerald-50 sm:right-6"
    >
      <MapPinned className="h-4 w-4" />
      Vulnerable Map guide
    </Button>
  )
}
