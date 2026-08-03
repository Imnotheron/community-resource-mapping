'use client'

import { useEffect, useMemo } from 'react'
import {
  Megaphone,
  MessageSquare,
  Package,
  User,
} from 'lucide-react'

import type { AuthUser } from '@/lib/api-client'
import { userScopedTourId } from '@/components/walkthrough/onboarding-policy'
import {
  useWalkthrough,
} from '@/components/walkthrough/walkthrough-provider'
import type { WalkthroughTour } from '@/components/walkthrough/types'
import { ContextualFeatureGuide } from '@/components/walkthrough/tours/contextual-feature-guide'
import {
  ancestorContaining,
  clearTourAnchors,
  delay,
  findButton,
  findCard,
  findContaining,
  findExact,
  findHeading,
  isVisible,
  nextPaint,
  normalizedText,
  setTourAnchor,
} from '@/components/walkthrough/tours/contextual-dom'

function featureRoot(headingText: string) {
  const heading = findHeading(headingText)
  if (!heading) return null

  return heading.parentElement?.parentElement instanceof HTMLElement
    ? heading.parentElement.parentElement
    : heading.parentElement
}

function hasLoadingText(root: ParentNode, values: string[]) {
  return Array.from(root.querySelectorAll<HTMLElement>('p, span, div')).some(
    (element) =>
      isVisible(element) && values.includes(normalizedText(element.textContent)),
  )
}

function fieldGroup(root: ParentNode, labelText: string) {
  const label = findExact<HTMLElement>(root, 'label', labelText)
  return label ? ancestorContaining(label, [labelText], 4) : null
}

// ---------------------------------------------------------------------------
// My Profile
// ---------------------------------------------------------------------------

const PROFILE_ANCHOR = 'data-citizen-profile-tour-anchor'
const PROFILE_TARGETS = {
  header: '[data-tour="citizen-profile-header"]',
  status: '[data-tour="citizen-profile-status"]',
  personal: '[data-tour="citizen-profile-personal"]',
  address: '[data-tour="citizen-profile-address"]',
  vulnerability: '[data-tour="citizen-profile-vulnerability"]',
  emergency: '[data-tour="citizen-profile-emergency"]',
  location: '[data-tour="citizen-profile-location"]',
} as const

function clearProfileAnchors() {
  clearTourAnchors(PROFILE_ANCHOR)
}

function profileVisible() {
  return Boolean(
    findHeading('My Profile') ||
      findExact<HTMLElement>(
        document,
        'p',
        'No profile found. Please contact a field worker to register.',
      ),
  )
}

function markProfileAnchors() {
  clearProfileAnchors()

  const emptyText = findExact<HTMLElement>(
    document,
    'p',
    'No profile found. Please contact a field worker to register.',
  )
  if (emptyText) {
    const empty = emptyText.closest<HTMLElement>('[data-slot="card"]') ?? emptyText
    Object.entries(PROFILE_TARGETS).forEach(([, selector]) => {
      const name = selector.match(/data-tour="([^"]+)"/)?.[1]
      if (name) setTourAnchor(empty, name, PROFILE_ANCHOR)
    })
    return true
  }

  const root = featureRoot('My Profile')
  const heading = findHeading('My Profile')
  if (!root || !heading) return false

  if (hasLoadingText(root, ['Loading profile', 'Preparing your registration details...'])) {
    return false
  }

  const header = ancestorContaining(heading, [
    'My Profile',
    'Your registration details on file.',
  ], 3)
  const cards = Array.from(
    root.querySelectorAll<HTMLElement>('[data-slot="card"]'),
  ).filter(isVisible)
  const status = cards.find((card) => {
    const text = normalizedText(card.textContent)
    return (
      text.includes('PENDING') ||
      text.includes('APPROVED') ||
      text.includes('REJECTED')
    ) && !text.includes('Personal Information')
  }) ?? cards[0] ?? null
  const personal = findCard(root, 'Personal Information')
  const address = findCard(root, 'Address')
  const vulnerability = findCard(root, 'Vulnerability & Medical')
  const emergency = findCard(root, 'Emergency Contact')
  const location = findCard(root, 'Location') ?? address

  if (!header || !status || !personal || !address || !vulnerability || !emergency) {
    return false
  }

  setTourAnchor(header, 'citizen-profile-header', PROFILE_ANCHOR)
  setTourAnchor(status, 'citizen-profile-status', PROFILE_ANCHOR)
  setTourAnchor(personal, 'citizen-profile-personal', PROFILE_ANCHOR)
  setTourAnchor(address, 'citizen-profile-address', PROFILE_ANCHOR)
  setTourAnchor(vulnerability, 'citizen-profile-vulnerability', PROFILE_ANCHOR)
  setTourAnchor(emergency, 'citizen-profile-emergency', PROFILE_ANCHOR)
  setTourAnchor(location, 'citizen-profile-location', PROFILE_ANCHOR)
  return true
}

