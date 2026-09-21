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

export function VulnerableWalkthrough({ user }: { user: AuthUser }) {
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
        title: `Welcome to your CRMS assistance portal${user.name ? `, ${user.name}` : ''}`,
        description:
          'This guide explains the pages available to a Vulnerable Citizen account. It will not change your registration, send feedback, or request relief automatically.',
        placement: 'center',
        eyebrow: 'Citizen welcome guide',
      },
      {
        id: 'workspace-status',
        title: 'Confirm your account before viewing personal information',
        description:
          'The workspace header identifies the signed-in account and current page. On a shared device, sign out when finished so another person cannot see your profile, assistance history, or messages.',
        target: '.crms-dashboard-theme header',
        placement: 'bottom',
        beforeEnter: () => prepareTarget('.crms-dashboard-theme header'),
      },
    ]

    const desktopSteps: WalkthroughStep[] = [
      {
        id: 'navigation',
        title: 'Use the Citizen navigation',
        description:
          'The sidebar separates your registration record, relief history, feedback, and official announcements. These pages are mostly for viewing information already recorded in CRMS.',
        target: '[data-tour="app-sidebar"] [data-tour="primary-navigation"]',
        placement: 'right',
        padding: 4,
        beforeEnter: () =>
          prepareTarget('[data-tour="app-sidebar"] [data-tour="primary-navigation"]'),
      },
      desktopNavStep(
        'overview',
        'Start with Overview',
        'Overview shows your registration status, relief-record counts, recent relief entries, and latest announcements. Counts summarize records in CRMS and may not describe every real-world follow-up.',
      ),
      desktopNavStep(
        'my-profile',
        'Review My Profile',
        'My Profile shows the vulnerable-citizen registration information on file, including status, contact details, address, vulnerability information, emergency contact, and saved location. This page is read-only; contact authorized staff when information needs correction.',
      ),
      desktopNavStep(
        'relief-history',
        'Check Relief History',
        'Relief History lists assistance records connected to your profile and shows their current status. Pending means the record is still under review; Rejected means it was not approved as recorded.',
      ),
      desktopNavStep(
        'feedback',
        'Send Feedback or ask for follow-up',
        'Feedback is for concerns, suggestions, and service-related messages. Write only the information needed to understand the issue. For an immediate emergency, use the appropriate local emergency channel instead of waiting for a dashboard response.',
      ),
      desktopNavStep(
        'announcements',
        'Read official Announcements',
        'Announcements contains notices intended for citizens. Check the priority, date, time, location, and instructions, and confirm urgent information through official municipal contacts when necessary.',
      ),
      desktopNavStep(
        'guide',
        'Open the longer User Guide',
        'User Guide contains role-based instructions you can return to after the short walkthrough.',
      ),
      {
        id: 'profile-settings',
        title: 'Account settings are different from My Profile',
        description:
          'The profile menu changes your account name, phone, photo, password, theme, accent, and interface size. It does not edit the vulnerable-citizen registration shown under My Profile.',
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
          'Your four most-used pages are in the bottom bar. Announcements, User Guide, Profile & Settings, and Sign out are under More.',
        target: '[data-tour="mobile-navigation"]',
        placement: 'top',
        padding: 2,
        beforeEnter: () => prepareTarget('[data-tour="mobile-navigation"]'),
      },
      mobileNavStep(
        'overview',
        'Overview',
        'Check your registration status, recent relief records, and latest notices here.',
      ),
      mobileNavStep(
        'my-profile',
        'My Profile',
        'Review the vulnerable-citizen registration information on file. Contact authorized staff when the record needs correction.',
      ),
      mobileNavStep(
        'relief-history',
        'Relief',
        'Review assistance records and their current Pending, Approved, or Rejected status.',
      ),
      mobileNavStep(
        'feedback',
        'Feedback',
        'Send a service-related concern or suggestion. Do not use this page as a substitute for an emergency contact.',
      ),
      {
        id: 'mobile-more',
        title: 'Open More for announcements and account controls',
        description:
          'More contains Announcements, User Guide, Profile & Settings, and Sign out. The guide leaves the sheet closed so it does not cover the walkthrough controls.',
        target: '[data-tour="mobile-nav-more"]',
        placement: 'top',
        padding: 2,
        beforeEnter: () => prepareTarget('[data-tour="mobile-nav-more"]'),
      },
    ]

    return {
      id: userScopedTourId('vulnerable-first-login', user.id),
      version: 1,
      title: 'Vulnerable Citizen guide',
      role: 'VULNERABLE',
      steps: [
        ...commonStart,
        ...(isDesktop ? desktopSteps : mobileSteps),
        {
          id: 'finish',
          title: 'Review your information and protect your account',
          description:
            'Check that your registration details and contact information are current, read the status shown on each relief record, and sign out on shared devices. Ask authorized staff when something in the official registration needs correction.',
          placement: 'center',
          eyebrow: 'Good account practice',
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
      data-tour="restart-vulnerable-tour"
      type="button"
      variant="outline"
      onClick={start}
      disabled={Boolean(activeTourId)}
      aria-label="Open Vulnerable Citizen guide"
      className="fixed bottom-24 right-4 z-40 rounded-full bg-white/95 shadow-lg backdrop-blur-xl md:bottom-10 md:right-6"
    >
      <CircleHelp className="h-4 w-4" />
      Citizen guide
    </Button>
  )
}
