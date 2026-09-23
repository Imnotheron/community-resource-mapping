'use client'

import { useMemo } from 'react'
import { History } from 'lucide-react'

import type { AuthUser } from '@/lib/api-client'
import { userScopedTourId } from '@/components/walkthrough/onboarding-policy'
import { ContextualFeatureGuide } from '@/components/walkthrough/tours/contextual-feature-guide'
import type { WalkthroughTour } from '@/components/walkthrough/types'

type HistoryMode = 'admin' | 'worker'

const TARGETS = {
  root: '[data-tour="operations-history-root"]',
  header: '[data-tour="operations-history-header"]',
  refresh: '[data-tour="operations-history-refresh"]',
  summary: '[data-tour="operations-history-summary"]',
  tabs: '[data-tour="operations-history-tabs"]',
  reliefTab: '[data-tour="operations-history-tab-relief"]',
  eventsTab: '[data-tour="operations-history-tab-events"]',
  filters: '[data-tour="operations-history-filters"]',
  relief: '[data-tour="operations-history-relief"]',
  events: '[data-tour="operations-history-events"]',
} as const

function historyRoot(mode: HistoryMode) {
  return document.querySelector<HTMLElement>(
    `${TARGETS.root}[data-history-mode="${mode}"]`,
  )
}

function historyVisible(mode: HistoryMode) {
  const root = historyRoot(mode)
  if (!root) return false

  const rect = root.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function discoverHistory(mode: HistoryMode) {
  const root = historyRoot(mode)
  if (!root) return false

  return [
    TARGETS.header,
    TARGETS.refresh,
    TARGETS.summary,
    TARGETS.tabs,
    TARGETS.filters,
  ].every((selector) => Boolean(root.querySelector(selector)))
}

function clearHistoryTargets() {
  // Operations History owns stable data-tour attributes, so there are no
  // temporary DOM anchors to remove when the guide closes.
}

function nextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve())
    })
  })
}

async function showHistoryTab(
  mode: HistoryMode,
  tab: 'relief' | 'events',
) {
  const root = historyRoot(mode)
  if (!root) return

  const selector =
    tab === 'relief'
      ? TARGETS.reliefTab
      : TARGETS.eventsTab

  root.querySelector<HTMLButtonElement>(selector)?.click()
  await nextPaint()
}

