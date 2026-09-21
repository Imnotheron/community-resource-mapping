'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquareText } from 'lucide-react'

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

const ANCHOR_ATTRIBUTE = 'data-feedback-tour-anchor'
const RESPONSE_FALLBACK_ATTRIBUTE = 'data-feedback-response-fallback'
const EXISTING_RESPONSE_FALLBACK_ATTRIBUTE =
  'data-feedback-existing-response-fallback'
const DIALOG_FALLBACK_ATTRIBUTE = 'data-feedback-dialog-fallback'
const DISCOVERY_INTERVAL_MS = 150
const DISCOVERY_TIMEOUT_MS = 12_000

const TARGETS = {
  header: '[data-tour="feedback-feature-header"]',
  record: '[data-tour="feedback-record"]',
  existingResponse:
    '[data-tour="feedback-existing-response"], [data-feedback-existing-response-fallback="true"]',
  respondAction:
    '[data-tour="feedback-respond-action"], [data-feedback-response-fallback="true"]',
  dialog:
    '[data-tour="feedback-response-dialog"], [data-feedback-dialog-fallback="true"]',
  responseField:
    '[data-tour="feedback-response-field"], [data-feedback-dialog-fallback="true"]',
  responseActions:
    '[data-tour="feedback-response-actions"], [data-feedback-dialog-fallback="true"]',
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

function clearFeedbackAnchors() {
  document
    .querySelectorAll<HTMLElement>(`[${ANCHOR_ATTRIBUTE}="true"]`)
    .forEach((element) => {
      element.removeAttribute('data-tour')
      element.removeAttribute(ANCHOR_ATTRIBUTE)
    })

  ;[
    RESPONSE_FALLBACK_ATTRIBUTE,
    EXISTING_RESPONSE_FALLBACK_ATTRIBUTE,
    DIALOG_FALLBACK_ATTRIBUTE,
  ].forEach((attribute) => {
    document
      .querySelectorAll<HTMLElement>(`[${attribute}="true"]`)
      .forEach((element) => element.removeAttribute(attribute))
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

function nextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve())
    })
  })
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds)
  })
}

function findFeedbackHeading() {
  return findVisibleExact<HTMLHeadingElement>(
    document,
    'h1',
    'Feedback Management',
  )
}

function isFeedbackVisible() {
  return Boolean(findFeedbackHeading())
}

function findFeedbackCard(start: HTMLElement | null) {
  return ancestorContaining(start, ['from '], 7)
}

function findVisibleResponseDialog() {
  return (
    Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find(
      (dialog) =>
        isVisible(dialog) &&
        normalizedText(dialog.textContent).includes('Respond to Feedback') &&
        normalizedText(dialog.textContent).includes('Your response'),
    ) ?? null
  )
}

function markResponseDialogAnchors(fallback: HTMLElement | null) {
  const dialog = findVisibleResponseDialog()

  if (!dialog) {
    fallback?.setAttribute(DIALOG_FALLBACK_ATTRIBUTE, 'true')
    return false
  }

  fallback?.removeAttribute(DIALOG_FALLBACK_ATTRIBUTE)

  const textarea = Array.from(
    dialog.querySelectorAll<HTMLTextAreaElement>('textarea'),
  ).find(isVisible) ?? null
  const cancel = findVisibleButton(dialog, 'Cancel')
  const send = findVisibleButton(dialog, 'Send Response')
  const actions =
    cancel && send ? lowestCommonAncestor([cancel, send]) : send ?? cancel

  setAnchor(dialog, 'feedback-response-dialog')
  setAnchor(textarea, 'feedback-response-field')
  setAnchor(actions, 'feedback-response-actions')

  return Boolean(textarea && actions)
}

/**
 * Feedback Management is rendered inside the Admin dashboard. This adapter
 * attaches temporary walkthrough anchors to the visible inbox and response
 * dialog without sending, editing, or changing a feedback record.
 */