function CitizenProfileGuide({ user }: { user: AuthUser }) {
  const tour = useMemo<WalkthroughTour>(() => ({
    id: userScopedTourId('citizen-my-profile-first-use', user.id),
    version: 1,
    title: 'My Profile guide',
    role: 'VULNERABLE',
    steps: [
      {
        id: 'welcome',
        title: 'My Profile is your official vulnerable-registration record',
        description:
          'This page is read-only. The guide will not edit your registration or expose it to another user.',
        placement: 'center',
        eyebrow: 'Citizen profile guide',
      },
      {
        id: 'purpose',
        title: 'Account settings and My Profile are different records',
        description:
          'Profile & Settings changes your login account name, phone, photo, password, and appearance. My Profile shows the separate registration record used for vulnerability and assistance work. Changing account settings does not rewrite this registration.',
        target: PROFILE_TARGETS.header,
        placement: 'bottom',
        padding: 4,
      },
      {
        id: 'status',
        title: 'Read your registration status and any rejection reason',
        description:
          'Pending means the registration is still under review. Approved means the profile was accepted. Rejected means it was not accepted as submitted; when a reason is shown, use it when asking authorized staff what must be corrected. No profile found means a registration is not linked to this account.',
        target: PROFILE_TARGETS.status,
        placement: 'auto',
        padding: 4,
      },
      {
        id: 'personal',
        title: 'Check personal and contact information',
        description:
          'Review gender, civil status, mobile and landline numbers, education, and employment information. Missing values appear as a dash. Contact authorized staff when information is incorrect; this page has no Edit button.',
        target: PROFILE_TARGETS.personal,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'address',
        title: 'Check the address used for municipal coordination',
        description:
          'Review house number, street, barangay, municipality, and province. An incorrect or outdated address can affect mapping and field follow-up, so report changes through the approved correction process.',
        target: PROFILE_TARGETS.address,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'vulnerability',
        title: 'Vulnerability and medical details are sensitive',
        description:
          'This section can show vulnerability categories, disability information, medical conditions, Needs Assistance, and assistance type. Do not share screenshots or read these details aloud where unauthorized people can hear them.',
        target: PROFILE_TARGETS.vulnerability,
        placement: 'auto',
        padding: 4,
      },
      {
        id: 'emergency',
        title: 'Keep the emergency contact current and authorized',
        description:
          'The contact name and phone should belong to someone who has agreed to be contacted when necessary. Ask authorized staff to correct outdated or incorrect information.',
        target: PROFILE_TARGETS.emergency,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'location',
        title: 'The saved map position is sensitive and may become outdated',
        description:
          'When coordinates are recorded, the map shows the saved location. It is not live tracking and does not prove where you are now. Report an incorrect or outdated point instead of assuming it updates automatically.',
        target: PROFILE_TARGETS.location,
        placement: 'auto',
        padding: 4,
      },
      {
        id: 'finish',
        title: 'Review privately and request corrections through authorized staff',
        description:
          'Final check: Is the status understandable? Are contact, address, vulnerability, emergency, and location details accurate? Have I protected this personal information on a shared screen or device?',
        placement: 'center',
        eyebrow: 'Good profile practice',
      },
    ],
  }), [user.id])

  return (
    <ContextualFeatureGuide
      user={user}
      tour={tour}
      navId="my-profile"
      label="My Profile guide"
      icon={<User className="h-4 w-4" />}
      discover={markProfileAnchors}
      clear={clearProfileAnchors}
      isFeatureVisible={profileVisible}
    />
  )
}

