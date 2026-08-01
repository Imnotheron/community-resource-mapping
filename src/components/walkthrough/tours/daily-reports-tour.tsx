'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { FileChartColumnIncreasing } from 'lucide-react'

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

const ANCHOR_ATTRIBUTE = 'data-daily-reports-tour-anchor'
const FALLBACK_ATTRIBUTE = 'data-daily-reports-tour-fallback'
const DISCOVERY_INTERVAL_MS = 150
const DISCOVERY_TIMEOUT_MS = 12_000

const TARGETS = {
  header: '[data-tour="daily-reports-header"]',
  actions: '[data-tour="daily-reports-actions"]',
  filters: '[data-tour="daily-reports-filters"]',
  date: '[data-tour="daily-reports-date"]',
  barangay: '[data-tour="daily-reports-barangay"]',
  worker: '[data-tour="daily-reports-worker"]',
  report: '[data-tour="daily-reports-report"]',
  summary: '[data-tour="daily-reports-summary"]',
  distributions: '[data-tour="daily-reports-distributions"]',
  registrations: '[data-tour="daily-reports-registrations"]',
  barangaySummary: '[data-tour="daily-reports-barangay-summary"]',
  print: '[data-tour="daily-reports-print"]',
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

function clearReportAnchors() {
  document
    .querySelectorAll<HTMLElement>(`[${ANCHOR_ATTRIBUTE}="true"]`)
    .forEach((element) => {
      element.removeAttribute('data-tour')
      element.removeAttribute(ANCHOR_ATTRIBUTE)
    })

  document
    .querySelectorAll<HTMLElement>(`[${FALLBACK_ATTRIBUTE}="true"]`)
    .forEach((element) => element.removeAttribute(FALLBACK_ATTRIBUTE))
}

function setAnchor(element: HTMLElement | null, name: string) {
  if (!element) return false
  element.setAttribute('data-tour', name)
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
    if (requiredText.every((value) => text.includes(value))) {
      return candidate
    }
    candidate = candidate.parentElement
    depth += 1
  }

  return null
}

function findReportsHeading() {
  return findVisibleExact<HTMLHeadingElement>(document, 'h1', 'Daily Reports')
}

function isReportsVisible() {
  return Boolean(findReportsHeading())
}

function findSection(root: ParentNode, headingText: string) {
  const heading = findVisibleExact<HTMLElement>(root, 'h2', headingText)
  return heading ? ancestorContaining(heading, [headingText], 3) : null
}

