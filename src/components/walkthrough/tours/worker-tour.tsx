'use client'

import { useEffect, useMemo, useState } from 'react'
import { CircleHelp } from 'lucide-react'

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
import type { WalkthroughStep, WalkthroughTour } from '@/components/walkthrough/types'

function visibleElement(selector: string) {
  return (
    Array.from(document.querySelectorAll<HTMLElement>(selector)).find(
      (element) => {
        const rect = element.getBoundingClientRect()
        const style = window.getComputedStyle(element)
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        )
      },
    ) ?? null
  )
}

async function prepareTarget(selector: string) {
  const target = visibleElement(selector)
  if (!target) return
  target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' })
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve())
    })
  })
}

function desktopNavStep(
  id: string,
  title: string,
  description: string,
): WalkthroughStep {
  const target = `[data-tour="app-sidebar"] [data-tour="nav-${id}"]`
  return {
    id,
    title,
    description,
    target,
    placement: 'right',
    padding: 1,
    beforeEnter: () => prepareTarget(target),
  }
}

function mobileNavStep(
  id: string,
  title: string,
  description: string,
): WalkthroughStep {
  const target = `[data-tour="mobile-nav-${id}"]`
  return {
    id: `mobile-${id}`,
    title,
    description,
    target,
    placement: 'top',
    padding: 2,
    beforeEnter: () => prepareTarget(target),
  }
}