// ---------------------------------------------------------------------------
// Relief History and distribution feedback dialog
// ---------------------------------------------------------------------------

const RELIEF_ANCHOR = 'data-citizen-relief-tour-anchor'
const RELIEF_TARGETS = {
  header: '[data-tour="citizen-relief-header"]',
  list: '[data-tour="citizen-relief-list"]',
  record: '[data-tour="citizen-relief-record"]',
  status: '[data-tour="citizen-relief-status"]',
  details: '[data-tour="citizen-relief-details"]',
  notes: '[data-tour="citizen-relief-notes"]',
  existingFeedback: '[data-tour="citizen-relief-existing-feedback"]',
  giveFeedback: '[data-tour="citizen-relief-give-feedback"]',
  dialog: '[data-tour="citizen-relief-feedback-dialog"]',
  dialogType: '[data-tour="citizen-relief-feedback-type"]',
  dialogMessage: '[data-tour="citizen-relief-feedback-message"]',
  dialogSubmit: '[data-tour="citizen-relief-feedback-submit"]',
} as const

function clearReliefAnchors() {
  clearTourAnchors(RELIEF_ANCHOR)
}

function reliefVisible() {
  return Boolean(findHeading('Relief History'))
}

function findReliefDialog() {
  return (
    Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find(
      (dialog) =>
        isVisible(dialog) && normalizedText(dialog.textContent).includes('Feedback for'),
    ) ?? null
  )
}

function markReliefAnchors() {
  clearReliefAnchors()
  const root = featureRoot('Relief History')
  const heading = findHeading('Relief History')
  if (!root || !heading) return false

  if (hasLoadingText(root, ['Loading relief history', 'Checking your distribution records...'])) {
    return false
  }

  const header = ancestorContaining(heading, [
    'Relief History',
    'All relief distributions you have received.',
  ], 3)
  const cards = Array.from(
    root.querySelectorAll<HTMLElement>('[data-slot="card"]'),
  ).filter(isVisible)
  const record = cards.find((card) => {
    const text = normalizedText(card.textContent)
    return text.includes('Worker:') && text.includes('Quantity:') && text.includes('Date:')
  }) ?? null
  const emptyText = findExact<HTMLElement>(
    root,
    'div, p',
    'No relief distributions recorded yet.',
  )
  const empty = emptyText?.closest<HTMLElement>('[data-slot="card"]') ?? emptyText
  const list = record?.parentElement instanceof HTMLElement
    ? record.parentElement
    : empty
  const recordTitle = record?.querySelector<HTMLElement>('h3') ?? null
  const status = recordTitle
    ? ancestorContaining(recordTitle, [normalizedText(recordTitle.textContent)], 2)
    : record
  const details = record
    ? Array.from(record.querySelectorAll<HTMLElement>('div')).find((element) => {
        const text = normalizedText(element.textContent)
        return isVisible(element) && text.includes('Worker:') && text.includes('Date:')
      }) ?? record
    : empty
  const notes = record
    ? Array.from(record.querySelectorAll<HTMLElement>('p')).find((element) => {
        const text = normalizedText(element.textContent)
        return isVisible(element) && text.startsWith('"') && text.endsWith('"')
      }) ?? record
    : empty
  const existingFeedback = record
    ? findContaining<HTMLElement>(record, 'div', 'Your feedback:') ?? record
    : empty
  const giveFeedback = findButton(root, 'Give Feedback')

  const dialog = findReliefDialog()
  const dialogType = dialog ? fieldGroup(dialog, 'Type') : null
  const dialogMessage = dialog ? fieldGroup(dialog, 'Message') : null
  const dialogSubmit = dialog ? findButton(dialog, 'Submit') : null

  if (!header || !list) return false

  setTourAnchor(header, 'citizen-relief-header', RELIEF_ANCHOR)
  setTourAnchor(list, 'citizen-relief-list', RELIEF_ANCHOR)
  setTourAnchor(record ?? empty, 'citizen-relief-record', RELIEF_ANCHOR)
  setTourAnchor(status ?? record ?? empty, 'citizen-relief-status', RELIEF_ANCHOR)
  setTourAnchor(details ?? record ?? empty, 'citizen-relief-details', RELIEF_ANCHOR)
  setTourAnchor(notes ?? record ?? empty, 'citizen-relief-notes', RELIEF_ANCHOR)
  setTourAnchor(existingFeedback ?? record ?? empty, 'citizen-relief-existing-feedback', RELIEF_ANCHOR)
  setTourAnchor(giveFeedback ?? record ?? empty, 'citizen-relief-give-feedback', RELIEF_ANCHOR)
  setTourAnchor(dialog ?? giveFeedback ?? record ?? empty, 'citizen-relief-feedback-dialog', RELIEF_ANCHOR)
  setTourAnchor(dialogType ?? dialog ?? giveFeedback ?? record ?? empty, 'citizen-relief-feedback-type', RELIEF_ANCHOR)
  setTourAnchor(dialogMessage ?? dialog ?? giveFeedback ?? record ?? empty, 'citizen-relief-feedback-message', RELIEF_ANCHOR)
  setTourAnchor(dialogSubmit ?? dialog ?? giveFeedback ?? record ?? empty, 'citizen-relief-feedback-submit', RELIEF_ANCHOR)
  return true
}

