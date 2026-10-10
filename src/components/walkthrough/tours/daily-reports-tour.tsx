'use client'

import { useCallback, useMemo } from 'react'
import { FileText } from 'lucide-react'

import type { AuthUser } from '@/lib/api-client'
import { userScopedTourId } from '@/components/walkthrough/onboarding-policy'
import { ContextualFeatureGuide } from '@/components/walkthrough/tours/contextual-feature-guide'
import type { WalkthroughTour } from '@/components/walkthrough/types'

type ReportsSection = 'OPERATIONS' | 'RELIEF'

const OPERATIONS = {
  root: '[data-tour="reports-operations-root"]',
  tabs: '[data-tour="daily-reports-tabs"]',
  header: '[data-tour="reports-operations-header"]',
  settings: '[data-tour="reports-operations-settings"]',
  filters: '[data-tour="reports-operations-filters"]',
  preview: '[data-tour="reports-operations-preview"]',
} as const

const RELIEF = {
  root: '[data-tour="reports-relief-root"]',
  tabs: '[data-tour="daily-reports-tabs"]',
  header: '[data-tour="reports-relief-header"]',
  request: '[data-tour="reports-relief-request"]',
  templates: '[data-tour="reports-relief-templates"]',
  filters: '[data-tour="reports-relief-filters"]',
} as const

export function DailyReportsWalkthrough({
  user,
  section,
}: {
  user: AuthUser
  section: ReportsSection
}) {
  const isAdmin = String(user.role || '').toUpperCase() === 'ADMIN'
  const isOperations = section === 'OPERATIONS'
  const root = isOperations ? OPERATIONS.root : RELIEF.root

  const isFeatureVisible = useCallback(() => {
    const element = document.querySelector<HTMLElement>(root)
    if (!element) return false
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  }, [root])

  const discover = useCallback(
    () =>
      isFeatureVisible() &&
      Boolean(document.querySelector(isOperations ? OPERATIONS.settings : RELIEF.request)) &&
      Boolean(document.querySelector(isOperations ? OPERATIONS.filters : RELIEF.header)),
    [isFeatureVisible, isOperations],
  )
  const clear = useCallback(() => {}, [])

  const tour = useMemo<WalkthroughTour>(
    () => ({
      id: userScopedTourId(
        isOperations ? 'daily-operations-report-first-use' : 'relief-reports-first-use',
        user.id,
      ),
      version: 3,
      title: isOperations ? 'Daily Operations Report guide' : 'Relief Reports guide',
      role: isAdmin ? 'ADMIN' : 'WORKER',
      steps: isOperations
        ? [
            {
              id: 'welcome',
              title: 'Daily Operations reports one Philippine calendar date',
              description:
                'This guide covers the current Daily Operations Report. It does not change filters, save settings, print, or modify the source records.',
              placement: 'center',
            },
            {
              id: 'sections',
              title: 'Daily Operations and Relief Reports are separate',
              description:
                'Use these tabs to switch between a single-day municipal/worker activity report and a standalone relief report for a date range. Each section has its own filters and print settings.',
              target: OPERATIONS.tabs,
              placement: 'bottom',
            },
            {
              id: 'header',
              title: 'Refresh or print the current Daily Operations Report',
              description:
                'Refresh retrieves updated data for the current selection. Print Report opens the browser print dialog. Neither action approves, rejects, or edits source entries.',
              target: OPERATIONS.header,
              placement: 'bottom',
            },
            {
              id: 'settings',
              title: 'Set the template, title, and report signatories',
              description:
                'Choose Formal, Compact, or Summary and verify the report title, Prepared by, and Reviewed / Approved by details. Save the settings when they change. These are Daily Operations formats, not the three Relief Reports templates.',
              target: OPERATIONS.settings,
              placement: 'auto',
            },
            {
              id: 'filters',
              title: 'Apply the current reporting filters',
              description:
                'Choose a date, barangay, last name, person, relief status, general and specific relief type, general and specific vulnerability, and sort order. Administrators can also filter by Worker. Available relief choices follow matching records; each filter can change which rows appear.',
              target: OPERATIONS.filters,
              placement: 'auto',
            },
            {
              id: 'results',
              title: 'Check the registry and relief records before signing',
              description:
                'The report separates registry totals, newly registered people, daily relief records, barangay coverage, and field activity. New registrations are based on creation date, not approval date. Pending and Rejected entries must not be presented as verified delivered assistance. Approved activity is also summarized separately by relief type.',
              target: OPERATIONS.preview,
              placement: 'auto',
            },
            {
              id: 'finish',
              title: 'Verify scope and privacy before printing',
              description:
                'Confirm the Philippine report date, selected filters, source-record statuses, figures, print layout, and authorized signatories. Printed names, vulnerabilities, and distribution details are sensitive municipal records.',
              placement: 'center',
            },
          ]
        : [
            {
              id: 'welcome',
              title: 'Request a standalone Relief Distribution Report',
              description:
                'Relief Reports summarizes authorized distributions for a chosen date range. The guide will not generate, edit, export, or print records.',
              placement: 'center',
            },
            {
              id: 'sections',
              title: 'Switch back to Daily Operations when needed',
              description:
                'The Daily Operations Report tab is for a single day. Relief Reports uses its own from/to period and separate printable templates.',
              target: RELIEF.tabs,
              placement: 'bottom',
            },
            {
              id: 'request',
              title: 'Choose the period, then Generate Relief Report',
              description:
                'Use Today, Last 7 days, Last 30 days, or enter From and To dates. Press Generate Relief Report after changing dates; until then, the previous report is considered outdated.',
              target: RELIEF.request,
              placement: 'auto',
            },
            {
              id: 'templates',
              title: 'Choose one of three relief print templates',
              description:
                'After generating, choose LGU Relief Summary Report (keeps all statuses), DSWD-style Relief Distribution Sheet, or Relief Accomplishment Report. The last two show only APPROVED or DISTRIBUTED records. The DSWD-inspired sheet is an LGU preparation format, not an official DSWD-issued document.',
              target: RELIEF.templates,
              placement: 'auto',
            },
            {
              id: 'filters',
              title: 'Filter only the records you need to report',
              description:
                'After generating, filter by status, barangay, general/specific relief type and vulnerability, and sort order. Administrators can additionally select a Worker. The available choices come from the actual matching records; Clear filters resets the selection.',
              target: RELIEF.filters,
              placement: 'auto',
            },
            {
              id: 'verify',
              title: 'Verify missing print details instead of inventing them',
              description:
                'The DSWD-style sheet can request disaster details, dependents, and quantity units. Enter verified values only; leave unknown values blank and collect the real beneficiary signature or thumbmark on the printed distribution sheet. Accomplishment figures must count only accepted distributions.',
              placement: 'center',
            },
            {
              id: 'export',
              title: 'Review the result before Print or Export CSV',
              description:
                'Print Relief Report and Export CSV reflect the generated period, current filters, and permitted records. Confirm status, quantities, beneficiary details, signatories, and authorized audience first. No guide step will trigger printing or exporting.',
              target: RELIEF.header,
              placement: 'bottom',
            },
          ],
    }),
    [isAdmin, isOperations, user.id],
  )

  return (
    <ContextualFeatureGuide
      user={user}
      tour={tour}
      navId="reports"
      label={isOperations ? 'Daily Operations guide' : 'Relief Reports guide'}
      icon={<FileText className="h-4 w-4" />}
      discover={discover}
      clear={clear}
      isFeatureVisible={isFeatureVisible}
    />
  )
}