export function WorkerWalkthrough({ user }: { user: AuthUser }) {
  const [isDesktop, setIsDesktop] = useState(false)
  const [layoutReady, setLayoutReady] = useState(false)
  const { activeTourId } = useWalkthrough()

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const update = () => {
      setIsDesktop(media.matches)
      setLayoutReady(true)
    }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const tour = useMemo<WalkthroughTour>(() => {
    const commonStart: WalkthroughStep[] = [
      {
        id: 'welcome',
        title: `Welcome to the Field Worker portal${user.name ? `, ${user.name}` : ''}`,
        description:
          'This guide introduces the pages available to a Field Worker. It will not submit a distribution, register a citizen, create a note, or change any record.',
        placement: 'center',
        eyebrow: 'Worker welcome guide',
      },
      {
        id: 'workspace-status',
        title: 'Confirm the signed-in worker and current page',
        description:
          'The workspace header shows where you are. Before recording field activity, make sure the correct Worker account is signed in so the record is attributed to the right person.',
        target: '.crms-dashboard-theme header',
        placement: 'bottom',
        beforeEnter: () => prepareTarget('.crms-dashboard-theme header'),
      },
    ]

    const desktopSteps: WalkthroughStep[] = [
      {
        id: 'navigation',
        title: 'Use the Worker navigation',
        description:
          'The sidebar separates review pages from actions that create operational records. Read the confirmation and status shown after every submission.',
        target: '[data-tour="app-sidebar"] [data-tour="primary-navigation"]',
        placement: 'right',
        padding: 4,
        beforeEnter: () =>
          prepareTarget('[data-tour="app-sidebar"] [data-tour="primary-navigation"]'),
      },
      desktopNavStep(
        'overview',
        'Start with Overview',
        'Overview summarizes your distribution records, approval statuses, registered-citizen count, recent activity, and shortcuts to common field tasks.',
      ),
      desktopNavStep(
        'my-distributions',
        'Review My Distributions',
        'This page lists distributions recorded under your Worker account. Use the status filter and read any rejection reason before correcting or recording follow-up information.',
      ),
      desktopNavStep(
        'new-distribution',
        'Record a relief distribution carefully',
        'Record Distribution is for an approved citizen. Verify the beneficiary, item description, quantity, and notes before submitting. A new record is sent for Administrator review; recording it does not mean it is already approved.',
      ),
      desktopNavStep(
        'register-vulnerable',
        'Register a vulnerable citizen',
        'Register Citizen opens the full registration workflow. Confirm identity, address, vulnerability information, consent, and supporting details before submission. Never create a duplicate profile just because an existing record is difficult to find.',
      ),
      desktopNavStep(
        'field-notes',
        'Keep useful Field Notes',
        'Field Notes are for factual operational observations and follow-up information. Avoid gossip, guesses, unnecessary medical detail, or information unrelated to authorized municipal work.',
      ),
      desktopNavStep(
        'announcements',
        'Read official Announcements',
        'Announcements contains notices intended for Workers. Check priority, date, location, and instructions before acting, and verify urgent operational details through the proper municipal channel.',
      ),
      desktopNavStep(
        'reports',
        'Review your Daily Report',
        'Daily Reports summarizes your recorded distributions, statuses, quantities, field notes, and assigned activity for a selected date. Verify the source records before printing or signing it.',
      ),
      desktopNavStep(
        'guide',
        'Open the longer User Guide',
        'User Guide provides role-based instructions you can revisit after this short walkthrough.',
      ),
      {
        id: 'profile',
        title: 'Manage account settings separately from citizen records',
        description:
          'Your profile menu updates your Worker account name, phone, photo, password, theme, accent, and interface size. It does not edit a vulnerable citizen registration.',
        target: '[data-tour="app-sidebar"] [data-tour="profile-menu"]',
        placement: 'right',
        beforeEnter: () =>
          prepareTarget('[data-tour="app-sidebar"] [data-tour="profile-menu"]'),
      },
    ]

    const mobileSteps: WalkthroughStep[] = [
      {
        id: 'mobile-navigation',
        title: 'Use the bottom navigation on a phone',
        description:
          'The four most common Worker pages are kept in the bottom bar. Additional pages and account controls are under More.',
        target: '[data-tour="mobile-navigation"]',
        placement: 'top',
        padding: 2,
        beforeEnter: () => prepareTarget('[data-tour="mobile-navigation"]'),
      },
      mobileNavStep(
        'overview',
        'Overview',
        'Check your counts, recent distributions, and common field-task shortcuts here.',
      ),
      mobileNavStep(
        'my-distributions',
        'History',
        'Review only the distributions recorded under your Worker account and check their current approval status.',
      ),
      mobileNavStep(
        'new-distribution',
        'Distribute',
        'Record assistance for the correct approved beneficiary. Submission creates a record for Administrator review; it is not automatically approved.',
      ),
      mobileNavStep(
        'register-vulnerable',
        'Register',
        'Use the full citizen-registration workflow and verify the information before submitting it.',
      ),
      {
        id: 'mobile-more',
        title: 'Open More for the remaining Worker pages',
        description:
          'More contains Field Notes, Announcements, Daily Reports, User Guide, Profile & Settings, and Sign out. The guide does not open the sheet automatically, so you stay in control of the screen.',
        target: '[data-tour="mobile-nav-more"]',
        placement: 'top',
        padding: 2,
        beforeEnter: () => prepareTarget('[data-tour="mobile-nav-more"]'),
      },
    ]

    return {
      id: userScopedTourId('worker-first-login', user.id),
      version: 1,
      title: 'Field Worker guide',
      role: 'WORKER',
      steps: [
        ...commonStart,
        ...(isDesktop ? desktopSteps : mobileSteps),
        {
          id: 'finish',
          title: 'Verify first, record second',
          description:
            'Before finishing any field task, confirm the person, date, items, quantity, location, consent, and account attribution. A clean record is more useful than a fast but uncertain one.',
          placement: 'center',
          eyebrow: 'Good field practice',
        },
      ],
    }
  }, [isDesktop, user.id, user.name])

  const { start } = useWalkthroughTour(tour, {
    autoStart: layoutReady && isNewWalkthroughAccount(user.createdAt),
  })

  if (!layoutReady) return null

  return (
    <Button
      data-tour="restart-worker-tour"
      type="button"
      variant="outline"
      onClick={start}
      disabled={Boolean(activeTourId)}
      aria-label="Open Field Worker guide"
      className="fixed bottom-24 right-4 z-40 rounded-full bg-white/95 shadow-lg backdrop-blur-xl md:bottom-10 md:right-6"
    >
      <CircleHelp className="h-4 w-4" />
      Worker guide
    </Button>
  )
}