async function openReliefFeedbackDialog() {
  if (!reliefVisible()) return
  markReliefAnchors()

  if (!findReliefDialog()) {
    const root = featureRoot('Relief History')
    const button = root ? findButton(root, 'Give Feedback') : null
    button?.click()
    await nextPaint()
    await delay(350)
  }

  markReliefAnchors()
}

async function closeReliefFeedbackDialog() {
  const dialog = findReliefDialog()
  if (!dialog) return

  const cancel = findButton(dialog, 'Cancel')
  if (cancel) {
    cancel.click()
    await nextPaint()
    await delay(250)
  }

  if (reliefVisible()) markReliefAnchors()
}

function CitizenReliefGuide({ user }: { user: AuthUser }) {
  const { activeTourId } = useWalkthrough()
  const tour = useMemo<WalkthroughTour>(() => ({
    id: userScopedTourId('citizen-relief-history-first-use', user.id),
    version: 1,
    title: 'Relief History guide',
    role: 'VULNERABLE',
    steps: [
      {
        id: 'welcome',
        title: 'Relief History shows records linked to your profile',
        description:
          'The guide will not change a distribution status or submit feedback.',
        placement: 'center',
        eyebrow: 'Citizen relief history',
      },
      {
        id: 'purpose',
        title: 'A record can be Pending, Approved, or Rejected',
        description:
          'This page can include all three statuses even though its subtitle says received. Read the badge on each record. Only Approved means the distribution was accepted as recorded.',
        target: RELIEF_TARGETS.header,
        placement: 'bottom',
        padding: 4,
      },
      {
        id: 'list',
        title: 'No recorded distribution is not a decision about eligibility',
        description:
          'An empty history means no linked distribution record was returned. It does not by itself decide whether you qualify for future assistance or whether an offline activity occurred.',
        target: RELIEF_TARGETS.list,
        placement: 'auto',
        padding: 4,
      },
      {
        id: 'status',
        title: 'Read the current status first',
        description:
          'Pending is still under review. Approved was accepted. Rejected was not approved as recorded. A status can change after review, so use the current badge instead of an older screenshot or message.',
        target: RELIEF_TARGETS.status,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'details',
        title: 'Check worker, quantity, and distribution date',
        description:
          'Worker identifies the account that recorded the distribution. Quantity is the numeric amount entered. Date is the recorded distribution date. Ask authorized staff when the beneficiary, items, quantity, worker, or date appears incorrect.',
        target: RELIEF_TARGETS.details,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'notes',
        title: 'Notes provide context but are not a complete receipt',
        description:
          'When notes appear, read them with the item description and status. Contact authorized staff when the record does not match what you actually received.',
        target: RELIEF_TARGETS.notes,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'existing-feedback',
        title: 'Submitted distribution feedback and Admin responses stay with the record',
        description:
          'After feedback is submitted for an Approved distribution, the message appears here. An Admin response may appear below it. The current workflow allows one feedback submission per distribution and has no Edit button.',
        target: RELIEF_TARGETS.existingFeedback,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'give-feedback',
        title: 'Give Feedback appears only for an eligible Approved record',
        description:
          'The button appears when the distribution is Approved and no feedback has been submitted for it yet. Pending and Rejected records do not offer this distribution-specific feedback action.',
        target: RELIEF_TARGETS.giveFeedback,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'dialog',
        title: 'Choose what kind of distribution feedback you are sending',
        description:
          'When an eligible record exists, the guide opens its dialog for demonstration. Feedback shares an experience, Message sends information, and Report an Issue identifies a problem. Use the separate general Feedback page for concerns that are not tied to one distribution.',
        target: RELIEF_TARGETS.dialogType,
        placement: 'bottom',
        padding: 3,
        beforeEnter: openReliefFeedbackDialog,
      },
      {
        id: 'message',
        title: 'Describe the specific experience without unnecessary private details',
        description:
          'State what happened, which item or service was involved, and what follow-up is needed. The guide will not type or press Submit. Review the message carefully because the current screen does not provide an Edit action after submission.',
        target: RELIEF_TARGETS.dialogMessage,
        placement: 'bottom',
        padding: 3,
        beforeEnter: openReliefFeedbackDialog,
      },
      {
        id: 'submit',
        title: 'Submit creates one feedback record for this distribution',
        description:
          'The button remains disabled while the message is blank. The server also requires at least ten characters and verifies that the Approved distribution belongs to your profile. The guide highlights Submit but will not press it.',
        target: RELIEF_TARGETS.dialogSubmit,
        placement: 'top',
        padding: 3,
        beforeEnter: openReliefFeedbackDialog,
      },
      {
        id: 'finish',
        title: 'Use the record and your real experience together',
        description:
          'Final check: Is the status current? Do the items, quantity, worker, and date match what happened? Is distribution-specific feedback appropriate, factual, and ready to be saved once?',
        placement: 'center',
        eyebrow: 'Good relief-history practice',
        beforeEnter: closeReliefFeedbackDialog,
      },
    ],
  }), [user.id])

  useEffect(() => {
    if (activeTourId !== tour.id || !reliefVisible()) return

    const preventDismiss = (event: Event) => event.preventDefault()
    document.addEventListener('dismissableLayer.pointerDownOutside', preventDismiss, true)
    document.addEventListener('dismissableLayer.focusOutside', preventDismiss, true)

    return () => {
      document.removeEventListener('dismissableLayer.pointerDownOutside', preventDismiss, true)
      document.removeEventListener('dismissableLayer.focusOutside', preventDismiss, true)
    }
  }, [activeTourId, tour.id])

  return (
    <ContextualFeatureGuide
      user={user}
      tour={tour}
      navId="relief-history"
      label="Relief History guide"
      icon={<Package className="h-4 w-4" />}
      discover={markReliefAnchors}
      clear={clearReliefAnchors}
      isFeatureVisible={reliefVisible}
      onLeave={closeReliefFeedbackDialog}
      onTourClosed={closeReliefFeedbackDialog}
    />
  )
}

