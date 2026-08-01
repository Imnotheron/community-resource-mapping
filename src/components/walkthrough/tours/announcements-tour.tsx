'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Megaphone } from 'lucide-react'

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

const ANCHOR_ATTRIBUTE = 'data-announcement-tour-anchor'
const DELETE_FALLBACK_ATTRIBUTE = 'data-announcement-delete-fallback'
const DISCOVERY_INTERVAL_MS = 150
const DISCOVERY_TIMEOUT_MS = 12_000

const TARGETS = {
  header: '[data-tour="announcement-feature-header"]',
  controls: '[data-tour="announcement-feature-controls"]',
  summary: '[data-tour="announcement-summary"]',
  list: '[data-tour="announcement-published-list"]',
  form: '[data-tour="announcement-create-form"]',
  message: '[data-tour="announcement-message-fields"]',
  classification: '[data-tour="announcement-classification-fields"]',
  event: '[data-tour="announcement-event-fields"]',
  publish: '[data-tour="announcement-publish-button"]',
  deletion:
    '[data-tour="announcement-delete-action"], [data-announcement-delete-fallback="true"]',
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

function clearAnnouncementAnchors() {
  document
    .querySelectorAll<HTMLElement>(`[${ANCHOR_ATTRIBUTE}="true"]`)
    .forEach((element) => {
      element.removeAttribute('data-tour')
      element.removeAttribute(ANCHOR_ATTRIBUTE)
    })

  document
    .querySelectorAll<HTMLElement>(`[${DELETE_FALLBACK_ATTRIBUTE}="true"]`)
    .forEach((element) => {
      element.removeAttribute(DELETE_FALLBACK_ATTRIBUTE)
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

function findVisibleButton(root: ParentNode, labels: string[]) {
  return (
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) =>
        isVisible(button) && labels.includes(normalizedText(button.textContent)),
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

function findAnnouncementHeading() {
  return findVisibleExact<HTMLHeadingElement>(document, 'h1', 'Announcements')
}

function isAnnouncementsVisible() {
  return Boolean(findAnnouncementHeading())
}

function findAnnouncementCard(deleteButton: HTMLButtonElement) {
  let candidate: HTMLElement | null = deleteButton.parentElement
  let depth = 0

  while (candidate && depth <= 6) {
    if (candidate.querySelector('h3') && candidate.contains(deleteButton)) {
      return candidate
    }
    candidate = candidate.parentElement
    depth += 1
  }

  return deleteButton.parentElement
}

function findMainEmptyState(featureRoot: HTMLElement) {
  const description = findVisibleExact<HTMLElement>(
    featureRoot,
    'p',
    'Publish your first notice to inform workers and citizens about municipal updates.',
  )

  if (!description) return null

  let candidate: HTMLElement | null = description.parentElement
  let depth = 0

  while (candidate && depth <= 5) {
    if (findVisibleButton(candidate, ['Create Announcement'])) {
      return candidate
    }
    candidate = candidate.parentElement
    depth += 1
  }

  return null
}

/**
 * Announcements is rendered as an Admin dashboard view, not a separate route.
 * This adapter discovers the visible feature and temporarily marks its real UI
 * sections without changing form values, publishing, or deleting anything.
 */
function markAnnouncementAnchors() {
  clearAnnouncementAnchors()

  const heading = findAnnouncementHeading()
  if (!heading) return false

  const headingBlock = ancestorContaining(heading, [
    'Announcements',
    'Publish official notices, emergency advisories, meeting reminders, and relief updates.',
  ])
  if (!headingBlock) return false

  const header =
    headingBlock.parentElement instanceof HTMLElement
      ? headingBlock.parentElement
      : headingBlock
  const featureRoot =
    header.parentElement instanceof HTMLElement ? header.parentElement : header

  const refresh = findVisibleButton(header, ['Refresh'])
  const toggle = findVisibleButton(header, ['New Announcement', 'View List'])
  const controls =
    refresh && toggle ? lowestCommonAncestor([refresh, toggle]) : toggle ?? refresh

  const publishedLabel = findVisibleExact<HTMLElement>(
    featureRoot,
    'p',
    'Published',
  )
  const priorityLabel = findVisibleExact<HTMLElement>(
    featureRoot,
    'p',
    'High priority',
  )
  const audienceLabel = findVisibleExact<HTMLElement>(
    featureRoot,
    'p',
    'Audience reach',
  )
  const summary =
    publishedLabel && priorityLabel && audienceLabel
      ? lowestCommonAncestor([publishedLabel, priorityLabel, audienceLabel])
      : null

  const form = Array.from(
    featureRoot.querySelectorAll<HTMLElement>(TARGETS.form),
  ).find(isVisible) ?? null

  const loadingText = Array.from(
    featureRoot.querySelectorAll<HTMLElement>('span, p'),
  ).some((element) => {
    if (!isVisible(element)) return false
    const text = normalizedText(element.textContent)
    return text === 'Loading announcements...' || text === 'Loading announcements'
  })

  const deleteButtons = Array.from(
    featureRoot.querySelectorAll<HTMLButtonElement>(
      'button[aria-label^="Delete announcement "]',
    ),
  ).filter(isVisible)

  const announcementCards = deleteButtons
    .map(findAnnouncementCard)
    .filter((card): card is HTMLElement => card instanceof HTMLElement)

  const cardList =
    announcementCards.length > 0
      ? lowestCommonAncestor(announcementCards)
      : null

  const mainEmptyState = findMainEmptyState(featureRoot)

  const loadErrorMessage = findVisibleExact<HTMLElement>(
    featureRoot,
    'p',
    'Announcements could not load.',
  )
  const errorState = loadErrorMessage
    ? ancestorContaining(loadErrorMessage, ['Try again'], 5)
    : null

  const featuredHeading = findVisibleExact<HTMLElement>(
    featureRoot,
    'h3',
    'Featured Announcements',
  )
  const featuredArea =
    featuredHeading?.parentElement?.parentElement instanceof HTMLElement
      ? featuredHeading.parentElement.parentElement
      : featuredHeading

  const publishedList = cardList ?? mainEmptyState ?? errorState ?? featuredArea

  // Wait for either the actual form or a final list/empty/error state. This
  // prevents the guide from attaching to temporary loading placeholders.
  if (!controls || !summary || (!form && (loadingText || !publishedList))) {
    clearAnnouncementAnchors()
    return false
  }

  setAnchor(header, 'announcement-feature-header')
  setAnchor(controls, 'announcement-feature-controls')
  setAnchor(summary, 'announcement-summary')

  if (publishedList) {
    setAnchor(publishedList, 'announcement-published-list')
  }

  const deleteAction = deleteButtons[0] ?? null
  if (deleteAction) {
    setAnchor(deleteAction, 'announcement-delete-action')
  } else if (publishedList) {
    publishedList.setAttribute(DELETE_FALLBACK_ATTRIBUTE, 'true')
  }

  return true
}

async function showAnnouncementForm() {
  if (!isAnnouncementsVisible()) return

  const heading = findAnnouncementHeading()
  const featureRoot = heading?.parentElement?.parentElement?.parentElement ?? document
  const form = Array.from(
    document.querySelectorAll<HTMLElement>(TARGETS.form),
  ).find(isVisible)

  if (!form) {
    findVisibleButton(featureRoot, ['New Announcement', 'Create Announcement'])?.click()
    await nextPaint()
    await delay(80)
  }

  markAnnouncementAnchors()
}

async function showAnnouncementList() {
  if (!isAnnouncementsVisible()) return

  const heading = findAnnouncementHeading()
  const featureRoot = heading?.parentElement?.parentElement?.parentElement ?? document
  findVisibleButton(featureRoot, ['View List'])?.click()
  await nextPaint()
  await delay(80)
  markAnnouncementAnchors()
}

export function AnnouncementsWalkthrough({ user }: { user: AuthUser }) {
  const [featureOpen, setFeatureOpen] = useState(false)
  const featureOpenRef = useRef(false)
  const activeTourIdRef = useRef<string | null>(null)
  const discoveryIntervalRef = useRef<number | null>(null)
  const discoveryTimeoutRef = useRef<number | null>(null)

  const { hydrated, activeTourId, startTour, closeTour } = useWalkthrough()

  const tour = useMemo<WalkthroughTour>(
    () => ({
      id: userScopedTourId('admin-announcements-first-use', user.id),
      version: 1,
      title: 'Announcements guide',
      role: 'ADMIN',
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to Announcements',
          description:
            'Announcements is where an Administrator publishes official notices for selected system users. This walkthrough explains the full process, but it will never publish or delete a notice for you.',
          placement: 'center',
          eyebrow: 'Announcements guide',
        },
        {
          id: 'purpose',
          title: 'Use this page only for official communication',
          description:
            'Use Announcements for verified municipal notices, emergency advisories, meeting reminders, and relief updates. Do not include private household details, medical information, passwords, or anything the selected audience should not receive.',
          target: TARGETS.header,
          placement: 'bottom',
          padding: 4,
        },
        {
          id: 'page-controls',
          title: 'Refresh the list or start a new notice',
          description:
            'Refresh loads the latest active notices. New Announcement opens the publishing form. While the form is open, the same button becomes View List so you can return without publishing.',
          target: TARGETS.controls,
          placement: 'left',
          padding: 3,
        },
        {
          id: 'summary',
          title: 'Check what is currently published',
          description:
            'Published counts active notices. High priority counts High and Urgent notices. Audience reach summarizes how many active notices are intended for workers and vulnerable citizens. These are notice counts, not the number of people who actually read them.',
          target: TARGETS.summary,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'published-list',
          title: 'Review the active notice before creating another',
          description:
            'The featured area and published list show active announcements, including type, priority, intended audience, message, event details, location, and publication time. Admins can review all active notices even when a notice targets a specific role. An empty state simply means no active notices are available.',
          target: TARGETS.list,
          placement: 'auto',
          padding: 3,
          beforeEnter: showAnnouncementList,
        },
        {
          id: 'open-form',
          title: 'Open the New Announcement form',
          description:
            'The walkthrough opens the form for teaching only. Nothing is sent until a user deliberately completes the required fields and presses Publish Announcement.',
          target: TARGETS.form,
          placement: 'auto',
          padding: 4,
          beforeEnter: showAnnouncementForm,
        },
        {
          id: 'message',
          title: 'Write a clear title and complete message',
          description:
            'Use a title that tells people what the notice is about. In the content, explain what happened, who is affected, what action is required, and where users can get verified help. The form requires at least 5 characters for the title and 10 for the message.',
          target: TARGETS.message,
          placement: 'auto',
          padding: 3,
          beforeEnter: showAnnouncementForm,
        },
        {
          id: 'classification',
          title: 'Choose the type, priority, and audience carefully',
          description:
            'Type describes the notice, such as General, Relief Distribution, Meeting, Emergency, or Important. Priority affects visibility and ordering; reserve Urgent for genuinely time-sensitive information. Audience decides whether the notice is intended for all roles, Admins, Workers, or Vulnerable users.',
          target: TARGETS.classification,
          placement: 'auto',
          padding: 3,
          beforeEnter: showAnnouncementForm,
        },
        {
          id: 'event-details',
          title: 'Add event details only when they apply',
          description:
            'Date, time, and location are optional. Use them for meetings, distribution schedules, evacuation instructions, or other events. Check the date, time, venue, and spelling before publishing because users may rely on this information to travel or respond.',
          target: TARGETS.event,
          placement: 'auto',
          padding: 3,
          beforeEnter: showAnnouncementForm,
        },
        {
          id: 'publish',
          title: 'Publishing can notify many people',
          description:
            'Publish Announcement saves the notice, creates in-app notifications for the intended audience, and normally attempts email delivery when email is configured. Publication can succeed even when some email delivery is skipped or fails, so do not assume every recipient received an email merely because the notice appears in the list. This guide will not press Publish.',
          target: TARGETS.publish,
          placement: 'top',
          padding: 3,
          beforeEnter: showAnnouncementForm,
        },
        {
          id: 'deletion',
          title: 'Deleting removes the notice from the active list',
          description:
            'Return to the list to manage published notices. The trash action opens a confirmation and marks the notice inactive, removing it from normal published views. It does not edit the message, and the current Announcements screen has no Edit action. If there is no notice yet, no trash button is shown.',
          target: TARGETS.deletion,
          placement: 'auto',
          padding: 3,
          beforeEnter: showAnnouncementList,
        },
        {
          id: 'finish',
          title: 'Read it once as the recipient before publishing',
          description:
            'Final check: Is the message official and accurate? Is the audience correct? Is the priority justified? Are the date, time, and location correct? Does it avoid private information? Publish only when every answer is yes.',
          placement: 'center',
          eyebrow: 'Good communication practice',
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
      const found = markAnnouncementAnchors()
      setFeatureState(found)
      if (found) stopDiscovery()
      return found
    }

    const beginDiscovery = () => {
      stopDiscovery()
      clearAnnouncementAnchors()
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
      clearAnnouncementAnchors()
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

      if (navItem.dataset.tour === 'nav-announcements') {
        window.setTimeout(beginDiscovery, 0)
      } else {
        leaveFeature()
      }
    }

    const handleFeatureClick = (event: MouseEvent) => {
      const origin = event.target
      if (!(origin instanceof Element) || !featureOpenRef.current) return

      const button = origin.closest<HTMLButtonElement>('button')
      if (!button) return

      const label = normalizedText(button.textContent)
      if (
        ['New Announcement', 'View List', 'Create Announcement', 'Refresh', 'Try again'].includes(
          label,
        )
      ) {
        window.setTimeout(beginDiscovery, 80)
      }
    }

    const viewObserver = new MutationObserver(() => {
      if (featureOpenRef.current && !isAnnouncementsVisible()) {
        leaveFeature()
      }
    })

    document.addEventListener('click', handleNavigationClick, true)
    document.addEventListener('click', handleFeatureClick, true)
    viewObserver.observe(document.body, { childList: true, subtree: true })

    discover()

    return () => {
      document.removeEventListener('click', handleNavigationClick, true)
      document.removeEventListener('click', handleFeatureClick, true)
      viewObserver.disconnect()
      stopDiscovery()
      clearAnnouncementAnchors()
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
      if (!markAnnouncementAnchors() || !isAnnouncementsVisible()) {
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
        void showAnnouncementList().then(() => {
          if (!isAnnouncementsVisible()) {
            featureOpenRef.current = false
            setFeatureOpen(false)
            return
          }
          start()
        })
      }}
      aria-label="Open Announcements guide"
      className="fixed bottom-24 right-4 z-40 rounded-full border-cyan-200 bg-white/95 text-cyan-700 shadow-lg backdrop-blur-xl hover:bg-cyan-50 sm:right-6"
    >
      <Megaphone className="h-4 w-4" />
      Announcements guide
    </Button>
  )
}