function markDailyReportAnchors() {
  clearReportAnchors()

  const heading = findReportsHeading()
  if (!heading) return false

  const header = ancestorContaining(heading, [
    'Operations Reporting',
    'Generate a date-based report, verify the figures, then print it on A4 paper.',
  ])
  if (!header) return false

  const root =
    header.parentElement instanceof HTMLElement ? header.parentElement : header

  const loading = Array.from(
    root.querySelectorAll<HTMLElement>('p, span, div'),
  ).some((element) => {
    if (!isVisible(element)) return false
    const text = normalizedText(element.textContent)
    return (
      text === 'Generating daily report' ||
      text === 'Calculating registrations, distributions, workers, and field activity...'
    )
  })

  const refresh = findVisibleButton(header, 'Refresh')
  const print = findVisibleButton(header, 'Print Report')
  const actions =
    refresh?.parentElement instanceof HTMLElement
      ? refresh.parentElement
      : print?.parentElement instanceof HTMLElement
        ? print.parentElement
        : null

  const filtersTitle = findVisibleExact<HTMLElement>(root, 'h3', 'Report Filters')
  const filters = filtersTitle
    ? ancestorContaining(filtersTitle, ['Report date', 'Barangay', 'Worker'], 5)
    : null

  const dateInput = root.querySelector<HTMLInputElement>('#report-date')
  const dateGroup = dateInput
    ? ancestorContaining(dateInput, ['Report date'], 3)
    : null

  const labels = Array.from(root.querySelectorAll<HTMLElement>('label')).filter(
    isVisible,
  )
  const barangayLabel = labels.find(
    (label) => normalizedText(label.textContent) === 'Barangay',
  ) ?? null
  const workerLabel = labels.find(
    (label) => normalizedText(label.textContent) === 'Worker',
  ) ?? null
  const barangayGroup = barangayLabel
    ? ancestorContaining(barangayLabel, ['Barangay'], 3)
    : null
  const workerGroup = workerLabel
    ? ancestorContaining(workerLabel, ['Worker'], 3)
    : null

  const report = root.querySelector<HTMLElement>('.report-print-root')
  const noDataText = findVisibleExact<HTMLElement>(
    root,
    'p',
    'No report data is available.',
  )
  const noData = noDataText
    ? ancestorContaining(noDataText, ['No report data is available.'], 4)
    : null
  const reportTarget = report ?? noData

  if (loading || !filters || !dateGroup || !reportTarget) {
    clearReportAnchors()
    return false
  }

  const summary = report ? findSection(report, 'Executive Summary') : null
  const distributions = report
    ? findSection(report, 'Daily Relief Distributions')
    : null
  const registrations = report
    ? findSection(report, 'New Registrations')
    : null
  const barangaySummary = report
    ? findSection(report, 'Barangay Summary')
    : null

  setAnchor(header, 'daily-reports-header')
  setAnchor(actions ?? header, 'daily-reports-actions')
  setAnchor(filters, 'daily-reports-filters')
  setAnchor(dateGroup, 'daily-reports-date')
  setAnchor(barangayGroup ?? filters, 'daily-reports-barangay')
  setAnchor(workerGroup ?? filters, 'daily-reports-worker')
  setAnchor(reportTarget, 'daily-reports-report')
  setAnchor(summary ?? reportTarget, 'daily-reports-summary')
  setAnchor(distributions ?? reportTarget, 'daily-reports-distributions')
  setAnchor(registrations ?? reportTarget, 'daily-reports-registrations')
  setAnchor(barangaySummary ?? reportTarget, 'daily-reports-barangay-summary')
  setAnchor(print ?? actions ?? header, 'daily-reports-print')

  return true
}

