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

function sidebarTarget(id: string) {
  return `[data-tour="app-sidebar"] [data-tour="nav-${id}"]`
}

function visibleElement(selector: string) {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector))

  return (
    elements.find((element) => {
      const rect = element.getBoundingClientRect()
      const styles = window.getComputedStyle(element)

      return (
        rect.width > 0 &&
        rect.height > 0 &&
        styles.display !== 'none' &&
        styles.visibility !== 'hidden'
      )
    }) ?? null
  )
}

async function prepareTarget(selector: string) {
  const target = visibleElement(selector)
  if (!target) return

  target.scrollIntoView({
    behavior: 'auto',
    block: 'center',
    inline: 'nearest',
  })

  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve())
    })
  })
}

function navStep(
  id: string,
  title: string,
  description: string,
): WalkthroughStep {
  const target = sidebarTarget(id)

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

export function AdminWalkthrough({ user }: { user: AuthUser }) {
  const [isDesktop, setIsDesktop] = useState(false)
  const [layoutReady, setLayoutReady] = useState(false)
  const { activeTourId } = useWalkthrough()

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)')
    const update = () => {
      setIsDesktop(media.matches)
      setLayoutReady(true)
    }

    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const tour = useMemo<WalkthroughTour>(
    () => ({
      id: userScopedTourId('admin-first-login', user.id),
      version: 4,
      title: 'Administrator guide',
      role: 'ADMIN',
      steps: [
        {
          id: 'welcome',
          title: `Welcome to CRMS${user.name ? `, ${user.name}` : ''}`,
          description:
            'This welcome guide is shown automatically only to newly created accounts. It introduces every Administrator section in the same order it appears in the sidebar. You can skip it now and reopen it later with the Guide button.',
          placement: 'center',
          eyebrow: 'Welcome guide',
        },
        {
          id: 'workspace-status',
          title: 'Know where you are',
          description:
            'The workspace header names the section currently open and confirms which Administrator account is signed in.',
          target: (isDesktop ? '[data-tour="workspace-desktop-header"]' : '[data-tour="workspace-mobile-header"]'),
          placement: 'bottom',
          beforeEnter: () => prepareTarget((isDesktop ? '[data-tour="workspace-desktop-header"]' : '[data-tour="workspace-mobile-header"]')),
        },
        ...(isDesktop ? [{
          id: 'navigation',
          title: 'Use the Administrator navigation',
          description:
            'The sidebar is the main control center. The guide now follows its exact order so the highlighted item always matches the explanation you are reading.',
          target: '[data-tour="app-sidebar"] [data-tour="primary-navigation"]',
          placement: 'right',
          padding: 4,
          beforeEnter: () =>
            prepareTarget('[data-tour="app-sidebar"] [data-tour="primary-navigation"]'),
        },
        navStep(
          'overview',
          'Start with Overview',
          'Overview summarizes important counts, recent activity, alerts, and the community map so you can see what needs attention first.',
        ),
        navStep(
          'registrations',
          'Open Vulnerable Registrations',
          'Registrations is the only registration-approval queue. Review pending citizen records, approve or reject them, and register a vulnerable person when an authorized Administrator needs to encode a record directly.',
        ),
        navStep(
          'users',
          'Manage users and staff',
          'Users is where Administrator, Worker, and Vulnerable accounts can be reviewed and where authorized staff accounts can be created or managed.',
        ),
        navStep(
          'distributions',
          'Review Relief Approval',
          'Relief Approval is the only relief-distribution approval queue. Open View to confirm the beneficiary vulnerability, distributed items, quantity, and supporting photos before approving or rejecting.',
        ),
        navStep(
          'history',
          'Review Operations History',
          'Operations History brings relief records and municipal events into one review workspace. Use its search, type, barangay, status, audience, and date filters to trace past activity before reports, audits, follow-up, or planning.',
        ),
        navStep(
          'announcements',
          'Publish official Announcements',
          'Announcements is used for municipal notices, relief updates, reminders, and other approved communications. Avoid including sensitive personal information in public notices.',
        ),
        navStep(
          'feedback',
          'Respond to Feedback',
          'Feedback shows messages submitted by citizens and workers. Review the concern, provide an appropriate response, and track items that still need attention.',
        ),
        navStep(
          'analytics',
          'Use Analytics for decision support',
          'Analytics summarizes registration demand, relief activity, vulnerability patterns, distribution types, and feedback. Use the values and legends together rather than relying on color alone.',
        ),
        navStep(
          'map',
          'Review the Vulnerable Map carefully',
          'The Vulnerable Map supports authorized municipal planning and relief coordination. Exact household information should be opened only when it is required for legitimate work.',
        ),
        navStep(
          'reports',
          'Open Daily Reports and printable records',
          'Daily Reports has two sections: Daily Operations Reports for general activity, and Relief Reports for requesting date-range relief summaries, filtering beneficiaries and goods, printing, or exporting CSV.',
        ),
        navStep(
          'guide',
          'Open the full User Guide',
          'User Guide contains longer role-based instructions you can return to after the short walkthrough is finished.',
        ),
        {
          id: 'profile',
          title: 'Manage your profile and preferences',
          description:
            'Select your profile card to update account information, appearance, interface size, and accessibility preferences.',
          target: '[data-tour="app-sidebar"] [data-tour="profile-menu"]',
          placement: 'right',
          beforeEnter: () =>
            prepareTarget('[data-tour="app-sidebar"] [data-tour="profile-menu"]'),
        },
        ] : [
          {
            id: 'mobile-navigation',
            title: 'Use the four main Administrator shortcuts',
            description:
              'The bottom bar shows Overview, Vulnerable Registrations, Users, and Relief Approval. All remaining tools are in More.',
            target: '[data-tour="mobile-navigation"]',
            placement: 'top',
            beforeEnter: () => prepareTarget('[data-tour="mobile-navigation"]'),
          },
          ...[
            ['overview', 'Overview', 'Review the municipal dashboard and alerts.'],
            ['registrations', 'Vulnerable Registrations', 'Review registration approvals and register verified citizens.'],
            ['users', 'Users', 'Manage Administrator, Worker, and Vulnerable accounts.'],
            ['distributions', 'Relief Approval', 'Review beneficiaries, types, vulnerabilities, supporting photos and pending approvals.'],
          ].map(([id, title, description]) => ({
            id: `mobile-${id}`,
            title,
            description,
            target: `[data-tour="mobile-nav-${id}"]`,
            placement: 'top' as const,
            beforeEnter: () => prepareTarget(`[data-tour="mobile-nav-${id}"]`),
          })),
          {
            id: 'mobile-more',
            title: 'Find the other Administrator tools in More',
            description:
              'More includes Operations History, Announcements, Feedback, Analytics, Vulnerable Map, Daily Reports, User Guide, your profile, and Sign out. Open the sheet yourself when you are ready; this tour does not click for you.',
            target: '[data-tour="mobile-nav-more"]',
            placement: 'top',
            beforeEnter: () => prepareTarget('[data-tour="mobile-nav-more"]'),
          },
        ]),
        {
          id: 'restart',
          title: 'Return to the guide whenever you need it',
          description:
            'The welcome tour is automatic only for newly created accounts. You can replay it with this Guide button on mobile or desktop.',
          target: '[data-tour="restart-admin-tour"]',
          placement: 'left',
          beforeEnter: () => prepareTarget('[data-tour="restart-admin-tour"]'),
        },
      ],
    }),
    [isDesktop, user.id, user.name],
  )

  const autoStart = layoutReady && isNewWalkthroughAccount(user.createdAt)
  const { start } = useWalkthroughTour(tour, { autoStart })

  if (!layoutReady) return null

  return (
    <Button
      data-tour="restart-admin-tour"
      type="button"
      variant="outline"
      onClick={start}
      disabled={Boolean(activeTourId)}
      aria-label="Open Administrator guide"
      className="fixed bottom-24 right-4 z-40 inline-flex rounded-full bg-white/95 shadow-lg backdrop-blur-xl xl:bottom-10 xl:right-6"
    >
      <CircleHelp className="h-4 w-4" />
      Guide
    </Button>
  )
}