export function OperationsHistoryWalkthrough({
  user,
  mode,
}: {
  user: AuthUser
  mode: HistoryMode
}) {
  const isWorker = mode === 'worker'

  const tour = useMemo<WalkthroughTour>(
    () => ({
      id: userScopedTourId(
        `${mode}-operations-history-first-use`,
        user.id,
      ),
      version: 1,
      title: isWorker
        ? 'Activity History guide'
        : 'Operations History guide',
      role: isWorker ? 'WORKER' : 'ADMIN',
      steps: [
        {
          id: 'welcome',
          title: isWorker
            ? 'Welcome to Activity History'
            : 'Welcome to Operations History',
          description: isWorker
            ? 'This page combines your relief distribution records with municipal events and activities visible to Workers. The guide only explains the records and controls; it does not change historical data.'
            : 'This page brings relief distribution records and recorded municipal events into one review workspace. The guide only explains the records and controls; it does not approve, reject, edit, or delete anything.',
          placement: 'center',
          eyebrow: isWorker
            ? 'Worker history guide'
            : 'Municipal history guide',
        },
        {
          id: 'purpose',
          title: 'Use history for review, verification, and follow-up',
          description: isWorker
            ? 'Use this page to confirm what your account recorded and to review worker-visible activities. A record appearing here means CRMS returned it; it does not independently prove that every field detail is correct.'
            : 'Use this page to trace relief activity and municipal events before reports, audits, follow-up, or planning. Historical records should be checked against source documents whenever a decision depends on exact beneficiary, quantity, date, status, or event information.',
          target: TARGETS.header,
          placement: 'bottom',
          padding: 4,
        },
        {
          id: 'summary',
          title: 'The summary cards describe the loaded history',
          description:
            'Relief records, events and activities, completed events, and distribution types are counts from the currently loaded history data. Filters below narrow the lists, but these top cards continue to summarize the loaded dataset.',
          target: TARGETS.summary,
          placement: 'auto',
          padding: 4,
        },
        {
          id: 'tabs',
          title: 'History is separated into relief records and events',
          description:
            'Relief Distribution History focuses on beneficiary assistance records. Events & Activities focuses on meetings, advisories, relief activities, and other published municipal events. Switching tabs clears the shared search box so an old search does not accidentally hide records in the next tab.',
          target: TARGETS.tabs,
          placement: 'bottom',
          padding: 3,
        },
        {
          id: 'relief-filters',
          title: 'Narrow relief history before reviewing a long list',
          description:
            'Search can match beneficiary, worker, barangay, items, status, and notes. You can also filter by distribution type, barangay, approval status, and date order. Specific date limits the list to records from that selected distribution date.',
          target: TARGETS.filters,
          placement: 'auto',
          padding: 4,
          beforeEnter: () => showHistoryTab(mode, 'relief'),
        },
        {
          id: 'relief-records',
          title: 'Read each relief record as a complete transaction',
          description: isWorker
            ? 'Check the beneficiary, status, distribution type, items, quantity, barangay, date, and recorded worker. If something conflicts with what happened in the field, use the authorized correction or reporting process rather than treating the history page itself as an editing screen.'
            : 'Check beneficiary, status, distribution type, items, quantity, barangay, worker, date, and notes together. Pending and Rejected records remain part of the operational history and should not be counted as completed assistance without checking their status.',
          target: TARGETS.relief,
          placement: 'auto',
          padding: 4,
          beforeEnter: () => showHistoryTab(mode, 'relief'),
        },
        {
          id: 'event-filters',
          title: 'Event history has its own type, status, audience, and date filters',
          description:
            'Event status is derived from the event date: Completed for past dates, Today for the current date, Upcoming for future dates, and Unscheduled when no usable event date exists. Audience helps separate notices intended for different roles.',
          target: TARGETS.filters,
          placement: 'auto',
          padding: 4,
          beforeEnter: () => showHistoryTab(mode, 'events'),
        },
        {
          id: 'event-records',
          title: 'Event date and recorded time mean different things',
          description:
            'Each event can show its type, status, event date, time, location, audience, and when the record was created. The event date describes when the activity is scheduled; the Recorded timestamp describes when CRMS stored the announcement or event record.',
          target: TARGETS.events,
          placement: 'auto',
          padding: 4,
          beforeEnter: () => showHistoryTab(mode, 'events'),
        },
        {
          id: 'refresh',
          title: 'Refresh when you need the latest saved history',
          description:
            'Refresh requests the history again from the server. Use it after another authorized user has approved, rejected, or recorded something and you need to confirm that the latest saved state is visible here.',
          target: TARGETS.refresh,
          placement: 'left',
          padding: 3,
        },
        {
          id: 'finish',
          title: 'History helps you investigate—it does not replace verification',
          description:
            'Before using a historical record for reporting or a municipal decision, confirm the relevant status, dates, beneficiary or audience, quantities, and source information. Use the filters to find evidence faster, then verify the details that matter.',
          placement: 'center',
          eyebrow: 'Good history-review practice',
        },
      ],
    }),
    [isWorker, mode, user.id],
  )

  return (
    <ContextualFeatureGuide
      user={user}
      tour={tour}
      navId="history"
      label={
        isWorker
          ? 'Activity History guide'
          : 'Operations History guide'
      }
      icon={<History className="h-4 w-4" />}
      discover={() => discoverHistory(mode)}
      clear={clearHistoryTargets}
      isFeatureVisible={() => historyVisible(mode)}
    />
  )
}