// ---------------------------------------------------------------------------
// General Feedback
// ---------------------------------------------------------------------------

const FEEDBACK_ANCHOR = 'data-citizen-feedback-tour-anchor'
const FEEDBACK_TARGETS = {
  header: '[data-tour="citizen-feedback-header"]',
  form: '[data-tour="citizen-feedback-form"]',
  type: '[data-tour="citizen-feedback-type"]',
  subject: '[data-tour="citizen-feedback-subject"]',
  message: '[data-tour="citizen-feedback-message"]',
  submit: '[data-tour="citizen-feedback-submit"]',
  history: '[data-tour="citizen-feedback-history"]',
  record: '[data-tour="citizen-feedback-record"]',
  response: '[data-tour="citizen-feedback-response"]',
} as const

function clearFeedbackAnchors() {
  clearTourAnchors(FEEDBACK_ANCHOR)
}

function feedbackVisible() {
  return Boolean(findHeading('Feedback'))
}

function markFeedbackAnchors() {
  clearFeedbackAnchors()
  const root = featureRoot('Feedback')
  const heading = findHeading('Feedback')
  if (!root || !heading) return false

  if (hasLoadingText(root, ['Loading feedback', 'Fetching your previous messages...'])) {
    return false
  }

  const header = ancestorContaining(heading, [
    'Feedback',
    'Send feedback to the MSWDO and view your previous submissions.',
  ], 3)
  const form = findCard(root, 'Submit New Feedback')
  const history = findCard(root, 'Your Previous Feedback')
  const typeInput = root.querySelector<HTMLElement>('#fb-type')
  const type = typeInput ? ancestorContaining(typeInput, ['Type'], 3) : null
  const subjectInput = root.querySelector<HTMLElement>('#fb-subject')
  const subject = subjectInput
    ? ancestorContaining(subjectInput, ['Subject (optional)'], 3)
    : null
  const messageInput = root.querySelector<HTMLElement>('#fb-message')
  const message = messageInput
    ? ancestorContaining(messageInput, ['Message'], 3)
    : null
  const submit = findButton(root, 'Submit Feedback')
  const empty = history
    ? findExact<HTMLElement>(history, 'p', 'No feedback submitted yet.')
    : null
  const record = history
    ? Array.from(history.querySelectorAll<HTMLElement>('div')).find((element) => {
        const text = normalizedText(element.textContent)
        return (
          isVisible(element) &&
          text.length > 0 &&
          (text.includes('SUBMITTED') || text.includes('REVIEWED')) &&
          !text.includes('Your Previous Feedback')
        )
      }) ?? empty
    : null
  const response = record
    ? findContaining<HTMLElement>(record, 'div', 'Admin response:') ?? record
    : empty

  if (!header || !form || !history || !type || !subject || !message || !submit || !record) {
    return false
  }

  setTourAnchor(header, 'citizen-feedback-header', FEEDBACK_ANCHOR)
  setTourAnchor(form, 'citizen-feedback-form', FEEDBACK_ANCHOR)
  setTourAnchor(type, 'citizen-feedback-type', FEEDBACK_ANCHOR)
  setTourAnchor(subject, 'citizen-feedback-subject', FEEDBACK_ANCHOR)
  setTourAnchor(message, 'citizen-feedback-message', FEEDBACK_ANCHOR)
  setTourAnchor(submit, 'citizen-feedback-submit', FEEDBACK_ANCHOR)
  setTourAnchor(history, 'citizen-feedback-history', FEEDBACK_ANCHOR)
  setTourAnchor(record, 'citizen-feedback-record', FEEDBACK_ANCHOR)
  setTourAnchor(response ?? record, 'citizen-feedback-response', FEEDBACK_ANCHOR)
  return true
}

