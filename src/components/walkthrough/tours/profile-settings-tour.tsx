'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Settings2 } from 'lucide-react'

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
import type {
  WalkthroughRole,
  WalkthroughTour,
} from '@/components/walkthrough/types'

const ANCHOR = 'data-profile-settings-tour-anchor'
const DISCOVERY_INTERVAL_MS = 150
const DISCOVERY_TIMEOUT_MS = 12_000

const TARGETS = {
  header: '[data-tour="profile-settings-header"]',
  back: '[data-tour="profile-settings-back"]',
  account: '[data-tour="profile-settings-account"]',
  photo: '[data-tour="profile-settings-photo"]',
  identity: '[data-tour="profile-settings-identity"]',
  appearance: '[data-tour="profile-settings-appearance"]',
  theme: '[data-tour="profile-settings-theme"]',
  accent: '[data-tour="profile-settings-accent"]',
  size: '[data-tour="profile-settings-size"]',
  security: '[data-tour="profile-settings-security"]',
  actions: '[data-tour="profile-settings-actions"]',
  save: '[data-tour="profile-settings-save"]',
} as const

function roleOf(user: AuthUser): WalkthroughRole {
  if (user.role === 'admin') return 'ADMIN'
  if (user.role === 'worker') return 'WORKER'
  return 'VULNERABLE'
}