function markFeedbackAnchors() {
  clearFeedbackAnchors()

  const heading = findFeedbackHeading()
  if (!heading) return false

  const headingBlock = ancestorContaining(heading, [
    'Feedback Management',
    'Review and respond to feedback from citizens and workers.',
  ])
  if (!headingBlock) return false

  const featureRoot =
    headingBlock.parentElement instanceof HTMLElement
      ? headingBlock.parentElement
      : headingBlock

  const loadingText = Array.from(
    featureRoot.querySelectorAll<HTMLElement>('p, span, div'),
  ).some((element) => {
    if (!isVisible(element)) return false
    const text = normalizedText(element.textContent)
    return (
      text === 'Loading feedback' ||
      text === 'Checking messages and responses...'
    )
  })

  const respondButton = findVisibleButton(featureRoot, 'Respond')
  const unansweredCard = respondButton ? findFeedbackCard(respondButton) : null

  const adminResponseLabel = Array.from(
    featureRoot.querySelectorAll<HTMLElement>('span, p, div'),
  ).find(
    (element) =>
      isVisible(element) &&
      normalizedText(element.textContent).startsWith('Admin response:'),
  ) ?? null
  const answeredCard = adminResponseLabel
    ? findFeedbackCard(adminResponseLabel)
    : null

  const emptyMessage = findVisibleExact<HTMLElement>(
    featureRoot,
    'div, p',
    'No feedback yet.',
  )
  const emptyState = emptyMessage
    ? ancestorContaining(emptyMessage, ['No feedback yet.'], 4)
    : null

  const recordTarget = unansweredCard ?? answeredCard ?? emptyState

  // Wait for the loader to finish and for a real record or final empty state.
  if (loadingText || !recordTarget) {
    clearFeedbackAnchors()
    return false
  }

  setAnchor(headingBlock, 'feedback-feature-header')
  setAnchor(recordTarget, 'feedback-record')

  if (adminResponseLabel) {
    const responseBox = ancestorContaining(
      adminResponseLabel,
      ['Admin response:'],
      3,
    )
    setAnchor(responseBox ?? adminResponseLabel, 'feedback-existing-response')
  } else {
    recordTarget.setAttribute(EXISTING_RESPONSE_FALLBACK_ATTRIBUTE, 'true')
  }

  if (respondButton) {
    setAnchor(respondButton, 'feedback-respond-action')
  } else {
    recordTarget.setAttribute(RESPONSE_FALLBACK_ATTRIBUTE, 'true')
  }

  markResponseDialogAnchors(recordTarget)
  return true
}

async function openResponseDialog() {
  if (!isFeedbackVisible()) return

  markFeedbackAnchors()

  const dialog = findVisibleResponseDialog()
  if (!dialog) {
    const heading = findFeedbackHeading()
    const featureRoot =
      heading?.parentElement?.parentElement instanceof HTMLElement
        ? heading.parentElement.parentElement
        : document
    findVisibleButton(featureRoot, 'Respond')?.click()
    await nextPaint()
    await delay(80)
  }

  const fallback = Array.from(
    document.querySelectorAll<HTMLElement>(TARGETS.record),
  ).find(isVisible) ?? null
  markResponseDialogAnchors(fallback)
}

async function closeResponseDialog() {
  const dialog = findVisibleResponseDialog()
  if (!dialog) return

  findVisibleButton(dialog, 'Cancel')?.click()
  await nextPaint()
  await delay(50)
  markFeedbackAnchors()
}