function CitizenFeedbackGuide({ user }: { user: AuthUser }) {
  const tour = useMemo<WalkthroughTour>(() => ({
    id: userScopedTourId('citizen-feedback-first-use', user.id),
    version: 1,
    title: 'Citizen Feedback guide',
    role: 'VULNERABLE',
    steps: [
      {
        id: 'welcome',
        title: 'Use Feedback for service-related messages and concerns',
        description:
          'The guide will not select a type, write a message, or submit anything.',
        placement: 'center',
        eyebrow: 'Citizen feedback',
      },
      {
        id: 'purpose',
        title: 'Feedback is not an emergency channel',
        description:
          'Use this page for concerns, suggestions, compliments, service complaints, bug reports, and other messages that can wait for review. For immediate danger or urgent medical help, use the appropriate local emergency channel.',
        target: FEEDBACK_TARGETS.header,
        placement: 'bottom',
        padding: 4,
      },
      {
        id: 'type',
        title: 'Choose the type that helps route the message',
        description:
          'Select the category that best matches the purpose. Report an Issue describes a service problem, while Bug Report is for a problem with the software itself. The category does not change the facts you should include.',
        target: FEEDBACK_TARGETS.type,
        placement: 'bottom',
        padding: 3,
      },
      {
        id: 'subject',
        title: 'Use the optional subject as a brief summary',
        description:
          'A clear subject helps the reviewer understand the topic quickly. It is limited to 120 characters. Do not put passwords, identification numbers, or detailed medical information in the subject.',
        target: FEEDBACK_TARGETS.subject,
        placement: 'bottom',
        padding: 3,
      },
      {
        id: 'message',
        title: 'Explain what happened and what follow-up is needed',
        description:
          'The message must contain at least ten characters. Include relevant dates or context, distinguish facts from assumptions, and limit private information to what the authorized reviewer genuinely needs.',
        target: FEEDBACK_TARGETS.message,
        placement: 'bottom',
        padding: 3,
      },
      {
        id: 'submit',
        title: 'Submit Feedback saves the message under your account',
        description:
          'Review the type, subject, and full message first. The current page does not provide Edit or Delete after submission. The guide highlights the button but will not press it.',
        target: FEEDBACK_TARGETS.submit,
        placement: 'top',
        padding: 3,
      },
      {
        id: 'history',
        title: 'Your Previous Feedback is private to the signed-in account',
        description:
          'The list shows your own submissions newest first. An empty list means no general feedback record was returned for this account. Distribution-specific feedback is shown separately inside Relief History.',
        target: FEEDBACK_TARGETS.history,
        placement: 'auto',
        padding: 4,
      },
      {
        id: 'record',
        title: 'Read type, status, date, subject, and message together',
        description:
          'Submitted means the message was received for review. Reviewed means an Administrator response was recorded; it does not always mean the real-world concern is fully resolved.',
        target: FEEDBACK_TARGETS.record,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'response',
        title: 'An Admin response appears with the original message',
        description:
          'Read the response in context and follow any appropriate instructions. When more clarification is needed, send a new focused message rather than placing passwords or highly sensitive information in the feedback form.',
        target: FEEDBACK_TARGETS.response,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'finish',
        title: 'Send one clear, respectful, and necessary message',
        description:
          'Final check: Is this non-emergency feedback? Is the category correct? Does the message explain the issue and desired follow-up? Have I removed unnecessary private information and reviewed the wording before saving it?',
        placement: 'center',
        eyebrow: 'Good feedback practice',
      },
    ],
  }), [user.id])

  return (
    <ContextualFeatureGuide
      user={user}
      tour={tour}
      navId="feedback"
      label="Feedback guide"
      icon={<MessageSquare className="h-4 w-4" />}
      discover={markFeedbackAnchors}
      clear={clearFeedbackAnchors}
      isFeatureVisible={feedbackVisible}
    />
  )
}

