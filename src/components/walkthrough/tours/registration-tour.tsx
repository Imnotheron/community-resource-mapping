'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { UserCheck } from 'lucide-react'

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

const ANCHOR_ATTRIBUTE = 'data-registration-tour-anchor'
const DISCOVERY_INTERVAL_MS = 150
const DISCOVERY_TIMEOUT_MS = 12_000

const TARGETS = {
  header: '[data-tour="registration-feature-header"]',
  registerButton: '[data-tour="registration-register-person"]',
  statusFilter: '[data-tour="registration-status-filter"]',
  records: '[data-tour="registration-records"]',
  recordDetails: '[data-tour="registration-record-details"]',
  vulnerabilities: '[data-tour="registration-vulnerabilities"]',
  actions: '[data-tour="registration-decision-actions"]',
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

function clearRegistrationAnchors() {
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

function lowestCommonAncestor(elements: HTMLElement[]) {
  if (elements.length === 0) return null

  let candidate: HTMLElement | null = elements[0]

  while (candidate) {
    if (elements.every((element) => candidate?.contains(element))) {
      return candidate
    }
    candidate = candidate.parentElement
  }

  return null
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
    if (requiredText.every((value) => text.includes(value))) {
      return candidate
    }
    candidate = candidate.parentElement
    depth += 1
  }

  return null
}

function findRegistrationHeading() {
  return (
    Array.from(document.querySelectorAll<HTMLHeadingElement>('h1')).find(
      (heading) =>
        isVisible(heading) &&
        normalizedText(heading.textContent) === 'Vulnerable Registrations',
    ) ?? null
  )
}

/**
 * Registrations lives inside the large Admin dashboard component. This adapter
 * finds the visible Registration screen and temporarily adds stable tour
 * anchors to the real controls. It never clicks Approve, Reject, or Register.
 */
function markRegistrationAnchors() {
  clearRegistrationAnchors()

  const heading = findRegistrationHeading()
  if (!heading) return false

  // Current structure: root > header row > title group > h1.
  const titleGroup = heading.parentElement
  const header = titleGroup?.parentElement
  const featureRoot = header?.parentElement

  if (
    !(header instanceof HTMLElement) ||
    !(featureRoot instanceof HTMLElement)
  ) {
    return false
  }

  const featureText = normalizedText(featureRoot.textContent)
  if (
    !featureText.includes('Register Vulnerable Person') ||
    !featureText.includes('Review, approve, and register vulnerable citizen profiles.')
  ) {
    return false
  }

  const registerButton = findVisibleExact<HTMLButtonElement>(
    featureRoot,
    'button',
    'Register Vulnerable Person',
  )

  const statusFilter = Array.from(
    header.querySelectorAll<HTMLElement>('button[role="combobox"]'),
  ).find(isVisible) ?? null

  // The second direct child is always the visible content state: loader,
  // empty-state card, or the list of registration cards.
  const records =
    Array.from(featureRoot.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    )[1] ?? null

  if (
    !(registerButton instanceof HTMLElement) ||
    !(statusFilter instanceof HTMLElement) ||
    !(records instanceof HTMLElement)
  ) {
    clearRegistrationAnchors()
    return false
  }

  // Do not lock the tour onto the temporary loader. Discovery keeps polling
  // until the API resolves to either real records or the real empty state.
  const recordsText = normalizedText(records.textContent)
  if (
    recordsText.includes('Loading records') ||
    recordsText.includes('Fetching the latest approval queue')
  ) {
    clearRegistrationAnchors()
    return false
  }

  const firstNameHeading = Array.from(
    records.querySelectorAll<HTMLHeadingElement>('h3'),
  ).find(isVisible) ?? null

  const firstRecord = firstNameHeading
    ? ancestorContaining(firstNameHeading, ['Email:', 'Mobile:', 'Barangay:'])
    : null

  const vulnerabilityLabel = firstRecord
    ? Array.from(firstRecord.querySelectorAll<HTMLElement>('span')).find(
        (element) =>
          isVisible(element) &&
          normalizedText(element.textContent) === 'Vulnerabilities:',
      ) ?? null
    : null

  const vulnerabilityArea = vulnerabilityLabel?.parentElement ?? firstRecord ?? records

  const approveButton = findVisibleExact<HTMLButtonElement>(
    records,
    'button',
    'Approve',
  )
  const rejectButton = findVisibleExact<HTMLButtonElement>(
    records,
    'button',
    'Reject',
  )

  const actionArea =
    approveButton && rejectButton
      ? lowestCommonAncestor([approveButton, rejectButton])
      : firstRecord ?? records

  setAnchor(header, 'registration-feature-header')
  setAnchor(registerButton, 'registration-register-person')
  setAnchor(statusFilter, 'registration-status-filter')
  setAnchor(records, 'registration-records')
  setAnchor(firstRecord ?? records, 'registration-record-details')
  setAnchor(vulnerabilityArea, 'registration-vulnerabilities')
  setAnchor(actionArea, 'registration-decision-actions')

  return true
}

export function RegistrationWalkthrough({ user }: { user: AuthUser }) {
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const discoveryIntervalRef = useRef<number | null>(null)
  const discoveryTimeoutRef = useRef<number | null>(null)

  const { hydrated, activeTourId, startTour } = useWalkthrough()

  const tour = useMemo<WalkthroughTour>(
    () => ({
      id: userScopedTourId('admin-registration-first-use', user.id),
      version: 1,
      title: 'Registrations guide',
      role: 'ADMIN',
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to Registrations',
          description:
            'This page is where you review vulnerable-citizen registrations. The guide will explain what to check before you approve or reject anyone. It will not press any decision button for you.',
          placement: 'center',
          eyebrow: 'Registrations guide',
        },
        {
          id: 'purpose',
          title: 'Start here: know what this page is for',
          description:
            'Use this page to review citizen profiles that were submitted to CRMS. A Pending registration is still waiting for an Administrator decision. Approved and Rejected records are already decided.',
          target: TARGETS.header,
          placement: 'bottom',
          padding: 3,
        },
        {
          id: 'status-filter',
          title: 'Choose which registrations you want to see',
          description:
            'Use this status filter to switch between Pending, Approved, Rejected, or All. When you are reviewing new applications, start with Pending so you only see people who still need a decision.',
          target: TARGETS.statusFilter,
          placement: 'left',
          padding: 2,
        },
        {
          id: 'record-list',
          title: 'Each card is one person’s registration',
          description:
            'The list changes when you change the status filter. If you see “No registrations,” there is simply nothing in that status right now—you do not need to fix anything.',
          target: TARGETS.records,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'record-details',
          title: 'Check the person’s details before deciding',
          description:
            'Make sure the name, email, mobile number, barangay, gender, date of birth, submitted date, and status belong to the person you intend to review. If something looks wrong or incomplete, do not approve just because the record says Pending.',
          target: TARGETS.recordDetails,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'vulnerabilities',
          title: 'Read the vulnerability information carefully',
          description:
            'These tags describe the vulnerability information recorded for the citizen. A person can have more than one tag. Use the tags as part of your review, not as the only reason to approve or reject the registration.',
          target: TARGETS.vulnerabilities,
          placement: 'auto',
          padding: 2,
        },
        {
          id: 'approve',
          title: 'Approve only when you are satisfied with the record',
          description:
            'Approve changes a Pending registration to Approved. The citizen can then use the approved account, and the system may send an approval email. Check that you have the correct person before you press Approve.',
          target: TARGETS.actions,
          placement: 'auto',
          padding: 2,
        },
        {
          id: 'reject',
          title: 'If you reject, explain the reason clearly',
          description:
            'Reject opens a box where you must write a reason. The citizen can see that reason, so keep it simple, factual, and respectful—for example, “Please provide the missing proof of residence.” Do not include private details that are not needed.',
          target: TARGETS.actions,
          placement: 'auto',
          padding: 2,
        },
        {
          id: 'register-person',
          title: 'Use this button when the Admin is creating the record',
          description:
            'Register Vulnerable Person opens the Admin registration form. This is different from reviewing a submitted application: an Admin-created profile is created as Approved and a temporary password is generated for the citizen. Double-check the information before you submit the form.',
          target: TARGETS.registerButton,
          placement: 'left',
          padding: 2,
        },
        {
          id: 'privacy',
          title: 'Protect the citizen’s personal information',
          description:
            'This page contains contact details, date of birth, location, and vulnerability information. Only use or share those details when they are needed for authorized CRMS work. Avoid unnecessary screenshots or copying personal data into messages.',
          target: TARGETS.recordDetails,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'finish',
          title: 'A simple check before every decision',
          description:
            'Before you finish, ask: Is this the correct person? Do the contact and barangay details make sense? Is the vulnerability information clear? Do I have enough information for this decision? If rejecting, is my reason clear enough for the citizen to understand what happened?',
          placement: 'center',
          eyebrow: 'Ready to review',
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
      const found = markRegistrationAnchors()
      setRegistrationOpen(found)
      if (found) stopDiscovery()
      return found
    }

    const beginDiscovery = () => {
      stopDiscovery()
      clearRegistrationAnchors()
      setRegistrationOpen(false)

      if (discover()) return

      discoveryIntervalRef.current = window.setInterval(() => {
        discover()
      }, DISCOVERY_INTERVAL_MS)

      discoveryTimeoutRef.current = window.setTimeout(() => {
        stopDiscovery()
      }, DISCOVERY_TIMEOUT_MS)
    }

    const leaveRegistrations = () => {
      stopDiscovery()
      clearRegistrationAnchors()
      setRegistrationOpen(false)
    }

    const handleNavigationClick = (event: MouseEvent) => {
      const origin = event.target
      if (!(origin instanceof Element)) return

      const navItem = origin.closest<HTMLElement>('[data-tour^="nav-"]')
      if (!navItem) return

      if (navItem.dataset.tour === 'nav-registrations') {
        window.setTimeout(beginDiscovery, 0)
      } else {
        leaveRegistrations()
      }
    }

    document.addEventListener('click', handleNavigationClick, true)

    // Covers hot reloads and any future direct restoration of this dashboard
    // view without a sidebar click.
    discover()

    return () => {
      document.removeEventListener('click', handleNavigationClick, true)
      stopDiscovery()
      clearRegistrationAnchors()
    }
  }, [])

  useEffect(() => {
    if (
      !hydrated ||
      !registrationOpen ||
      !isNewWalkthroughAccount(user.createdAt) ||
      activeTourId
    ) {
      return
    }

    const timer = window.setTimeout(() => {
      // Refresh once more immediately before auto-starting so the guide always
      // points at the current record/filter state.
      if (markRegistrationAnchors()) {
        startTour(tour.id)
      }
    }, 700)

    return () => window.clearTimeout(timer)
  }, [
    activeTourId,
    hydrated,
    registrationOpen,
    startTour,
    tour.id,
    user.createdAt,
  ])

  if (!registrationOpen || activeTourId) return null

  const startCurrentRegistrationGuide = () => {
    if (markRegistrationAnchors()) {
      start()
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={startCurrentRegistrationGuide}
      aria-label="Open Registrations guide"
      className="fixed bottom-24 right-4 z-40 rounded-full border-blue-200 bg-white/95 text-blue-700 shadow-lg backdrop-blur-xl hover:bg-blue-50 sm:right-6"
    >
      <UserCheck className="h-4 w-4" />
      Registrations guide
    </Button>
  )
}