export function DailyReportsWalkthrough({ user }: { user: AuthUser }) {
  const [featureOpen, setFeatureOpen] = useState(false)
  const featureOpenRef = useRef(false)
  const activeTourIdRef = useRef<string | null>(null)
  const discoveryIntervalRef = useRef<number | null>(null)
  const discoveryTimeoutRef = useRef<number | null>(null)

  const { hydrated, activeTourId, startTour, closeTour } = useWalkthrough()

  const tour = useMemo<WalkthroughTour>(
    () => ({
      id: userScopedTourId('admin-daily-reports-first-use', user.id),
      version: 1,
      title: 'Daily Reports guide',
      role: 'ADMIN',
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to Daily Reports',
          description:
            'This screen creates a printable municipal operations snapshot for one Philippine calendar date. The guide explains the filters and figures but will not change a filter, refresh the report, or open the print window for you.',
          placement: 'center',
          eyebrow: 'Daily Reports guide',
        },
        {
          id: 'purpose',
          title: 'Verify the report before treating it as an official record',
          description:
            'Daily Reports summarizes information already stored in CRMS. It does not independently confirm that every registration, distribution, field note, worker activity signal, or status is complete and correct. Review the underlying records before signing or circulating a report.',
          target: TARGETS.header,
          placement: 'bottom',
          padding: 4,
        },
        {
          id: 'date',
          title: 'Choose the reporting date first',
          description:
            'The report uses the selected date from midnight to midnight in Asia/Manila time. Changing the date automatically loads a new report. Check the displayed Report Date in the printable section before continuing, especially when reviewing early-morning activity.',
          target: TARGETS.date,
          placement: 'bottom',
          padding: 3,
        },
        {
          id: 'barangay',
          title: 'Barangay narrows citizen and distribution information',
          description:
            'All barangays shows the municipality-wide view. Selecting one barangay narrows the registered-citizen total, new registrations, distribution records linked to a vulnerable profile in that barangay, and the Barangay Summary. It does not narrow municipality-wide worker counts or field notes.',
          target: TARGETS.barangay,
          placement: 'bottom',
          padding: 3,
        },
        {
          id: 'worker',
          title: 'Worker narrows distributions and field notes—not every metric',
          description:
            'All workers includes every worker’s daily distribution records and field notes. Selecting one worker narrows those two activity sets. It does not change the citizen-registration totals, new registrations, Active Workers, or Workers Online Today figures.',
          target: TARGETS.worker,
          placement: 'bottom',
          padding: 3,
        },
        {
          id: 'refresh',
          title: 'Refresh recalculates the current selection',
          description:
            'The report normally reloads when a filter changes. Use Refresh when you expect records to have changed while this page remained open. Refresh does not approve, reject, correct, or create any source record—it only requests the current report again.',
          target: TARGETS.actions,
          placement: 'bottom',
          padding: 3,
        },
        {
          id: 'summary',
          title: 'Read each summary number by its own definition',
          description:
            'Registered Citizens is the filtered registry total, while New Registrations counts profiles created on the selected date. Distributions Recorded counts distribution records, not item quantity. Approved and Pending count statuses within those daily distribution records. Field Notes counts notes created that day.',
          target: TARGETS.summary,
          placement: 'auto',
          padding: 4,
        },
        {
          id: 'distributions',
          title: 'Check the distribution rows behind the summary',
          description:
            'Each row shows beneficiary or household, barangay, type/items, quantity, worker, and current status. A record appearing here means its distribution date falls on the selected day; Pending and Rejected records can still appear. Confirm status before reporting assistance as completed.',
          target: TARGETS.distributions,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'registrations',
          title: 'New Registrations means created on this date',
          description:
            'This table lists profiles created during the selected Philippine day and shows their current registration status. It does not mean every listed person was approved that day, and it does not list older profiles whose status changed on that date.',
          target: TARGETS.registrations,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'barangay-summary',
          title: 'Barangay Summary mixes a registry total with a daily count',
          description:
            'Registered Citizens is the current number of profiles in the barangay scope. Daily Distributions counts the selected day’s matching distribution records. These columns cover different time scopes, so do not subtract or compare them as though both were daily totals.',
          target: TARGETS.barangaySummary,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'print',
          title: 'Print only after checking the date, filters, and personal data',
          description:
            'Print Report opens the browser print dialog and formats the report for A4 portrait paper. The printable report can contain citizen names, barangays, worker names, distribution details, and statuses. Confirm the intended audience, printer, page range, and secure handling before producing a paper or PDF copy.',
          target: TARGETS.print,
          placement: 'bottom',
          padding: 3,
        },
        {
          id: 'finish',
          title: 'A generated report still needs accountable review',
          description:
            'Final check: Is the Report Date correct? Are Barangay and Worker filters correct? Do the detail rows support the summary? Have Pending or Rejected records been described accurately? Is personal data limited to people who are authorized to receive the report? Sign only after those checks.',
          placement: 'center',
          eyebrow: 'Good reporting practice',
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
      const found = markDailyReportAnchors()
      setFeatureState(found)
      if (found) stopDiscovery()
      return found
    }

    const beginDiscovery = () => {
      stopDiscovery()
      clearReportAnchors()
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
      clearReportAnchors()
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

      if (navItem.dataset.tour === 'nav-reports') {
        window.setTimeout(beginDiscovery, 0)
      } else {
        leaveFeature()
      }
    }

    const viewObserver = new MutationObserver(() => {
      if (featureOpenRef.current && !isReportsVisible()) {
        leaveFeature()
      }
    })

    document.addEventListener('click', handleNavigationClick, true)
    viewObserver.observe(document.body, { childList: true, subtree: true })

    discover()

    return () => {
      document.removeEventListener('click', handleNavigationClick, true)
      viewObserver.disconnect()
      stopDiscovery()
      clearReportAnchors()
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
      if (!markDailyReportAnchors() || !isReportsVisible()) {
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
        if (!markDailyReportAnchors() || !isReportsVisible()) {
          featureOpenRef.current = false
          setFeatureOpen(false)
          return
        }
        start()
      }}
      aria-label="Open Daily Reports guide"
      className="fixed bottom-24 right-4 z-40 rounded-full border-emerald-200 bg-white/95 text-emerald-700 shadow-lg backdrop-blur-xl hover:bg-emerald-50 sm:right-6"
    >
      <FileChartColumnIncreasing className="h-4 w-4" />
      Daily Reports guide
    </Button>
  )
}