// ---------------------------------------------------------------------------
// Citizen Announcements
// ---------------------------------------------------------------------------

const ANNOUNCEMENTS_ANCHOR = 'data-citizen-announcements-tour-anchor'
const ANNOUNCEMENTS_TARGETS = {
  header: '[data-tour="citizen-announcements-header"]',
  featured: '[data-tour="citizen-announcements-featured"]',
  list: '[data-tour="citizen-announcements-list"]',
  record: '[data-tour="citizen-announcements-record"]',
  metadata: '[data-tour="citizen-announcements-metadata"]',
} as const

function clearAnnouncementAnchors() {
  clearTourAnchors(ANNOUNCEMENTS_ANCHOR)
}

function citizenAnnouncementsVisible() {
  const heading = findHeading('Announcements')
  const root = featureRoot('Announcements')
  return Boolean(
    heading && root &&
      normalizedText(root.textContent).includes(
        'Official notices from the MSWDO and administrators.',
      ),
  )
}

function markAnnouncementAnchors() {
  clearAnnouncementAnchors()
  const root = featureRoot('Announcements')
  const heading = findHeading('Announcements')
  if (
    !root ||
    !heading ||
    !normalizedText(root.textContent).includes(
      'Official notices from the MSWDO and administrators.',
    )
  ) {
    return false
  }

  if (hasLoadingText(root, [
    'Loading announcements...',
    'Loading announcements',
    'Collecting official notices...',
  ])) {
    return false
  }

  const header = ancestorContaining(heading, [
    'Announcements',
    'Official notices from the MSWDO and administrators.',
  ], 3)
  const featuredHeading = findExact<HTMLElement>(root, 'h3', 'Featured Announcements')
  const featured = featuredHeading
    ? ancestorContaining(featuredHeading, ['Featured Announcements'], 3)
    : findExact<HTMLElement>(root, 'p', 'No announcements yet')?.parentElement ?? null
  const cards = Array.from(
    root.querySelectorAll<HTMLElement>('[data-slot="card"]'),
  ).filter(isVisible)
  const record = cards.find((card) => {
    const text = normalizedText(card.textContent)
    return text !== 'No announcements at this time.' && text.length > 0
  }) ?? null
  const empty = findExact<HTMLElement>(root, 'div, p', 'No announcements at this time.')
  const list = record?.parentElement instanceof HTMLElement
    ? record.parentElement
    : empty?.closest<HTMLElement>('[data-slot="card"]') ?? empty
  const metadata = record
    ? Array.from(record.querySelectorAll<HTMLElement>('div')).find((element) => {
        const text = normalizedText(element.textContent)
        return (
          isVisible(element) &&
          (text.includes('Posted ') || text.includes('Location') || text.includes(':'))
        )
      }) ?? record
    : list

  if (!header || !featured || !list) return false

  setTourAnchor(header, 'citizen-announcements-header', ANNOUNCEMENTS_ANCHOR)
  setTourAnchor(featured, 'citizen-announcements-featured', ANNOUNCEMENTS_ANCHOR)
  setTourAnchor(list, 'citizen-announcements-list', ANNOUNCEMENTS_ANCHOR)
  setTourAnchor(record ?? list, 'citizen-announcements-record', ANNOUNCEMENTS_ANCHOR)
  setTourAnchor(metadata ?? record ?? list, 'citizen-announcements-metadata', ANNOUNCEMENTS_ANCHOR)
  return true
}

