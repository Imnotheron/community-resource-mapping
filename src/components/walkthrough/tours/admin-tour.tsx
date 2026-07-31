'use client'

import { useEffect, useMemo, useState } from 'react'
import { CircleHelp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  useWalkthrough,
  useWalkthroughTour,
} from '@/components/walkthrough/walkthrough-provider'
import type { WalkthroughTour } from '@/components/walkthrough/types'

export function AdminWalkthrough() {
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
      id: 'admin-first-login',
      version: 1,
      title: 'Administrator guide',
      role: 'ADMIN',
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to the Administrator workspace',
          description:
            'This short guide shows where to review registrations, manage users, coordinate relief work, publish announcements, open reports, and update your account.',
          placement: 'center',
          eyebrow: 'Getting started',
        },
        {
          id: 'workspace-status',
          title: 'Know where you are',
          description:
            'The workspace header shows the section currently open and confirms which administrator account is signed in.',
          target: '.crms-dashboard-theme header',
          placement: 'bottom',
        },
        {
          id: 'navigation',
          title: 'Use the main navigation',
          description:
            'All administrator tools are grouped in this sidebar. The highlighted item is the section you are currently viewing.',
          target: '[data-tour="primary-navigation"]',
          placement: 'right',
          padding: 4,
        },
        {
          id: 'overview',
          title: 'Start with the Overview',
          description:
            'Use the Overview to check important counts, recent activity, alerts, and the community map before opening detailed records.',
          target: '[data-tour="nav-overview"]',
          placement: 'right',
        },
        {
          id: 'approvals',
          title: 'Review pending registrations',
          description:
            'The Approval Center is where vulnerable-citizen applications are checked before approval, correction, verification, or rejection.',
          target: '[data-tour="nav-approval-center"]',
          placement: 'right',
        },
        {
          id: 'users',
          title: 'Manage users and staff',
          description:
            'Open Users to create or manage worker accounts, review account status, and maintain authorized access.',
          target: '[data-tour="nav-users"]',
          placement: 'right',
        },
        {
          id: 'relief',
          title: 'Coordinate relief activity',
          description:
            'Relief Approval contains the tools used to review and coordinate assistance records and distribution work.',
          target: '[data-tour="nav-distributions"]',
          placement: 'right',
        },
        {
          id: 'communication',
          title: 'Publish official updates',
          description:
            'Use Announcements to prepare information for citizens and staff. Avoid including sensitive personal information in messages.',
          target: '[data-tour="nav-announcements"]',
          placement: 'right',
        },
        {
          id: 'map',
          title: 'Review authorized map information',
          description:
            'The Vulnerable Map supports municipal planning. Exact household information should be used only when required for authorized work.',
          target: '[data-tour="nav-map"]',
          placement: 'right',
        },
        {
          id: 'reports',
          title: 'Open reports and printable records',
          description:
            'Daily Reports brings together information intended for review, printing, and operational follow-up.',
          target: '[data-tour="nav-reports"]',
          placement: 'right',
        },
        {
          id: 'profile',
          title: 'Manage your profile and preferences',
          description:
            'Select your profile card to update account information, appearance, interface size, and accessibility preferences.',
          target: '[data-tour="profile-menu"]',
          placement: 'right',
        },
        {
          id: 'restart',
          title: 'Return to this guide at any time',
          description:
            'Use the Guide button whenever you need to restart the Administrator walkthrough. Your completion is saved only in this browser.',
          target: '[data-tour="restart-admin-tour"]',
          placement: 'left',
        },
      ],
    }),
    [],
  )

  const { start } = useWalkthroughTour(tour, {
    autoStart: isDesktop,
  })

  if (!isDesktop || activeTourId) return null

  return (
    <Button
      data-tour="restart-admin-tour"
      type="button"
      variant="outline"
      onClick={start}
      className="fixed bottom-10 right-6 z-40 hidden rounded-full bg-white/95 shadow-lg backdrop-blur-xl xl:inline-flex"
    >
      <CircleHelp className="h-4 w-4" />
      Guide
    </Button>
  )
}
