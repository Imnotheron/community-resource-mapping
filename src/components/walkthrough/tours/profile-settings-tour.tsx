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
import type { WalkthroughTour } from '@/components/walkthrough/types'

const ANCHOR_ATTRIBUTE = 'data-profile-settings-tour-anchor'
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

function clearAnchors() {
  document
    .querySelectorAll<HTMLElement>(`[${ANCHOR_ATTRIBUTE}="true"]`)
    .forEach((element) => {
      element.removeAttribute('data-tour')
      element.removeAttribute(ANCHOR_ATTRIBUTE)
    })
}

function setAnchor(element: HTMLElement | null, name: string) {
  if (!element) return false
  element.setAttribute('data-tour', name)
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

function findButton(root: ParentNode, text: string) {
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

function findHeading() {
  return findVisibleExact<HTMLHeadingElement>(
    document,
    'h1',
    'Profile & Settings',
  )
}

function isProfileVisible() {
  return Boolean(findHeading())
}

function findCard(root: ParentNode, title: string) {
  const cardTitle = findVisibleExact<HTMLElement>(
    root,
    '[data-slot="card-title"], h2, h3',
    title,
  )
  return cardTitle?.closest<HTMLElement>('[data-slot="card"]') ?? null
}

function findSectionByLabel(root: ParentNode, labelText: string, evidence: string[]) {
  const label = findVisibleExact<HTMLElement>(root, 'label', labelText)
  return label ? ancestorContaining(label, [labelText, ...evidence], 4) : null
}

/** Labels the existing Profile UI without changing form values or clicking controls. */
function markProfileAnchors() {
  clearAnchors()

  const heading = findHeading()
  if (!heading) return false

  const header = ancestorContaining(heading, [
    'Profile & Settings',
    'Preview your edits, then save everything once at the bottom.',
  ], 3)
  if (!header) return false

  const root = ancestorContaining(header, [
    'Account',
    'Appearance',
    'Security',
    'Save Changes',
  ], 5)
  if (!root) return false

  const back = findButton(root, 'Back to Dashboard')
  const account = findCard(root, 'Account')
  const appearance = findCard(root, 'Appearance')
  const security = findCard(root, 'Security')
  const choosePhoto = findButton(account ?? root, 'Choose photo')
  const removePhoto = findButton(account ?? root, 'Remove')
  const photo = choosePhoto
    ? ancestorContaining(choosePhoto, ['Choose photo'], 4)
    : removePhoto
      ? ancestorContaining(removePhoto, ['Remove'], 4)
      : account

  const nameInput = root.querySelector<HTMLInputElement>('#profile-name')
  const identity = nameInput
    ? ancestorContaining(nameInput, ['Name', 'Email', 'Phone', 'Role'], 5)
    : account

  const theme = appearance
    ? findSectionByLabel(appearance, 'Theme mode', ['Light', 'Dark'])
    : null
  const accent = appearance
    ? findSectionByLabel(appearance, 'Accent color', ['Emerald', 'Teal'])
    : null
  const size = appearance
    ? findSectionByLabel(appearance, 'Text and interface size', ['Small', 'Default', 'Large'])
    : null

  const save = findButton(root, 'Save Changes')
  const revert = findButton(root, 'Revert')
  const actions = save
    ? ancestorContaining(save, ['Save Changes', 'Revert'], 5)
    : revert
      ? ancestorContaining(revert, ['Revert'], 5)
      : null

  if (!back || !account || !appearance || !security || !actions || !save) {
    clearAnchors()
    return false
  }

  setAnchor(header, 'profile-settings-header')
  setAnchor(back, 'profile-settings-back')
  setAnchor(account, 'profile-settings-account')
  setAnchor(photo ?? account, 'profile-settings-photo')
  setAnchor(identity ?? account, 'profile-settings-identity')
  setAnchor(appearance, 'profile-settings-appearance')
  setAnchor(theme ?? appearance, 'profile-settings-theme')
  setAnchor(accent ?? appearance, 'profile-settings-accent')
  setAnchor(size ?? appearance, 'profile-settings-size')
  setAnchor(security, 'profile-settings-security')
  setAnchor(actions, 'profile-settings-actions')
  setAnchor(save, 'profile-settings-save')

  return true
}

export function ProfileSettingsWalkthrough({ user }: { user: AuthUser }) {
  const [featureOpen, setFeatureOpen] = useState(false)
  const featureOpenRef = useRef(false)
  const activeTourIdRef = useRef<string | null>(null)
  const discoveryIntervalRef = useRef<number | null>(null)
  const discoveryTimeoutRef = useRef<number | null>(null)

  const { hydrated, activeTourId, startTour, closeTour } = useWalkthrough()

  const tour = useMemo<WalkthroughTour>(
    () => ({
      id: userScopedTourId('profile-settings-first-use', user.id),
      version: 1,
      title: 'Profile & Settings guide',
      role: String(user.role || '').toUpperCase(),
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
            'Name, phone, photo, appearance, interface size, and an optional password change are saved together from the bottom of the page. Appearance choices can preview immediately, but they are not permanent until Save Changes succeeds.',
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
          title: 'Account details belong to the signed-in user',
          description:
            'This card updates the account name, phone, and profile photo. Email and Role are displayed as read-only. For a Vulnerable Citizen, these account settings do not replace or directly edit the separate vulnerable-registration record under My Profile.',
          target: TARGETS.account,
          placement: 'auto',
          padding: 4,
        },
        {
          id: 'photo',
          title: 'A photo change is staged until Save Changes',
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
            'Name is required. Phone is optional but should belong to the account holder or an authorized contact. Email and Role cannot be changed on this page.',
          target: TARGETS.identity,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'appearance',
          title: 'Appearance applies across the whole account',
          description:
            'Theme, accent color, and interface size affect dashboards, navigation, cards, forms, dialogs, controls, and labels. Choose settings that remain readable in the places and devices where the account is normally used.',
          target: TARGETS.appearance,
          placement: 'auto',
          padding: 4,
        },
        {
          id: 'theme',
          title: 'Theme changes brightness',
          description:
            'Light uses bright surfaces. Dark reduces glare in dim environments. Selecting either option previews it immediately; Revert, Back, or leaving without saving restores the previously saved theme.',
          target: TARGETS.theme,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'accent',
          title: 'Accent changes buttons and highlights',
          description:
            'Emerald, Teal, Green, and Amber change the main interface accent. Accent color is decorative and must not be treated as a status by itself—always read the accompanying text and label.',
          target: TARGETS.accent,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'size',
          title: 'Interface size scales more than body text',
          description:
            'Small, Default, and Large scale text, controls, spacing, forms, dialogs, cards, and navigation across the account. Check that important buttons and long forms remain comfortable to read before saving.',
          target: TARGETS.size,
          placement: 'auto',
          padding: 3,
        },
        {
          id: 'security',
          title: 'Leave both password fields empty to keep the current password',
          description:
            'To change a password, enter both the current password and a new password of at least six characters. The system verifies the current password before accepting the change. Never share either value in feedback, notes, screenshots, or support messages.',
          target: TARGETS.security,
          placement: 'auto',
          padding: 4,
        },
        {
          id: 'actions',
          title: 'Use the unsaved-change bar as the final checkpoint',
          description:
            'Revert restores the last saved account and appearance values. Save Changes validates the form and sends the current settings. A disabled Save button usually means there is nothing new to save or a save is already running.',
          target: TARGETS.actions,
          placement: 'top',
          padding: 4,
        },
        {
          id: 'save',
          title: 'Save only after reviewing every changed section',
          description:
            'Save Changes can update identity details, appearance, interface size, password, and profile photo in one workflow. The guide highlights the button but will not press it. Wait for the success message before assuming the changes are permanent.',
          target: TARGETS.save,
          placement: 'top',
          padding: 3,
        },
        {
          id: 'finish',
          title: 'Keep account settings accurate and private',
          description:
            'Final check: Is the account name correct? Is the phone authorized? Is the interface readable? Are password fields empty unless I intend to change the password? Am I ready for every staged change to be saved together?',
          placement: 'center',
          eyebrow: 'Good account practice',
        },
      ],
    }),
    [user.id, user.role],
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
      const found = markProfileAnchors()
      setOpen(found)
      if (found) stopDiscovery()
      return found
    }

    const beginDiscovery = () => {
      stopDiscovery()
      clearAnchors()
      setOpen(false)

      if (discover()) return

      discoveryIntervalRef.current = window.setInterval(
        discover,
        DISCOVERY_INTERVAL_MS,
      )
      discoveryTimeoutRef.current = window.setTimeout(
        stopDiscovery,
        DISCOVERY_TIMEOUT_MS,
      )
    }

    const leaveFeature = () => {
      stopDiscovery()
      clearAnchors()
      setOpen(false)
      if (activeTourIdRef.current === tour.id) closeTour()
    }

    const observer = new MutationObserver(() => {
      if (featureOpenRef.current && !isProfileVisible()) {
        leaveFeature()
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })
    beginDiscovery()

    return () => {
      observer.disconnect()
      stopDiscovery()
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
      if (!isProfileVisible() || !markProfileAnchors()) {
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
