'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ClipboardCheck } from 'lucide-react'

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

const ANCHOR_ATTRIBUTE = 'data-approval-tour-anchor'
const DISCOVERY_INTERVAL_MS = 150
const DISCOVERY_TIMEOUT_MS = 12_000

const TARGETS = {
  header: '[data-tour="approval-feature-header"]',
  printActions: '[data-tour="approval-print-actions"]',
  counts: '[data-tour="approval-status-counts"]',
  tabs: '[data-tour="approval-record-tabs"]',
  filters: '[data-tour="approval-filters"]',
  bulkActions: '[data-tour="approval-bulk-actions"]',
  records: '[data-tour="approval-record-list"]',
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

function clearApprovalAnchors() {
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
  selector: string,
  text: string,
) {
  return (
    Array.from(document.querySelectorAll<T>(selector)).find(
      (element) =>
        isVisible(element) && normalizedText(element.textContent).startsWith(text),
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

function findApprovalHeading() {
  return findVisibleExact<HTMLHeadingElement>('h1', 'Approval Center')
}

/**
 * Approval Center is rendered inside the Admin dashboard rather than on its own
 * route. This adapter discovers the visible feature by semantic labels, then
 * attaches temporary tour anchors to the real UI sections. It intentionally
 * does not click or mutate any approval controls.
 */
function markApprovalAnchors() {
  clearApprovalAnchors()

  const heading = findApprovalHeading()
  if (!heading) return false

  const featureRoot = ancestorContaining(heading, [
    'Categories and filters',
    'Approve Selected',
    'Reject Selected',
  ])

  if (!featureRoot) return false

  const refresh = findVisibleExact<HTMLButtonElement>('button', 'Refresh')
  const printSelected = findVisibleExact<HTMLButtonElement>(
    'button',
    'Print Selected',
  )
  const printCategory = findVisibleExact<HTMLButtonElement>(
    'button',
    'Print Category',
  )

  const printActions =
    refresh && printSelected && printCategory
      ? lowestCommonAncestor([refresh, printSelected, printCategory])
      : null

  const allRecords = findVisibleExact<HTMLElement>('p', 'All records')
  const pending = findVisibleExact<HTMLElement>('p', 'Pending')
  const approved = findVisibleExact<HTMLElement>('p', 'Approved')
  const rejected = findVisibleExact<HTMLElement>('p', 'Rejected')
  const selected = findVisibleExact<HTMLElement>('p', 'Selected')

  const countElements = [allRecords, pending, approved, rejected, selected]
  const counts = countElements.every(
    (element): element is HTMLElement => element instanceof HTMLElement,
  )
    ? lowestCommonAncestor(countElements as HTMLElement[])
    : null

  const registrationsTab = findVisibleStartingWith<HTMLButtonElement>(
    'button[role="tab"]',
    'Registrations (',
  )
  const distributionsTab = findVisibleStartingWith<HTMLButtonElement>(
    'button[role="tab"]',
    'Relief Distributions (',
  )
  const tabs =
    registrationsTab && distributionsTab
      ? lowestCommonAncestor([registrationsTab, distributionsTab])
      : null

  const filterHeading = findVisibleExact<HTMLElement>(
    'h2, h3, h4, div',
    'Categories and filters',
  )
  const searchInput = Array.from(
    featureRoot.querySelectorAll<HTMLInputElement>('input[placeholder="Search..."]'),
  ).find(isVisible)
  const filters =
    filterHeading && searchInput
      ? lowestCommonAncestor([filterHeading, searchInput])
      : filterHeading
        ? ancestorContaining(filterHeading, [
            'Bulk approval and category printing use the visible filtered records.',
          ])
        : null

  const approveSelected = findVisibleExact<HTMLButtonElement>(
    'button',
    'Approve Selected',
  )
  const rejectSelected = findVisibleExact<HTMLButtonElement>(
    'button',
    'Reject Selected',
  )
  const selectionSummary = Array.from(
    featureRoot.querySelectorAll<HTMLParagraphElement>('p'),
  ).find((element) => {
    const text = normalizedText(element.textContent)
    return isVisible(element) && /^\d+ selected • \d+ pending$/.test(text)
  })

  const bulkActions =
    approveSelected && rejectSelected && selectionSummary
      ? lowestCommonAncestor([
          approveSelected,
          rejectSelected,
          selectionSummary,
        ])
      : approveSelected && rejectSelected
        ? lowestCommonAncestor([approveSelected, rejectSelected])?.parentElement ?? null
        : null

  const activePanel = Array.from(
    featureRoot.querySelectorAll<HTMLElement>('[role="tabpanel"]'),
  ).find(
    (panel) =>
      isVisible(panel) &&
      (panel.getAttribute('data-state') === 'active' ||
        panel.getAttribute('hidden') === null),
  )

  const header = ancestorContaining(heading, [
    'Administrative workflow',
    'Categorize, print, approve, and reject registrations and relief records.',
  ])

  const requiredTargets = [
    header,
    printActions,
    counts,
    tabs,
    filters,
    bulkActions,
    activePanel,
  ]

  if (requiredTargets.some((target) => !(target instanceof HTMLElement))) {
    clearApprovalAnchors()
    return false
  }

  setAnchor(header, 'approval-feature-header')
  setAnchor(printActions, 'approval-print-actions')
  setAnchor(counts, 'approval-status-counts')
  setAnchor(tabs, 'approval-record-tabs')
  setAnchor(filters, 'approval-filters')
  setAnchor(bulkActions, 'approval-bulk-actions')
  setAnchor(activePanel ?? null, 'approval-record-list')

  return true
}

export function ApprovalCenterWalkthrough({ user }: { user: AuthUser }) {
  const [approvalOpen, setApprovalOpen] = useState(false)
  const discoveryIntervalRef = useRef<number | null>(null)
  const discoveryTimeoutRef = useRef<number | null>(null)

  const { hydrated, activeTourId, startTour } = useWalkthrough()

  const tour = useMemo<WalkthroughTour>(
    () => ({
      id: userScopedTourId('admin-approval-center-first-use', user.id),
      version: 1,
      title: 'Approval Center guide',
      role: 'ADMIN',
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to Approval Center',
          description:
            'Approval Center is where an Administrator reviews vulnerable registrations and relief-distribution records before changing their status. This guide is instructional only and will never approve or reject a record for you.',
          placement: 'center',
          eyebrow: 'Approval Center guide',
        },
        {
          id: 'purpose',
          title: 'Treat this as a decision workspace',
          description:
            'The current workflow supports two final actions on pending records: Approve and Reject. There is no separate Verify or Request correction action on this screen, so do not assume those states exist here.',
          target: TARGETS.header,
          placement: 'bottom',
          padding: 4,
        },
        {
          id: 'counts',
          title: 'Check the queue before acting',
          description:
            'These cards show the current totals for the active tab: all records, pending, approved, rejected, and how many records you have selected. Pending is the key queue because only pending records can be approved or rejected.',
          target: TARGETS.counts,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'record-types',
          title: 'Registrations and relief records are separate queues',
          description:
            'Use Registrations for vulnerable-citizen applications and Relief Distributions for records submitted by field workers. Switching tabs resets the filters to Pending so you begin with the records that still require a decision.',
          target: TARGETS.tabs,
          placement: 'bottom',
          padding: 3,
        },
        {
          id: 'filters',
          title: 'Narrow the queue, then recheck your selection',
          description:
            'Search and filters change what you see and what Print Category will include. The table header checkbox selects the rows currently visible, but records you selected earlier can remain selected after filters change. Always recheck the Selected count before a bulk approval or rejection.',
          target: TARGETS.filters,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'records',
          title: 'Treat the table as a summary, not a full case file',
          description:
            'For registrations, the table shows identity/contact details, barangay, vulnerability categories, submission date, and status. For relief records, it shows beneficiary, items and quantity, category, worker, barangay, date, and status. If a decision requires information that is not shown here, verify the underlying source record before approving or rejecting. An empty panel simply means the current filters have no matching records.',
          target: TARGETS.records,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'selection-actions',
          title: 'Selection controls the records you are about to change',
          description:
            'The summary shows how many records are selected and how many selected records are still pending. Selected can include rows chosen before a filter change, even if those rows are no longer visible. Recheck the count and intended records before opening a confirmation.',
          target: TARGETS.bulkActions,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'approval-safety',
          title: 'Approve only after the information is sufficient',
          description:
            'Approval changes a pending record to approved. For registrations, that can also trigger an approval email. For relief distributions, the affected vulnerable user can receive a notification. Do not use approval as a way to mark a record as merely reviewed.',
          target: TARGETS.bulkActions,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'rejection-safety',
          title: 'A rejection needs a clear reason',
          description:
            'Reject opens a confirmation that requires a written reason. Use a factual, respectful reason that explains what is wrong or why the record cannot be accepted. Avoid unnecessary sensitive information because the reason may be communicated to the affected user.',
          target: TARGETS.bulkActions,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'printing',
          title: 'Know exactly what each print action includes',
          description:
            'Print Selected prints the records currently stored in your selection, including records that may have been selected before a filter change. Print Category uses the records visible under the current filters. Confirm the tab, Selected count, status, barangay, category, worker, and search terms before printing personal information.',
          target: TARGETS.printActions,
          placement: 'left',
          padding: 3,
        },
        {
          id: 'finish',
          title: 'Verify, decide, and protect the record',
          description:
            'Before a final decision, make sure the selected record is the intended one, the available details support the action, and the result can be explained later. Approval Center contains personal and operational data, so only print or expose what is necessary for authorized municipal work.',
          placement: 'center',
          eyebrow: 'Good approval practice',
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
      const found = markApprovalAnchors()
      setApprovalOpen(found)
      if (found) stopDiscovery()
      return found
    }

    const beginDiscovery = () => {
      stopDiscovery()
      clearApprovalAnchors()
      setApprovalOpen(false)

      if (discover()) return

      discoveryIntervalRef.current = window.setInterval(() => {
        discover()
      }, DISCOVERY_INTERVAL_MS)

      discoveryTimeoutRef.current = window.setTimeout(() => {
        stopDiscovery()
      }, DISCOVERY_TIMEOUT_MS)
    }

    const leaveApprovalCenter = () => {
      stopDiscovery()
      clearApprovalAnchors()
      setApprovalOpen(false)
    }

    const handleNavigationClick = (event: MouseEvent) => {
      const origin = event.target
      if (!(origin instanceof Element)) return

      const navItem = origin.closest<HTMLElement>('[data-tour^="nav-"]')
      if (!navItem) return

      if (navItem.dataset.tour === 'nav-approval-center') {
        window.setTimeout(beginDiscovery, 0)
      } else {
        leaveApprovalCenter()
      }
    }

    document.addEventListener('click', handleNavigationClick, true)

    // Covers hot reload and any future entry path that restores Approval Center
    // directly without a sidebar click.
    discover()

    return () => {
      document.removeEventListener('click', handleNavigationClick, true)
      stopDiscovery()
      clearApprovalAnchors()
    }
  }, [])

  useEffect(() => {
    if (
      !hydrated ||
      !approvalOpen ||
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
    approvalOpen,
    hydrated,
    startTour,
    tour.id,
    user.createdAt,
  ])

  if (!approvalOpen || activeTourId) return null

  return (
    <Button
      type="button"
      variant="outline"
      onClick={start}
      aria-label="Open Approval Center guide"
      className="fixed bottom-24 right-4 z-40 rounded-full border-emerald-200 bg-white/95 text-emerald-700 shadow-lg backdrop-blur-xl hover:bg-emerald-50 sm:right-6"
    >
      <ClipboardCheck className="h-4 w-4" />
      Approval Center guide
    </Button>
  )
}
