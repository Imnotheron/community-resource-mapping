'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { PackageCheck } from 'lucide-react'

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

const ANCHOR_ATTRIBUTE = 'data-relief-approval-tour-anchor'
const DISCOVERY_INTERVAL_MS = 150
const DISCOVERY_TIMEOUT_MS = 12_000

const TARGETS = {
  header: '[data-tour="relief-approval-header"]',
  filter: '[data-tour="relief-approval-filter"]',
  record: '[data-tour="relief-approval-record"]',
  actions: '[data-tour="relief-approval-actions"]',
  view: '[data-tour="relief-approval-view"]',
  bulk: '[data-tour="relief-approval-bulk"]',
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

function clearReliefApprovalAnchors() {
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

function findVisibleExact<T extends HTMLElement>(selector: string, text: string) {
  return (
    Array.from(document.querySelectorAll<T>(selector)).find(
      (element) =>
        isVisible(element) && normalizedText(element.textContent) === text,
    ) ?? null
  )
}

function findVisibleStartingWith<T extends HTMLElement>(
  root: ParentNode,
  selector: string,
  text: string,
) {
  return (
    Array.from(root.querySelectorAll<T>(selector)).find(
      (element) =>
        isVisible(element) && normalizedText(element.textContent).startsWith(text),
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
    if (requiredText.every((value) => text.includes(value))) {
      return candidate
    }
    candidate = candidate.parentElement
    depth += 1
  }

  return null
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

function isReliefApprovalVisible() {
  return Boolean(
    findVisibleExact<HTMLHeadingElement>('h1', 'Relief Distribution Approval'),
  )
}

/**
 * Relief Approval lives inside the Admin dashboard rather than on a dedicated
 * route. This adapter attaches temporary walkthrough anchors to the rendered
 * feature without changing the distribution workflow or clicking any action.
 */
function markReliefApprovalAnchors() {
  clearReliefApprovalAnchors()

  const heading = findVisibleExact<HTMLHeadingElement>(
    'h1',
    'Relief Distribution Approval',
  )
  if (!heading) return false

  // Use the current section structure, not legacy text or labels:
  // cards now lead with the beneficiary name, not "Beneficiary:".
  const header = ancestorContaining(
    heading,
    ['Relief Distribution Approval', 'Review relief distributions by beneficiary'],
    3,
  )
  const featureRoot = header?.parentElement
  if (!(header instanceof HTMLElement) || !(featureRoot instanceof HTMLElement)) return false

  const filter = Array.from(
    header.querySelectorAll<HTMLElement>('[role="combobox"]'),
  ).find(isVisible) ?? null

  const firstHeading = Array.from(
    featureRoot.querySelectorAll<HTMLHeadingElement>('[data-slot="card"] h3'),
  ).find(isVisible) ?? null
  const firstRecord = firstHeading?.closest<HTMLElement>('[data-slot="card"]') ?? null

  const emptyText = Array.from(
    featureRoot.querySelectorAll<HTMLElement>('p'),
  ).find(
    (element) =>
      isVisible(element) &&
      normalizedText(element.textContent) === 'No distributions match the current filters.',
  ) ?? null
  const emptyState = emptyText?.closest<HTMLElement>('[data-slot="card"]') ?? emptyText
  const record = firstRecord ?? emptyState

  // Do not attach to the "Loading records" placeholder.
  if (!filter || !record) return false

  const buttons = firstRecord
    ? Array.from(firstRecord.querySelectorAll<HTMLButtonElement>('button')).filter(isVisible)
    : []
  const view = buttons.find((button) => normalizedText(button.textContent) === 'View')
  const approve = buttons.find((button) => normalizedText(button.textContent) === 'Approve')
  const reject = buttons.find((button) => normalizedText(button.textContent) === 'Reject')
  const actions = approve && reject
    ? lowestCommonAncestor([approve, reject])
    : view?.parentElement ?? null
  const bulk = Array.from(
    header.querySelectorAll<HTMLButtonElement>('button'),
  ).find((button) =>
    isVisible(button) &&
    /^(Approve All|Reject All|Approve Selected|Reject Selected)$/i.test(
      normalizedText(button.textContent),
    ),
  ) ?? null

  setAnchor(header, 'relief-approval-header')
  setAnchor(filter, 'relief-approval-filter')
  setAnchor(record, 'relief-approval-record')
  // View and decisions only exist for matching records; absent targets
  // display a safe centered explanation rather than highlighting wrong controls.
  if (view) setAnchor(view, 'relief-approval-view')
  if (actions) setAnchor(actions, 'relief-approval-actions')
  if (bulk) setAnchor(bulk, 'relief-approval-bulk')

  return true
}

export function ReliefApprovalWalkthrough({ user }: { user: AuthUser }) {
  const [featureOpen, setFeatureOpen] = useState(false)
  const featureOpenRef = useRef(false)
  const activeTourIdRef = useRef<string | null>(null)
  const discoveryIntervalRef = useRef<number | null>(null)
  const discoveryTimeoutRef = useRef<number | null>(null)

  const { hydrated, activeTourId, startTour, closeTour } = useWalkthrough()

  const tour = useMemo<WalkthroughTour>(
    () => ({
      id: userScopedTourId('admin-relief-approval-first-use', user.id),
      version: 2,
      title: 'Relief Approval guide',
      role: 'ADMIN',
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to Relief Approval',
          description:
            'This page is for reviewing relief-distribution records submitted by field workers. The walkthrough explains what to check before a decision, but it will never press Approve or Reject for you.',
          placement: 'center',
          eyebrow: 'Relief Approval guide',
        },
        {
          id: 'purpose',
          title: 'You are reviewing a recorded distribution',
          description:
            'A field worker has already recorded that relief was distributed. Approving here confirms that distribution record as accepted. It does not create a new relief request and it should not be used simply because you believe a person deserves assistance.',
          target: TARGETS.header,
          placement: 'bottom',
          padding: 4,
        },
        {
          id: 'status-filter',
          title: 'Start with Pending, then use the other statuses for history',
          description:
            'Filter by status, general or specific relief type, barangay, general or specific vulnerability, worker, and beneficiary search. Sort by newest, oldest, name, or other fields. Available choices reflect matching records; filters do not approve or reject anything.',
          target: TARGETS.filter,
          placement: 'left',
          padding: 3,
        },
        {
          id: 'record-basics',
          title: 'Read the relief type and items first',
          description:
            'Each card now starts with the beneficiary name and current status, then shows the general and specific relief types, items, vulnerability, barangay, worker, quantity, evidence count, and date. Make sure the description is understandable and matches the kind of relief that was actually given. If the current filter is empty, the page simply tells you there are no matching distributions.',
          target: TARGETS.record,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'record-details',
          title: 'Check who received it, who recorded it, how much, and when',
          description:
            'The card heading identifies the beneficiary (or household when unlinked). General and specific vulnerability show the recorded classifications. Worker identifies who recorded the distribution. Quantity is the recorded amount, and Date is the distribution date. Check that these details make sense together before deciding.',
          target: TARGETS.record,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'notes',
          title: 'Use notes as context, not as the only proof',
          description:
            'A worker may include notes explaining the distribution. Rejected records can also show a rejection reason. Read that information carefully, but if something important is unclear, verify the underlying record instead of guessing.',
          target: TARGETS.record,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'view-evidence',
          title: 'Open View and check the supporting photos',
          description:
            'View opens a detailed read-only review of the beneficiary, barangay, general and specific vulnerabilities, relief type, goods, quantity, worker, date, and submitted photos. New field records require photo evidence; legacy records can have none. The guide never opens the dialog for you.',
          target: TARGETS.view,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'bulk-actions',
          title: 'Select the right pending records before a bulk decision',
          description:
            'Each pending card has a selection checkbox. You can approve or reject selected pending records, or use Approve All / Reject All for the pending records in the current filtered results. Check the filters and each beneficiary first: bulk actions can affect more than one person.',
          target: TARGETS.bulk,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'approve',
          title: 'Approve only when the recorded distribution is correct',
          description:
            'For a Pending record, Approve changes its status to Approved. If the distribution is linked to a vulnerable user, the system can notify that user that the relief record was approved. Review the beneficiary, items, quantity, worker, date, and notes before confirming. If there are no Pending records, no Approve button is shown.',
          target: TARGETS.actions,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'reject',
          title: 'If you reject, explain the problem clearly',
          description:
            'Reject changes a Pending record to Rejected. Provide a short factual rejection reason when the action asks for one; it is better practice because it explains what needs attention and may be included in a notification to the affected user. Avoid unnecessary private information.',
          target: TARGETS.actions,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'finish',
          title: 'A simple check before every decision',
          description:
            'Ask: Is this the correct beneficiary or household? Do the items and quantity match the record? Is the worker and date reasonable? Do the notes explain anything unusual? If you cannot answer confidently, verify first instead of approving or rejecting by assumption.',
          placement: 'center',
          eyebrow: 'Good relief-review practice',
        },
      ],
    }),
    [user.id],
  )

  const { start } = useWalkthroughTour(tour)

  useEffect(() => {
    activeTourIdRef.current = activeTourId
  }, [activeTourId])

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
      const found = markReliefApprovalAnchors()
      setFeatureState(found)
      if (found) stopDiscovery()
      return found
    }

    const beginDiscovery = () => {
      stopDiscovery()
      clearReliefApprovalAnchors()
      setFeatureState(false)

      if (discover()) return

      discoveryIntervalRef.current = window.setInterval(() => {
        discover()
      }, DISCOVERY_INTERVAL_MS)

      discoveryTimeoutRef.current = window.setTimeout(() => {
        stopDiscovery()
      }, DISCOVERY_TIMEOUT_MS)
    }

    const leaveFeature = () => {
      stopDiscovery()
      clearReliefApprovalAnchors()
      setFeatureState(false)

      if (activeTourIdRef.current === tour.id) {
        closeTour()
      }
    }

    const handleNavigationClick = (event: MouseEvent) => {
      const origin = event.target
      if (!(origin instanceof Element)) return

      const navItem = origin.closest<HTMLElement>('[data-tour^="nav-"], [data-tour^="mobile-nav-"]')
      if (!navItem) return

      if ((navItem.dataset.tour === 'nav-distributions' || navItem.dataset.tour === 'mobile-nav-distributions')) {
        window.setTimeout(beginDiscovery, 0)
      } else {
        leaveFeature()
      }
    }

    // The status select can replace the rendered record list. Re-discover after
    // a filter choice so manual restarts always point at the current UI state.
    const handleFeatureClick = (event: MouseEvent) => {
      const origin = event.target
      if (!(origin instanceof Element)) return
      if (!featureOpenRef.current) return

      const option = origin.closest('[role="option"]')
      if (option) {
        window.setTimeout(beginDiscovery, 50)
      }
    }

    // If the dashboard view changes without a sidebar click, immediately clear
    // the Relief guide as soon as its real heading leaves the DOM. This also
    // prevents the floating guide button from surviving into Users or another
    // Admin feature during a React render transition.
    const viewObserver = new MutationObserver(() => {
      if (featureOpenRef.current && !isReliefApprovalVisible()) {
        leaveFeature()
      }
    })

    document.addEventListener('click', handleNavigationClick, true)
    document.addEventListener('click', handleFeatureClick, true)
    viewObserver.observe(document.body, { childList: true, subtree: true })

    // Covers hot reload and any future entry path that restores Relief Approval
    // directly without a sidebar click.
    discover()

    return () => {
      document.removeEventListener('click', handleNavigationClick, true)
      document.removeEventListener('click', handleFeatureClick, true)
      viewObserver.disconnect()
      stopDiscovery()
      clearReliefApprovalAnchors()
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
      // Revalidate at the exact moment the delayed first-use tour would start.
      // If the user already left Relief Approval, do not let a stale timer open
      // this guide on Users or another Admin tab.
      if (!markReliefApprovalAnchors() || !isReliefApprovalVisible()) {
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
        if (!markReliefApprovalAnchors() || !isReliefApprovalVisible()) {
          featureOpenRef.current = false
          setFeatureOpen(false)
          return
        }
        start()
      }}
      aria-label="Open Relief Approval guide"
      className="fixed bottom-24 right-4 z-40 rounded-full border-emerald-200 bg-white/95 text-emerald-700 shadow-lg backdrop-blur-xl hover:bg-emerald-50 sm:right-6"
    >
      <PackageCheck className="h-4 w-4" />
      Relief Approval guide
    </Button>
  )
}