function text(value: string | null | undefined) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function visible(element: HTMLElement) {
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

function exact<T extends HTMLElement>(
  root: ParentNode,
  selector: string,
  value: string,
) {
  return (
    Array.from(root.querySelectorAll<T>(selector)).find(
      (element) => visible(element) && text(element.textContent) === value,
    ) ?? null
  )
}

function button(root: ParentNode, value: string) {
  return exact<HTMLButtonElement>(root, 'button', value)
}

function ancestor(
  start: HTMLElement | null,
  evidence: string[],
  limit = 8,
) {
  let current = start
  let depth = 0

  while (current && depth <= limit) {
    const content = text(current.textContent)
    if (evidence.every((item) => content.includes(item))) return current
    current = current.parentElement
    depth += 1
  }

  return null
}

function clearAnchors() {
  document
    .querySelectorAll<HTMLElement>(`[${ANCHOR}="true"]`)
    .forEach((element) => {
      element.removeAttribute('data-tour')
      element.removeAttribute(ANCHOR)
    })
}

function mark(element: HTMLElement | null, name: string) {
  if (!element) return false
  element.setAttribute('data-tour', name)
  element.setAttribute(ANCHOR, 'true')
  return true
}

function heading() {
  return exact<HTMLHeadingElement>(document, 'h1', 'Profile & Settings')
}

function profileVisible() {
  return Boolean(heading())
}

function card(root: ParentNode, title: string) {
  return (
    exact<HTMLElement>(
      root,
      '[data-slot="card-title"], h2, h3',
      title,
    )?.closest<HTMLElement>('[data-slot="card"]') ?? null
  )
}

function labelledSection(
  root: ParentNode,
  label: string,
  evidence: string[],
) {
  const labelElement = exact<HTMLElement>(root, 'label', label)
  return labelElement
    ? ancestor(labelElement, [label, ...evidence], 4)
    : null
}

function markProfileAnchors() {
  clearAnchors()

  const title = heading()
  if (!title) return false

  const header = ancestor(title, [
    'Profile & Settings',
    'Preview your edits, then save everything once at the bottom.',
  ], 3)
  const root = ancestor(header, [
    'Account',
    'Appearance',
    'Security',
    'Save Changes',
  ], 5)
  if (!header || !root) return false

  const back = button(root, 'Back to Dashboard')
  const account = card(root, 'Account')
  const appearance = card(root, 'Appearance')
  const security = card(root, 'Security')
  const choosePhoto = button(account ?? root, 'Choose photo')
  const removePhoto = button(account ?? root, 'Remove')
  const photo = choosePhoto
    ? ancestor(choosePhoto, ['Choose photo'], 4)
    : removePhoto
      ? ancestor(removePhoto, ['Remove'], 4)
      : account

  const nameInput = root.querySelector<HTMLInputElement>('#profile-name')
  const identity = nameInput
    ? ancestor(nameInput, ['Name', 'Email', 'Phone', 'Role'], 5)
    : account

  const theme = appearance
    ? labelledSection(appearance, 'Theme mode', ['Light', 'Dark'])
    : null
  const accent = appearance
    ? labelledSection(appearance, 'Accent color', ['Emerald', 'Teal'])
    : null
  const size = appearance
    ? labelledSection(
        appearance,
        'Text and interface size',
        ['Small', 'Default', 'Large'],
      )
    : null

  const save = button(root, 'Save Changes')
  const revert = button(root, 'Revert')
  const actions = save
    ? ancestor(save, ['Save Changes', 'Revert'], 5)
    : revert
      ? ancestor(revert, ['Revert'], 5)
      : null

  if (!back || !account || !appearance || !security || !actions || !save) {
    clearAnchors()
    return false
  }

  mark(header, 'profile-settings-header')
  mark(back, 'profile-settings-back')
  mark(account, 'profile-settings-account')
  mark(photo ?? account, 'profile-settings-photo')
  mark(identity ?? account, 'profile-settings-identity')
  mark(appearance, 'profile-settings-appearance')
  mark(theme ?? appearance, 'profile-settings-theme')
  mark(accent ?? appearance, 'profile-settings-accent')
  mark(size ?? appearance, 'profile-settings-size')
  mark(security, 'profile-settings-security')
  mark(actions, 'profile-settings-actions')
  mark(save, 'profile-settings-save')
  return true
}

export function ProfileSettingsWalkthrough({ user }: { user: AuthUser }) {
  const [featureOpen, setFeatureOpen] = useState(false)
  const featureOpenRef = useRef(false)
  const activeTourIdRef = useRef<string | null>(null)
  const intervalRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const { hydrated, activeTourId, startTour, closeTour } = useWalkthrough()

  const tour = useMemo<WalkthroughTour>(
    () => ({
      id: userScopedTourId('profile-settings-first-use', user.id),
      version: 1,
      title: 'Profile & Settings guide',
      role: roleOf(user),
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to Profile & Settings',
          description:
            'This page is shared by Administrator, Field Worker, and Vulnerable Citizen accounts. The guide explains each section without changing a field, choosing a photo, previewing a theme, or saving anything.',
          placement: 'center',
          eyebrow: 'Account settings guide',
        },
        {
          id: 'purpose',
          title: 'Preview first, then save once',
          description:
            'Name, phone, photo, appearance, interface size, and an optional password change are saved together from the bottom of the page. Appearance choices preview immediately, but they are not permanent until Save Changes succeeds.',
          target: TARGETS.header,
          placement: 'bottom',
          padding: 4,
        },
        {
          id: 'back',
          title: 'Back discards unsaved drafts',
          description:
            'Back to Dashboard restores the last saved account and appearance settings before leaving. Use Save Changes first when you want the current edits to remain.',
          target: TARGETS.back,
          placement: 'bottom',
          padding: 3,
        },
        {
          id: 'account',
          title: 'Account settings belong to the signed-in user',
          description:
            'This card updates the account name, phone, and profile photo. Email and Role are read-only. For a Vulnerable Citizen, account settings do not directly edit the separate vulnerable-registration record under My Profile.',
          target: TARGETS.account,
          placement: 'auto',
          padding: 4,
        },
        {
          id: 'photo',
          title: 'Photo changes remain staged until saving',
          description:
            'Choose photo accepts JPG, PNG, or WebP files up to 5 MB. Remove also stages a change. The preview is not the final saved photo until the complete settings save succeeds.',
          target: TARGETS.photo,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'identity',
          title: 'Check name and phone before saving',
          description:
            'Name is required. Phone is optional but should belong to the account holder or an authorized contact. Email and Role cannot be changed here.',
          target: TARGETS.identity,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'appearance',
          title: 'Appearance applies across the whole account',
          description:
            'Theme, accent, and interface size affect dashboards, navigation, cards, forms, dialogs, controls, and labels. Choose settings that remain readable on the devices normally used for this account.',
          target: TARGETS.appearance,
          placement: 'auto',
          padding: 4,
        },
        {
          id: 'theme',
          title: 'Theme changes brightness',
          description:
            'Light uses bright surfaces. Dark reduces glare in dim environments. Selecting either option previews it immediately; Revert, Back, or leaving without saving restores the saved theme.',
          target: TARGETS.theme,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'accent',
          title: 'Accent changes buttons and highlights',
          description:
            'Emerald, Teal, Green, and Amber change the main accent. Accent is decorative and must not be treated as a status by itself—always read the accompanying text and label.',
          target: TARGETS.accent,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'size',
          title: 'Interface size scales more than body text',
          description:
            'Small, Default, and Large scale text, controls, spacing, forms, dialogs, cards, and navigation. Check that important buttons and long forms remain comfortable to use before saving.',
          target: TARGETS.size,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'security',
          title: 'Leave both password fields empty to keep the password',
          description:
            'To change it, enter the current password and a new password of at least six characters. Never share either value in feedback, field notes, screenshots, or support messages.',
          target: TARGETS.security,
          placement: 'auto',
          padding: 4,
        },
        {
          id: 'actions',
          title: 'Use the unsaved-change bar as the checkpoint',
          description:
            'Revert restores the last saved values. Save Changes validates and sends the current settings. A disabled Save button normally means there is nothing new to save or a save is already running.',
          target: TARGETS.actions,
          placement: 'top',
          padding: 4,
        },
        {
          id: 'save',
          title: 'Save only after reviewing every changed section',
          description:
            'Save Changes can update identity details, appearance, interface size, password, and profile photo. The guide highlights it but never presses it. Wait for the success message before assuming changes are permanent.',
          target: TARGETS.save,
          placement: 'top',
          padding: 3,
        },
        {
          id: 'finish',
          title: 'Keep account settings accurate and private',
          description:
            'Final check: Is the name correct? Is the phone authorized? Is the interface readable? Are password fields empty unless I intend to change the password? Am I ready for every staged change to be saved together?',
          placement: 'center',
          eyebrow: 'Good account practice',
        },
      ],
    }),
    [user],
  )

  const { start } = useWalkthroughTour(tour)

  useEffect(() => {
    activeTourIdRef.current = activeTourId
  }, [activeTourId])

  useEffect(() => {
    const setOpen = (open: boolean) => {
      featureOpenRef.current = open
      setFeatureOpen(open)
    }

    const stop = () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    const discover = () => {
      const found = markProfileAnchors()
      setOpen(found)
      if (found) stop()
      return found
    }

    const leave = () => {
      stop()
      clearAnchors()
      setOpen(false)
      if (activeTourIdRef.current === tour.id) closeTour()
    }

    const observer = new MutationObserver(() => {
      if (featureOpenRef.current && !profileVisible()) leave()
    })

    observer.observe(document.body, { childList: true, subtree: true })
    clearAnchors()
    if (!discover()) {
      intervalRef.current = window.setInterval(
        discover,
        DISCOVERY_INTERVAL_MS,
      )
      timeoutRef.current = window.setTimeout(stop, DISCOVERY_TIMEOUT_MS)
    }

    return () => {
      observer.disconnect()
      stop()
      clearAnchors()
    }
  }, [closeTour, tour.id])

  useEffect(() => {
    if (
      !hydrated ||
      !featureOpen ||
      activeTourId ||
      !isNewWalkthroughAccount(user.createdAt)
    ) {
      return
    }

    const timer = window.setTimeout(() => {
      if (!profileVisible() || !markProfileAnchors()) {
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
        if (!markProfileAnchors()) {
          featureOpenRef.current = false
          setFeatureOpen(false)
          return
        }
        start()
      }}
      aria-label="Open Profile and Settings guide"
      className="fixed bottom-24 right-4 z-40 rounded-full bg-white/95 shadow-lg backdrop-blur-xl md:bottom-10 md:right-6"
    >
      <Settings2 className="h-4 w-4" />
      Profile guide
    </Button>
  )
}
