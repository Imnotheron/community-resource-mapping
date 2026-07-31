'use client'

import { useEffect, useMemo, useState } from 'react'
import { CircleHelp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { AuthUser } from '@/lib/api-client'
import {
  useWalkthrough,
  useWalkthroughTour,
} from '@/components/walkthrough/walkthrough-provider'
import type { WalkthroughStep, WalkthroughTour } from '@/components/walkthrough/types'

const WALKTHROUGH_ROLLOUT_AT = Date.parse('2026-07-31T00:00:00.000Z')

function isNewWalkthroughAccount(createdAt?: string | null) {
  if (!createdAt) return false

  const created = Date.parse(createdAt)
  return Number.isFinite(created) && created >= WALKTHROUGH_ROLLOUT_AT
}

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
    padding: 5,
    beforeEnter: () => prepareTarget(target),
  }
}

export function AdminWalkthrough({ user }: { user: AuthUser }) {
  const [isDesktop, setIsDesktop] = useState(false)
  const { activeTourId } = useWalkthrough()

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)')
    const update = () => setIsDesktop(media.matches)

    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const tour = useMemo<WalkthroughTour>(
    () => ({
      id: `admin-first-login:${user.id}`,
      version: 2,
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
          target: '.crms-dashboard-theme header',
          placement: 'bottom',
          beforeEnter: () => prepareTarget('.crms-dashboard-theme header'),
        },
        {
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
          'approval-center',
          'Review applications in Approval Center',
          'Approval Center is the main queue for checking vulnerable-citizen applications before approval, correction, verification, or rejection.',
        ),
        navStep(
          'registrations',
          'Open Vulnerable Registrations',
          'Registrations lets you review submitted citizen records and register a vulnerable person when an authorized Administrator needs to encode the record directly.',
        ),
        navStep(
          'users',
          'Manage users and staff',
          'Users is where Administrator, Worker, and Vulnerable accounts can be reviewed and where authorized staff accounts can be created or managed.',
        ),
        navStep(
          'distributions',
          'Review Relief Approval',
          'Relief Approval contains distribution records submitted by field workers. Review the beneficiary, items, quantity, date, and notes before approving or rejecting a record.',
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
          'Daily Reports brings together information intended for review, printing, and operational follow-up. This step now targets the Daily Reports item itself, not the map item above it.',
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
        {
          id: 'restart',
          title: 'Return to the guide whenever you need it',
          description:
            'The automatic welcome guide is for new accounts only. Existing users are not interrupted, but anyone can use this Guide button to start the Administrator walkthrough manually.',
          target: '[data-tour="restart-admin-tour"]',
          placement: 'left',
          beforeEnter: () => prepareTarget('[data-tour="restart-admin-tour"]'),
        },
      ],
    }),
    [user.id, user.name],
  )

  const autoStart = isDesktop && isNewWalkthroughAccount(user.createdAt)
  const { start } = useWalkthroughTour(tour, { autoStart })

  if (!isDesktop) return null

  return (
    <Button
      data-tour="restart-admin-tour"
      type="button"
      variant="outline"
      onClick={start}
      disabled={Boolean(activeTourId)}
      aria-label="Open Administrator guide"
      className="fixed bottom-10 right-6 z-40 hidden rounded-full bg-white/95 shadow-lg backdrop-blur-xl xl:inline-flex"
    >
      <CircleHelp className="h-4 w-4" />
      Guide
    </Button>
  )
}