export function FeedbackWalkthrough({ user }: { user: AuthUser }) {
  const [featureOpen, setFeatureOpen] = useState(false)
  const featureOpenRef = useRef(false)
  const activeTourIdRef = useRef<string | null>(null)
  const tourWasActiveRef = useRef(false)
  const discoveryIntervalRef = useRef<number | null>(null)
  const discoveryTimeoutRef = useRef<number | null>(null)

  const { hydrated, activeTourId, startTour, closeTour } = useWalkthrough()

  const tour = useMemo<WalkthroughTour>(
    () => ({
      id: userScopedTourId('admin-feedback-first-use', user.id),
      version: 1,
      title: 'Feedback guide',
      role: 'ADMIN',
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to Feedback Management',
          description:
            'This inbox contains messages submitted by citizens and workers. The guide explains how to read and answer them, but it will never send a response for you.',
          placement: 'center',
          eyebrow: 'Feedback guide',
        },
        {
          id: 'purpose',
          title: 'Treat every message as a real person asking to be heard',
          description:
            'Read the full message before deciding what it means. Feedback can describe a service problem, question, suggestion, report, compliment, or another concern. Do not dismiss a message only because it is brief or emotional.',
          target: TARGETS.header,
          placement: 'bottom',
          padding: 4,
        },
        {
          id: 'record',
          title: 'Check the status, sender, time, subject, and message',
          description:
            'Each card shows the current status, who sent it, when it was submitted, an optional subject, and the message itself. Confirm you are reading the intended record before responding. If this area says No feedback yet, the inbox is simply empty.',
          target: TARGETS.record,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'status',
          title: 'Know what the current status actually means',
          description:
            'New items normally begin as Submitted. Sending an Admin response changes the item to Reviewed. Although the data model also supports Resolved and Dismissed, this screen currently has no separate buttons for those actions, so Reviewed does not automatically mean the underlying concern is fully resolved.',
          target: TARGETS.record,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'existing-response',
          title: 'An existing Admin response is shown on the card',
          description:
            'Once a response has been saved, the card displays it under Admin response and the Respond button is no longer shown. The current screen does not provide an Edit Response action, so write carefully before sending. If no response exists yet, this step stays on the record as a preview of what will appear later.',
          target: TARGETS.existingResponse,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'respond-action',
          title: 'Respond appears only on unanswered feedback',
          description:
            'Select Respond only after you understand the message and know what you can truthfully say. If all visible feedback already has an Admin response—or the inbox is empty—there is no Respond button to press.',
          target: TARGETS.respondAction,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'dialog',
          title: 'The response window confirms which message you are answering',
          description:
            'When unanswered feedback exists, the guide opens the response window and shows the sender plus a short preview of the message. Recheck that preview before writing. If no unanswered record exists, this explanation remains anchored to the feedback card instead.',
          target: TARGETS.dialog,
          placement: 'auto',
          padding: 4,
          beforeEnter: openResponseDialog,
        },
        {
          id: 'writing',
          title: 'Write a clear, respectful, useful response',
          description:
            'A good response acknowledges the concern, gives only verified information, explains the next step, and says where the person can get further help. Do not expose another person’s private information, make promises you cannot guarantee, or use blaming language.',
          target: TARGETS.responseField,
          placement: 'auto',
          padding: 3,
          beforeEnter: openResponseDialog,
        },
        {
          id: 'send',
          title: 'Send Response saves the message and marks it Reviewed',
          description:
            'Send Response stays disabled until text is entered. When pressed, the system stores the Admin response and response date and changes the status to Reviewed. This guide will not enter text or press Send Response. Cancel closes the window without sending.',
          target: TARGETS.responseActions,
          placement: 'top',
          padding: 3,
          beforeEnter: openResponseDialog,
        },
        {
          id: 'finish',
          title: 'Respond with care, then follow through outside the inbox',
          description:
            'Final check: Did I answer the actual concern? Is every statement accurate? Is the tone respectful? Did I avoid private information? If the issue needs action by another office or field worker, a written response alone is not the same as completing that follow-up.',
          placement: 'center',
          eyebrow: 'Good feedback practice',
          beforeEnter: closeResponseDialog,
        },
      ],
    }),
    [user.id],
  )

  const { start } = useWalkthroughTour(tour)

  useEffect(() => {
    activeTourIdRef.current = activeTourId

    if (activeTourId === tour.id) {
      tourWasActiveRef.current = true
      return
    }

    if (tourWasActiveRef.current) {
      tourWasActiveRef.current = false
      void closeResponseDialog()
    }
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
      const found = markFeedbackAnchors()
      setFeatureState(found)
      if (found) stopDiscovery()
      return found
    }

    const beginDiscovery = () => {
      stopDiscovery()
      clearFeedbackAnchors()
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
      clearFeedbackAnchors()
      setFeatureState(false)
      void closeResponseDialog()

      if (activeTourIdRef.current === tour.id) {
        closeTour()
      }
    }

    const handleNavigationClick = (event: MouseEvent) => {
      const origin = event.target
      if (!(origin instanceof Element)) return

      const navItem = origin.closest<HTMLElement>('[data-tour^="nav-"]')
      if (!navItem) return

      if (navItem.dataset.tour === 'nav-feedback') {
        window.setTimeout(beginDiscovery, 0)
      } else {
        leaveFeature()
      }
    }

    const viewObserver = new MutationObserver(() => {
      if (featureOpenRef.current && !isFeedbackVisible()) {
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
      clearFeedbackAnchors()
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
      if (!markFeedbackAnchors() || !isFeedbackVisible()) {
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
        if (!markFeedbackAnchors() || !isFeedbackVisible()) {
          featureOpenRef.current = false
          setFeatureOpen(false)
          return
        }
        start()
      }}
      aria-label="Open Feedback guide"
      className="fixed bottom-24 right-4 z-40 rounded-full border-emerald-200 bg-white/95 text-emerald-700 shadow-lg backdrop-blur-xl hover:bg-emerald-50 sm:right-6"
    >
      <MessageSquareText className="h-4 w-4" />
      Feedback guide
    </Button>
  )
}
