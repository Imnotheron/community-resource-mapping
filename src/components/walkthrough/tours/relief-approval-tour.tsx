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

  const headingBlock = ancestorContaining(heading, [
    'Relief Distribution Approval',
    'Review relief distributions recorded by field workers.',
  ])
  if (!headingBlock) return false

  const header = headingBlock.parentElement instanceof HTMLElement
    ? headingBlock.parentElement
    : headingBlock
  const featureRoot = header.parentElement instanceof HTMLElement
    ? header.parentElement
    : header

  const filter = Array.from(
    header.querySelectorAll<HTMLElement>('[role="combobox"]'),
  ).find(isVisible) ?? null

  const beneficiaryLabel = findVisibleStartingWith<HTMLElement>(
    featureRoot,
    'span',
    'Beneficiary:',
  )

  const detailsGrid = beneficiaryLabel
    ? ancestorContaining(beneficiaryLabel, [
        'Beneficiary:',
        'Worker:',
        'Quantity:',
        'Date:',
      ], 6)
    : null

  // The details grid is inside the left column of the card row. Move two
  // levels up so the spotlight also includes distribution type, item text,
  // notes, and the action area described by the guide.
  const firstRecord =
    detailsGrid?.parentElement?.parentElement instanceof HTMLElement
      ? detailsGrid.parentElement.parentElement
      : detailsGrid

  const emptyState = Array.from(
    featureRoot.querySelectorAll<HTMLElement>('p, div'),
  ).find((element) => {
    if (!isVisible(element)) return false
    const text = normalizedText(element.textContent)
    return /^No (pending|approved|rejected|all) distributions\.$/i.test(text)
  }) ?? null

  // Do not attach the tour while the records area is still loading. Waiting
  // for either a real record or the final empty-state prevents stale targets.
  if (!filter || (!firstRecord && !emptyState)) {
    clearReliefApprovalAnchors()
    return false
  }

  const recordTarget = firstRecord ?? emptyState!

  const approve = Array.from(
    featureRoot.querySelectorAll<HTMLButtonElement>('button'),
  ).find(
    (button) => isVisible(button) && normalizedText(button.textContent) === 'Approve',
  ) ?? null
  const reject = Array.from(
    featureRoot.querySelectorAll<HTMLButtonElement>('button'),
  ).find(
    (button) => isVisible(button) && normalizedText(button.textContent) === 'Reject',
  ) ?? null

  // When the current filter has no Pending action buttons, keep the action
  // teaching step on the feature workspace rather than reusing recordTarget;
  // reusing it would overwrite the record's data-tour anchor.
  const actions = approve && reject
    ? lowestCommonAncestor([approve, reject])
    : featureRoot

  if (!actions) {
    clearReliefApprovalAnchors()
    return false
  }

  setAnchor(header, 'relief-approval-header')
  setAnchor(filter, 'relief-approval-filter')
  setAnchor(recordTarget, 'relief-approval-record')
  setAnchor(actions, 'relief-approval-actions')

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
      version: 1,
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
            'Pending shows records that still have Approve or Reject actions. Approved shows accepted records, Rejected shows declined records, and All lets you review the complete list. Changing this filter does not change a record by itself.',
          target: TARGETS.filter,
          placement: 'left',
          padding: 3,
        },
        {
          id: 'record-basics',
          title: 'Read the relief type and items first',
          description:
            'Each card starts with the distribution type, current status, and the items that the worker recorded. Make sure the description is understandable and matches the kind of relief that was actually given. If the current filter is empty, the page simply tells you there are no matching distributions.',
          target: TARGETS.record,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'record-details',
          title: 'Check who received it, who recorded it, how much, and when',
          description:
            'Beneficiary identifies the vulnerable citizen when the record is linked to a profile; otherwise it may show Household. Worker identifies who recorded the distribution. Quantity is the recorded amount, and Date is the distribution date. Check that these details make sense together before deciding.',
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
            'Reject changes a Pending record to Rejected. The current screen allows a rejection reason to be left blank, but a short factual reason is better practice because it explains what needs attention and may be included in a notification to the affected user. Avoid unnecessary private information.',
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

      const navItem = origin.closest<HTMLElement>('[data-tour^="nav-"]')
      if (!navItem) return

      if (navItem.dataset.tour === 'nav-distributions') {
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