function CitizenAnnouncementsGuide({ user }: { user: AuthUser }) {
  const tour = useMemo<WalkthroughTour>(() => ({
    id: userScopedTourId('citizen-announcements-first-use', user.id),
    version: 1,
    title: 'Citizen Announcements guide',
    role: 'VULNERABLE',
    steps: [
      {
        id: 'welcome',
        title: 'Announcements is your official in-app notice board',
        description:
          'This page shows active notices intended for citizens or for everyone. It is read-only for Citizen accounts.',
        placement: 'center',
        eyebrow: 'Citizen announcements',
      },
      {
        id: 'purpose',
        title: 'Read the whole notice, not only its color or priority',
        description:
          'The title, message, type, priority, event date, time, location, and posting age work together. Color helps draw attention but does not replace the written instruction.',
        target: ANNOUNCEMENTS_TARGETS.header,
        placement: 'bottom',
        padding: 4,
      },
      {
        id: 'featured',
        title: 'Featured Announcements rotate automatically',
        description:
          'The carousel highlights a small number of current notices. Rotation does not mark a notice as read. Use the carousel controls or the full list when you need more time.',
        target: ANNOUNCEMENTS_TARGETS.featured,
        placement: 'auto',
        padding: 4,
      },
      {
        id: 'list',
        title: 'The full list shows active matching notices',
        description:
          'An empty list means no active announcement for citizens or everyone was returned at that moment. It does not guarantee that no municipal activity is happening outside CRMS.',
        target: ANNOUNCEMENTS_TARGETS.list,
        placement: 'auto',
        padding: 4,
      },
      {
        id: 'record',
        title: 'Type and priority help you understand the notice',
        description:
          'Urgent and High deserve prompt attention, but verify unclear instructions through official municipal contacts. Be cautious with screenshots or forwarded messages that differ from the current in-app notice.',
        target: ANNOUNCEMENTS_TARGETS.record,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'metadata',
        title: 'Check when, where, and how recently it was posted',
        description:
          'Event date and time describe the activity. Location shows where it is intended to happen. Posted time shows how old the notice is. Look for newer updates, postponements, or cancellations.',
        target: ANNOUNCEMENTS_TARGETS.metadata,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'finish',
        title: 'Confirm important instructions before relying on them',
        description:
          'Final check: Is this notice intended for citizens? Is it still active? Did I read the full message and event details? Have I confirmed urgent information that appears unclear, outdated, or inconsistent?',
        placement: 'center',
        eyebrow: 'Good notice practice',
      },
    ],
  }), [user.id])

  return (
    <ContextualFeatureGuide
      user={user}
      tour={tour}
      navId="announcements"
      label="Announcements guide"
      icon={<Megaphone className="h-4 w-4" />}
      discover={markAnnouncementAnchors}
      clear={clearAnnouncementAnchors}
      isFeatureVisible={citizenAnnouncementsVisible}
    />
  )
}

export function VulnerableFeatureWalkthroughs({ user }: { user: AuthUser }) {
  return (
    <>
      <CitizenProfileGuide user={user} />
      <CitizenReliefGuide user={user} />
      <CitizenFeedbackGuide user={user} />
      <CitizenAnnouncementsGuide user={user} />
    </>
  )
}
