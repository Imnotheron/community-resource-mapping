'use client'

import { useMemo } from 'react'
import {
  Megaphone,
  NotebookPen,
  Package,
  PackagePlus,
  Printer,
  UserPlus,
} from 'lucide-react'

import type { AuthUser } from '@/lib/api-client'
import { userScopedTourId } from '@/components/walkthrough/onboarding-policy'
import type { WalkthroughTour } from '@/components/walkthrough/types'
import { ContextualFeatureGuide } from '@/components/walkthrough/tours/contextual-feature-guide'
import {
  ancestorContaining,
  clearTourAnchors,
  findButton,
  findCard,
  findContaining,
  findExact,
  findHeading,
  isVisible,
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

function fieldGroup(root: ParentNode, labelText: string, evidence: string[] = []) {
  const label = findExact<HTMLElement>(root, 'label', labelText)
  return label
    ? ancestorContaining(label, [labelText, ...evidence], 4)
    : null
}

function hasLoadingText(root: ParentNode, values: string[]) {
  return Array.from(root.querySelectorAll<HTMLElement>('p, span, div')).some(
    (element) =>
      isVisible(element) && values.includes(normalizedText(element.textContent)),
  )
}

// ---------------------------------------------------------------------------
// My Distributions
// ---------------------------------------------------------------------------

const DISTRIBUTIONS_ANCHOR = 'data-worker-distributions-tour-anchor'
const DISTRIBUTIONS_TARGETS = {
  header: '[data-tour="worker-distributions-header"]',
  filter: '[data-tour="worker-distributions-filter"]',
  list: '[data-tour="worker-distributions-list"]',
  record: '[data-tour="worker-distributions-record"]',
  status: '[data-tour="worker-distributions-status"]',
  details: '[data-tour="worker-distributions-details"]',
  notes: '[data-tour="worker-distributions-notes"]',
  rejection: '[data-tour="worker-distributions-rejection"]',
} as const

function clearDistributionsAnchors() {
  clearTourAnchors(DISTRIBUTIONS_ANCHOR)
}

function distributionsVisible() {
  return Boolean(findHeading('My Distributions'))
}

function markDistributionsAnchors() {
  clearDistributionsAnchors()
  const root = featureRoot('My Distributions')
  const heading = findHeading('My Distributions')
  if (!root || !heading) return false

  if (hasLoadingText(root, ['Loading distributions', 'Fetching your field records...'])) {
    return false
  }

  const header = ancestorContaining(heading, [
    'My Distributions',
    'Relief distributions you have recorded.',
  ], 3)
  const filterTrigger = Array.from(
    root.querySelectorAll<HTMLElement>('[role="combobox"]'),
  ).find(isVisible) ?? null
  const filter = filterTrigger?.parentElement instanceof HTMLElement
    ? filterTrigger.parentElement
    : filterTrigger

  const cards = Array.from(
    root.querySelectorAll<HTMLElement>('[data-slot="card"]'),
  ).filter(isVisible)
  const record = cards.find((card) => {
    const text = normalizedText(card.textContent)
    return text.includes('Beneficiary:') && text.includes('Quantity:') && text.includes('Date:')
  }) ?? null
  const emptyText = findExact<HTMLElement>(root, 'div, p', 'No distributions found.')
  const empty = emptyText?.closest<HTMLElement>('[data-slot="card"]') ?? emptyText
  const list = record?.parentElement instanceof HTMLElement
    ? record.parentElement
    : empty
  const title = record?.querySelector<HTMLElement>('h3') ?? null
  const status = title
    ? ancestorContaining(title, [normalizedText(title.textContent)], 2)
    : record
  const details = record
    ? Array.from(record.querySelectorAll<HTMLElement>('div')).find((element) => {
        const text = normalizedText(element.textContent)
        return isVisible(element) && text.includes('Beneficiary:') && text.includes('Recorded:')
      }) ?? record
    : empty
  const notes = record
    ? Array.from(record.querySelectorAll<HTMLElement>('p')).find((element) => {
        const text = normalizedText(element.textContent)
        return isVisible(element) && text.startsWith('"') && text.endsWith('"')
      }) ?? record
    : empty
  const rejection = record
    ? findContaining<HTMLElement>(record, 'p', 'Rejection:') ?? record
    : empty

  if (!header || !filter || !list) return false

  setTourAnchor(header, 'worker-distributions-header', DISTRIBUTIONS_ANCHOR)
  setTourAnchor(filter, 'worker-distributions-filter', DISTRIBUTIONS_ANCHOR)
  setTourAnchor(list, 'worker-distributions-list', DISTRIBUTIONS_ANCHOR)
  setTourAnchor(record ?? empty, 'worker-distributions-record', DISTRIBUTIONS_ANCHOR)
  setTourAnchor(status ?? record ?? empty, 'worker-distributions-status', DISTRIBUTIONS_ANCHOR)
  setTourAnchor(details ?? record ?? empty, 'worker-distributions-details', DISTRIBUTIONS_ANCHOR)
  setTourAnchor(notes ?? record ?? empty, 'worker-distributions-notes', DISTRIBUTIONS_ANCHOR)
  setTourAnchor(rejection ?? record ?? empty, 'worker-distributions-rejection', DISTRIBUTIONS_ANCHOR)
  return true
}

function WorkerDistributionsGuide({ user }: { user: AuthUser }) {
  const tour = useMemo<WalkthroughTour>(() => ({
    id: userScopedTourId('worker-my-distributions-first-use', user.id),
    version: 1,
    title: 'My Distributions guide',
    role: 'WORKER',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to My Distributions',
        description:
          'This page shows only the relief records attributed to your signed-in Worker account. The guide will not change a status or create another distribution.',
        placement: 'center',
        eyebrow: 'Worker distribution history',
      },
      {
        id: 'purpose',
        title: 'Use this page to follow Administrator decisions',
        description:
          'A distribution can be Pending, Approved, or Rejected. The current status reflects the database record, not a new action performed on this page.',
        target: DISTRIBUTIONS_TARGETS.header,
        placement: 'bottom',
        padding: 4,
      },
      {
        id: 'filter',
        title: 'Filter without changing the records',
        description:
          'All shows every distribution under your account. Pending, Approved, and Rejected narrow the visible list. Changing this filter does not submit, approve, or delete anything.',
        target: DISTRIBUTIONS_TARGETS.filter,
        placement: 'bottom',
        padding: 3,
      },
      {
        id: 'list',
        title: 'An empty filter is not an empty history',
        description:
          'No distributions found can mean the selected status has no matching records. Return to All before concluding that no distribution has ever been recorded.',
        target: DISTRIBUTIONS_TARGETS.list,
        placement: 'auto',
        padding: 4,
      },
      {
        id: 'status',
        title: 'Read the status before reporting completion',
        description:
          'Pending is awaiting Administrator review. Approved means the record was accepted. Rejected means it was not accepted as recorded. Do not describe Pending assistance as officially approved.',
        target: DISTRIBUTIONS_TARGETS.status,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'details',
        title: 'Verify the beneficiary, quantity, and dates together',
        description:
          'Beneficiary identifies the linked citizen. Quantity is the numeric amount entered for the record. Date is the distribution date, while Recorded shows how long ago the database entry was created. Those dates can describe different moments.',
        target: DISTRIBUTIONS_TARGETS.details,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'notes',
        title: 'Notes are part of the operational record',
        description:
          'When notes are present, read them together with the item description and status. Notes should stay factual and must not be treated as proof when they conflict with verified source records.',
        target: DISTRIBUTIONS_TARGETS.notes,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'rejection',
        title: 'Use the rejection reason for follow-up',
        description:
          'A rejected record may show the Administrator’s reason. Read it before repeating the same submission. This screen currently has no Edit or Resubmit action, so correct the underlying information through the authorized workflow.',
        target: DISTRIBUTIONS_TARGETS.rejection,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'finish',
        title: 'Keep your field record and the approval decision separate',
        description:
          'Final check: Is this my record? Is the beneficiary correct? Did I read the current status and any rejection reason? Am I describing what the system actually shows rather than assuming approval?',
        placement: 'center',
        eyebrow: 'Good review practice',
      },
    ],
  }), [user.id])

  return (
    <ContextualFeatureGuide
      user={user}
      tour={tour}
      navId="my-distributions"
      label="Distributions guide"
      icon={<Package className="h-4 w-4" />}
      discover={markDistributionsAnchors}
      clear={clearDistributionsAnchors}
      isFeatureVisible={distributionsVisible}
    />
  )
}

// ---------------------------------------------------------------------------
// Record Distribution
// ---------------------------------------------------------------------------

const RECORD_ANCHOR = 'data-worker-record-distribution-tour-anchor'
const RECORD_TARGETS = {
  header: '[data-tour="worker-record-header"]',
  form: '[data-tour="worker-record-form"]',
  beneficiary: '[data-tour="worker-record-beneficiary"]',
  type: '[data-tour="worker-record-type"]',
  items: '[data-tour="worker-record-items"]',
  quantity: '[data-tour="worker-record-quantity"]',
  notes: '[data-tour="worker-record-notes"]',
  submit: '[data-tour="worker-record-submit"]',
} as const

function clearRecordAnchors() {
  clearTourAnchors(RECORD_ANCHOR)
}

function recordVisible() {
  return Boolean(findHeading('Record Relief Distribution'))
}

function markRecordAnchors() {
  clearRecordAnchors()
  const root = featureRoot('Record Relief Distribution')
  const heading = findHeading('Record Relief Distribution')
  if (!root || !heading) return false

  if (hasLoadingText(root, ['Loading beneficiaries', 'Fetching approved citizens...'])) {
    return false
  }

  const header = ancestorContaining(heading, [
    'Record Relief Distribution',
    'Log a new relief distribution for an approved citizen.',
  ], 3)
  const submit = findButton(root, 'Record Distribution')
  const form = submit?.closest<HTMLElement>('[data-slot="card"]') ?? null
  const beneficiary = fieldGroup(root, 'Beneficiary (approved citizens)')
  const type = fieldGroup(root, 'Distribution Type')
  const items = fieldGroup(root, 'Items Provided')
  const quantity = fieldGroup(root, 'Quantity')
  const notes = fieldGroup(root, 'Notes (optional)')

  if (!header || !form || !beneficiary || !type || !items || !quantity || !notes || !submit) {
    return false
  }

  setTourAnchor(header, 'worker-record-header', RECORD_ANCHOR)
  setTourAnchor(form, 'worker-record-form', RECORD_ANCHOR)
  setTourAnchor(beneficiary, 'worker-record-beneficiary', RECORD_ANCHOR)
  setTourAnchor(type, 'worker-record-type', RECORD_ANCHOR)
  setTourAnchor(items, 'worker-record-items', RECORD_ANCHOR)
  setTourAnchor(quantity, 'worker-record-quantity', RECORD_ANCHOR)
  setTourAnchor(notes, 'worker-record-notes', RECORD_ANCHOR)
  setTourAnchor(submit, 'worker-record-submit', RECORD_ANCHOR)
  return true
}

function WorkerRecordDistributionGuide({ user }: { user: AuthUser }) {
  const tour = useMemo<WalkthroughTour>(() => ({
    id: userScopedTourId('worker-record-distribution-first-use', user.id),
    version: 1,
    title: 'Record Distribution guide',
    role: 'WORKER',
    steps: [
      {
        id: 'welcome',
        title: 'Record one verified distribution at a time',
        description:
          'This form creates an operational relief record under your Worker account. The guide will not choose a beneficiary, enter values, or submit the form.',
        placement: 'center',
        eyebrow: 'Worker distribution entry',
      },
      {
        id: 'purpose',
        title: 'Submission is not Administrator approval',
        description:
          'A successful submission creates a Pending distribution. It must still be reviewed in Relief Approval. Record what was actually provided; do not use this form for a planned or promised distribution that did not occur.',
        target: RECORD_TARGETS.header,
        placement: 'bottom',
        padding: 4,
      },
      {
        id: 'beneficiary',
        title: 'Select the correct approved citizen',
        description:
          'The list contains approved vulnerable profiles. Verify the person and barangay before continuing. If no approved citizens are available, do not create a substitute or duplicate record—complete the authorized registration and approval process first.',
        target: RECORD_TARGETS.beneficiary,
        placement: 'bottom',
        padding: 3,
      },
      {
        id: 'type',
        title: 'Choose the category that best describes the assistance',
        description:
          'Distribution Type provides the broad category such as Food Pack, Hygiene Kit, Cash Assistance, Medical Supplies, Shelter Materials, or Other. The item details still need to explain what was actually provided.',
        target: RECORD_TARGETS.type,
        placement: 'bottom',
        padding: 3,
      },
      {
        id: 'items',
        title: 'Describe the actual contents clearly',
        description:
          'Items Provided should be specific enough for another authorized reviewer to understand the assistance, for example item names, package size, or units. Avoid vague text such as supplies when a clearer description is available.',
        target: RECORD_TARGETS.items,
        placement: 'bottom',
        padding: 3,
      },
      {
        id: 'quantity',
        title: 'Quantity must be a positive whole number',
        description:
          'Enter the numeric quantity that matches the way the assistance is being counted. The server rejects zero, negative, non-whole, and unreasonably large values. Make sure the number and item description use the same unit.',
        target: RECORD_TARGETS.quantity,
        placement: 'bottom',
        padding: 3,
      },
      {
        id: 'notes',
        title: 'Use notes only for useful operational context',
        description:
          'Notes are optional. Add facts needed for review, such as delivery context or a relevant discrepancy. Do not include passwords, gossip, unrelated medical detail, or personal information that the review does not require.',
        target: RECORD_TARGETS.notes,
        placement: 'top',
        padding: 3,
      },
      {
        id: 'submit',
        title: 'Record Distribution creates the Pending record',
        description:
          'The button is enabled after a beneficiary is selected. Before pressing it, recheck beneficiary, category, items, quantity, and notes. The guide highlights the button but will not submit anything.',
        target: RECORD_TARGETS.submit,
        placement: 'top',
        padding: 3,
      },
      {
        id: 'finish',
        title: 'Accuracy matters more than speed',
        description:
          'Final check: Did the distribution actually occur? Is the beneficiary correct? Do the item description and quantity agree? Is every note factual? Am I prepared for an Administrator to review this exact record?',
        placement: 'center',
        eyebrow: 'Ready to record',
      },
    ],
  }), [user.id])

  return (
    <ContextualFeatureGuide
      user={user}
      tour={tour}
      navId="new-distribution"
      label="Record guide"
      icon={<PackagePlus className="h-4 w-4" />}
      discover={markRecordAnchors}
      clear={clearRecordAnchors}
      isFeatureVisible={recordVisible}
    />
  )
}

// ---------------------------------------------------------------------------
// Register Citizen landing screen
// ---------------------------------------------------------------------------

const REGISTER_ANCHOR = 'data-worker-register-tour-anchor'
const REGISTER_TARGETS = {
  header: '[data-tour="worker-register-header"]',
  card: '[data-tour="worker-register-card"]',
  open: '[data-tour="worker-register-open"]',
} as const

function clearRegisterAnchors() {
  clearTourAnchors(REGISTER_ANCHOR)
}

function registerVisible() {
  return Boolean(findHeading('Register Vulnerable Citizen'))
}

function markRegisterAnchors() {
  clearRegisterAnchors()
  const root = featureRoot('Register Vulnerable Citizen')
  const heading = findHeading('Register Vulnerable Citizen')
  if (!root || !heading) return false

  const header = ancestorContaining(heading, [
    'Register Vulnerable Citizen',
    'Workers now use the same guided registration form as Admin',
  ], 3)
  const open = findButton(root, 'Register Vulnerable Person')
  const card = open?.closest<HTMLElement>('[data-slot="card"]') ?? null
  if (!header || !open || !card) return false

  setTourAnchor(header, 'worker-register-header', REGISTER_ANCHOR)
  setTourAnchor(card, 'worker-register-card', REGISTER_ANCHOR)
  setTourAnchor(open, 'worker-register-open', REGISTER_ANCHOR)
  return true
}

function WorkerRegisterCitizenGuide({ user }: { user: AuthUser }) {
  const tour = useMemo<WalkthroughTour>(() => ({
    id: userScopedTourId('worker-register-citizen-first-use', user.id),
    version: 1,
    title: 'Register Citizen guide',
    role: 'WORKER',
    steps: [
      {
        id: 'welcome',
        title: 'Register a citizen only after checking for an existing record',
        description:
          'This page opens the shared five-part registration form. The guide will not open or submit the form automatically.',
        placement: 'center',
        eyebrow: 'Worker registration entry',
      },
      {
        id: 'purpose',
        title: 'Worker registrations require Administrator approval',
        description:
          'A Worker-created vulnerable profile is submitted as Pending. It does not become approved just because the form was completed. Confirm identity and search for an existing account before creating a new one.',
        target: REGISTER_TARGETS.header,
        placement: 'bottom',
        padding: 4,
      },
      {
        id: 'workflow',
        title: 'The shared form includes drafts, map location, documents, and review',
        description:
          'The modal uses the same Personal, Medical, Administrative, Documents, and Review sections. Saved drafts help you pause, but attached files are not stored in a draft and must be chosen again.',
        target: REGISTER_TARGETS.card,
        placement: 'auto',
        padding: 4,
      },
      {
        id: 'documents',
        title: 'Current Worker submission records document availability, not uploaded files',
        description:
          'The present Worker API removes File objects before sending the registration. Document-availability flags can be recorded, but the actual files are not uploaded by this Worker workflow yet. Keep required source documents through the approved municipal process.',
        target: REGISTER_TARGETS.card,
        placement: 'auto',
        padding: 4,
      },
      {
        id: 'open',
        title: 'Open the form when the person and consent are ready',
        description:
          'Register Vulnerable Person opens the modal. Inside it, use Form guide for the detailed 14-step walkthrough. The guide highlights this button but will not open the form for you.',
        target: REGISTER_TARGETS.open,
        placement: 'top',
        padding: 3,
      },
      {
        id: 'finish',
        title: 'Prepare before opening the registration form',
        description:
          'Have the correct person, informed consent, identity and address information, vulnerability details, emergency contact, and required supporting evidence ready. Avoid duplicate accounts and never invent missing information.',
        placement: 'center',
        eyebrow: 'Ready to register',
      },
    ],
  }), [user.id])

  return (
    <ContextualFeatureGuide
      user={user}
      tour={tour}
      navId="register-vulnerable"
      label="Registration guide"
      icon={<UserPlus className="h-4 w-4" />}
      discover={markRegisterAnchors}
      clear={clearRegisterAnchors}
      isFeatureVisible={registerVisible}
    />
  )
}

// ---------------------------------------------------------------------------
// Field Notes
// ---------------------------------------------------------------------------

const NOTES_ANCHOR = 'data-worker-field-notes-tour-anchor'
const NOTES_TARGETS = {
  header: '[data-tour="worker-notes-header"]',
  entry: '[data-tour="worker-notes-entry"]',
  message: '[data-tour="worker-notes-message"]',
  save: '[data-tour="worker-notes-save"]',
  recent: '[data-tour="worker-notes-recent"]',
  record: '[data-tour="worker-notes-record"]',
} as const

function clearNotesAnchors() {
  clearTourAnchors(NOTES_ANCHOR)
}

function notesVisible() {
  return Boolean(findHeading('Field Notes'))
}

function markNotesAnchors() {
  clearNotesAnchors()
  const root = featureRoot('Field Notes')
  const heading = findHeading('Field Notes')
  if (!root || !heading) return false

  if (hasLoadingText(root, ['Loading field notes', 'Fetching recent observations...'])) {
    return false
  }

  const header = ancestorContaining(heading, [
    'Field Notes',
    'Record observations and updates from the field.',
  ], 3)
  const save = findButton(root, 'Save Note')
  const entry = save?.closest<HTMLElement>('[data-slot="card"]') ?? null
  const message = entry?.querySelector<HTMLElement>('textarea') ?? null
  const recentHeading = findExact<HTMLElement>(root, 'h3', 'Recent Notes')
  const recent = recentHeading?.parentElement instanceof HTMLElement
    ? recentHeading.parentElement
    : null
  const noteRecord = recent
    ? Array.from(recent.querySelectorAll<HTMLElement>('[data-slot="card"]')).find(isVisible) ??
      findExact<HTMLElement>(recent, 'p', 'No field notes yet.')
    : null

  if (!header || !entry || !message || !save || !recent || !noteRecord) return false

  setTourAnchor(header, 'worker-notes-header', NOTES_ANCHOR)
  setTourAnchor(entry, 'worker-notes-entry', NOTES_ANCHOR)
  setTourAnchor(message, 'worker-notes-message', NOTES_ANCHOR)
  setTourAnchor(save, 'worker-notes-save', NOTES_ANCHOR)
  setTourAnchor(recent, 'worker-notes-recent', NOTES_ANCHOR)
  setTourAnchor(noteRecord, 'worker-notes-record', NOTES_ANCHOR)
  return true
}

function WorkerFieldNotesGuide({ user }: { user: AuthUser }) {
  const tour = useMemo<WalkthroughTour>(() => ({
    id: userScopedTourId('worker-field-notes-first-use', user.id),
    version: 1,
    title: 'Field Notes guide',
    role: 'WORKER',
    steps: [
      {
        id: 'welcome',
        title: 'Use Field Notes for concise operational facts',
        description:
          'This screen saves observations under your Worker account. The guide will not enter or save a note.',
        placement: 'center',
        eyebrow: 'Worker field notes',
      },
      {
        id: 'purpose',
        title: 'A field note is an accountable record',
        description:
          'Record what you directly observed, what follow-up is needed, and when useful context occurred. Avoid guesses, gossip, copied passwords, unnecessary medical details, or unrelated personal information.',
        target: NOTES_TARGETS.header,
        placement: 'bottom',
        padding: 4,
      },
      {
        id: 'message',
        title: 'Write enough context for another authorized reviewer',
        description:
          'A useful note identifies the situation clearly without becoming a full personal history. State facts, distinguish reported information from direct observation, and avoid language that is insulting or judgmental.',
        target: NOTES_TARGETS.message,
        placement: 'bottom',
        padding: 3,
      },
      {
        id: 'save',
        title: 'Save Note creates the record immediately',
        description:
          'The button remains disabled while the note is blank. The current screen has no Edit or Delete control after saving, so review spelling, names, dates, and sensitive details first. The guide will not press Save Note.',
        target: NOTES_TARGETS.save,
        placement: 'top',
        padding: 3,
      },
      {
        id: 'recent',
        title: 'Recent Notes shows the latest records returned for your account',
        description:
          'The list is ordered newest first. An empty list means no matching Field Note record was returned; it does not prove that no other operational record exists elsewhere in CRMS.',
        target: NOTES_TARGETS.recent,
        placement: 'auto',
        padding: 4,
      },
      {
        id: 'record',
        title: 'Read the note and timestamp together',
        description:
          'The timestamp shows when the record was created. It may differ from when the field event occurred, so include the event date or timing in the note when that distinction matters.',
        target: NOTES_TARGETS.record,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'finish',
        title: 'Save only what is useful, factual, and authorized',
        description:
          'Final check: Did I directly observe this or clearly label it as reported? Is the timing understandable? Is every personal detail necessary for municipal follow-up? Am I comfortable with an authorized reviewer reading this exact wording?',
        placement: 'center',
        eyebrow: 'Good note practice',
      },
    ],
  }), [user.id])

  return (
    <ContextualFeatureGuide
      user={user}
      tour={tour}
      navId="field-notes"
      label="Field Notes guide"
      icon={<NotebookPen className="h-4 w-4" />}
      discover={markNotesAnchors}
      clear={clearNotesAnchors}
      isFeatureVisible={notesVisible}
    />
  )
}

// ---------------------------------------------------------------------------
// Worker Announcements
// ---------------------------------------------------------------------------

const ANNOUNCEMENTS_ANCHOR = 'data-worker-announcements-tour-anchor'
const ANNOUNCEMENT_TARGETS = {
  header: '[data-tour="worker-announcements-header"]',
  featured: '[data-tour="worker-announcements-featured"]',
  list: '[data-tour="worker-announcements-list"]',
  record: '[data-tour="worker-announcements-record"]',
  metadata: '[data-tour="worker-announcements-metadata"]',
} as const

function clearAnnouncementAnchors() {
  clearTourAnchors(ANNOUNCEMENTS_ANCHOR)
}

function workerAnnouncementsVisible() {
  const heading = findHeading('Announcements')
  if (!heading) return false
  const root = featureRoot('Announcements')
  return Boolean(
    root && normalizedText(root.textContent).includes('Notices from administrators.'),
  )
}

function markAnnouncementAnchors() {
  clearAnnouncementAnchors()
  const root = featureRoot('Announcements')
  const heading = findHeading('Announcements')
  if (!root || !heading || !normalizedText(root.textContent).includes('Notices from administrators.')) {
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
    'Notices from administrators.',
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
    return text !== 'No announcements.' && text.length > 0
  }) ?? null
  const empty = findExact<HTMLElement>(root, 'div, p', 'No announcements.')
  const listTarget = record?.parentElement instanceof HTMLElement
    ? record.parentElement
    : empty?.closest<HTMLElement>('[data-slot="card"]') ?? empty
  const metadata = record
    ? Array.from(record.querySelectorAll<HTMLElement>('div')).find((element) => {
        const text = normalizedText(element.textContent)
        return isVisible(element) && (text.includes('🕒') || text.includes('📅') || text.includes('📍'))
      }) ?? record
    : listTarget

  if (!header || !featured || !listTarget) return false

  setTourAnchor(header, 'worker-announcements-header', ANNOUNCEMENTS_ANCHOR)
  setTourAnchor(featured, 'worker-announcements-featured', ANNOUNCEMENTS_ANCHOR)
  setTourAnchor(listTarget, 'worker-announcements-list', ANNOUNCEMENTS_ANCHOR)
  setTourAnchor(record ?? listTarget, 'worker-announcements-record', ANNOUNCEMENTS_ANCHOR)
  setTourAnchor(metadata ?? record ?? listTarget, 'worker-announcements-metadata', ANNOUNCEMENTS_ANCHOR)
  return true
}

function WorkerAnnouncementsGuide({ user }: { user: AuthUser }) {
  const tour = useMemo<WalkthroughTour>(() => ({
    id: userScopedTourId('worker-announcements-first-use', user.id),
    version: 1,
    title: 'Worker Announcements guide',
    role: 'WORKER',
    steps: [
      {
        id: 'welcome',
        title: 'Use Announcements as an official notice board',
        description:
          'This page shows active notices addressed to Workers or to everyone. It is read-only for Worker accounts.',
        placement: 'center',
        eyebrow: 'Worker announcements',
      },
      {
        id: 'purpose',
        title: 'Read the complete notice before acting',
        description:
          'Priority, title, message, event details, and posting time work together. A badge or color alone is not enough to understand an instruction.',
        target: ANNOUNCEMENT_TARGETS.header,
        placement: 'bottom',
        padding: 4,
      },
      {
        id: 'featured',
        title: 'Featured Announcements rotate automatically',
        description:
          'The carousel highlights a small set of current notices. Rotation does not change priority or mark a notice as read. Pause long enough to read the full message and use the carousel controls when needed.',
        target: ANNOUNCEMENT_TARGETS.featured,
        placement: 'auto',
        padding: 4,
      },
      {
        id: 'list',
        title: 'Use the full list when the featured area is not enough',
        description:
          'The list contains the active announcements returned for the Worker role. An empty list means no active matching notice was returned at that moment.',
        target: ANNOUNCEMENT_TARGETS.list,
        placement: 'auto',
        padding: 4,
      },
      {
        id: 'record',
        title: 'Type and priority describe the notice—not certainty',
        description:
          'Type groups the subject. Priority shows the publisher’s urgency level. For urgent operational instructions, confirm unclear or conflicting information through the authorized municipal channel before acting.',
        target: ANNOUNCEMENT_TARGETS.record,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'metadata',
        title: 'Check event date, time, location, and posting age',
        description:
          'Event details describe when and where an activity is intended to happen. Posted time shows the age of the notice, not necessarily the event date. Watch for updates or cancellation notices.',
        target: ANNOUNCEMENT_TARGETS.metadata,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'finish',
        title: 'Confirm before carrying an announcement into field work',
        description:
          'Final check: Is the notice intended for Workers? Is it still active? Did I read the full instruction and event details? Have I confirmed anything urgent that is unclear, outdated, or inconsistent?',
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
      isFeatureVisible={workerAnnouncementsVisible}
    />
  )
}

// ---------------------------------------------------------------------------
// Worker Daily Reports
// ---------------------------------------------------------------------------

const REPORTS_ANCHOR = 'data-worker-reports-tour-anchor'
const REPORTS_TARGETS = {
  header: '[data-tour="worker-reports-header"]',
  date: '[data-tour="worker-reports-date"]',
  summary: '[data-tour="worker-reports-summary"]',
  distributions: '[data-tour="worker-reports-distributions"]',
  notes: '[data-tour="worker-reports-notes"]',
  print: '[data-tour="worker-reports-print"]',
  report: '[data-tour="worker-reports-report"]',
} as const

function clearReportsAnchors() {
  clearTourAnchors(REPORTS_ANCHOR)
}

function workerReportsVisible() {
  const heading = findHeading('Daily Reports')
  if (!heading) return false
  const root = featureRoot('Daily Reports')
  return Boolean(root && normalizedText(root.textContent).includes('Daily Worker Accomplishment Report'))
}

function reportSection(root: ParentNode, title: string) {
  const heading = findExact<HTMLElement>(root, 'h2', title)
  return heading ? ancestorContaining(heading, [title], 3) : null
}

function markReportsAnchors() {
  clearReportsAnchors()
  const root = featureRoot('Daily Reports')
  const heading = findHeading('Daily Reports')
  if (!root || !heading) return false

  if (hasLoadingText(root, [
    'Generating daily report',
    'Calculating registrations, distributions, workers, and field activity...',
  ])) {
    return false
  }

  const report = root.querySelector<HTMLElement>('.report-print-root')
  const noData = findExact<HTMLElement>(root, 'p', 'No report data is available.')
  const reportTarget = report ?? noData?.closest<HTMLElement>('[data-slot="card"]') ?? noData
  if (!reportTarget) return false

  const header = ancestorContaining(heading, [
    'Daily Reports',
    'Generate a date-based report, verify the figures, then print it on A4 paper.',
  ], 3)
  const dateInput = root.querySelector<HTMLInputElement>('#report-date')
  const date = dateInput ? ancestorContaining(dateInput, ['Report date'], 3) : null
  const summary = report ? reportSection(report, 'Daily Summary') : reportTarget
  const distributions = report ? reportSection(report, 'Relief Distributions') : reportTarget
  const notes = report ? reportSection(report, 'Field Notes') : reportTarget
  const print = findButton(root, 'Print Report')

  if (!header || !date || !summary || !distributions || !notes || !print) return false

  setTourAnchor(header, 'worker-reports-header', REPORTS_ANCHOR)
  setTourAnchor(date, 'worker-reports-date', REPORTS_ANCHOR)
  setTourAnchor(summary, 'worker-reports-summary', REPORTS_ANCHOR)
  setTourAnchor(distributions, 'worker-reports-distributions', REPORTS_ANCHOR)
  setTourAnchor(notes, 'worker-reports-notes', REPORTS_ANCHOR)
  setTourAnchor(print, 'worker-reports-print', REPORTS_ANCHOR)
  setTourAnchor(reportTarget, 'worker-reports-report', REPORTS_ANCHOR)
  return true
}

function WorkerReportsGuide({ user }: { user: AuthUser }) {
  const tour = useMemo<WalkthroughTour>(() => ({
    id: userScopedTourId('worker-daily-reports-first-use', user.id),
    version: 1,
    title: 'Worker Daily Reports guide',
    role: 'WORKER',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to your Daily Accomplishment Report',
        description:
          'This report summarizes records attributed to your signed-in Worker account for one Philippine calendar date. The guide will not change the date or open the print window.',
        placement: 'center',
        eyebrow: 'Worker daily reporting',
      },
      {
        id: 'purpose',
        title: 'The report summarizes CRMS records—it does not verify them independently',
        description:
          'Review the underlying distributions and field notes before signing or circulating a report. A generated total can still reflect an incorrect beneficiary, quantity, date, status, or note.',
        target: REPORTS_TARGETS.header,
        placement: 'bottom',
        padding: 4,
      },
      {
        id: 'date',
        title: 'The selected day follows Asia/Manila time',
        description:
          'Changing Report date loads the Worker report from midnight to midnight in Philippine time. Confirm the Report Date printed inside the report, especially when activity was recorded around midnight.',
        target: REPORTS_TARGETS.date,
        placement: 'bottom',
        padding: 3,
      },
      {
        id: 'summary',
        title: 'Read record counts and item quantity separately',
        description:
          'Distributions counts records. Approved, Pending, and Rejected divide those records by current status. Total Quantity adds the numeric quantity fields and is not the number of beneficiaries. Field Notes counts notes saved through the Worker Field Notes screen for the selected day.',
        target: REPORTS_TARGETS.summary,
        placement: 'auto',
        padding: 4,
      },
      {
        id: 'assigned',
        title: 'Assigned Households is a current assignment count',
        description:
          'Assigned Households counts households currently linked to your Worker account. It is not limited to households visited on the selected date, so do not treat it as a daily accomplishment total.',
        target: REPORTS_TARGETS.summary,
        placement: 'auto',
        padding: 4,
      },
      {
        id: 'distributions',
        title: 'Use the detail rows to verify the summary',
        description:
          'Each row shows beneficiary or household, barangay, items, quantity, and status. Pending and Rejected records remain part of the day’s recorded activity but must not be reported as approved assistance.',
        target: REPORTS_TARGETS.distributions,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'notes',
        title: 'Field Notes are printed with their saved timestamps',
        description:
          'The report shows the note text and creation time. Check that sensitive details are necessary before printing. A note’s creation time can differ from the time of the field event described in it.',
        target: REPORTS_TARGETS.notes,
        placement: 'auto',
        padding: 3,
      },
      {
        id: 'print',
        title: 'Print only after reviewing personal and operational data',
        description:
          'Print Report opens the browser print dialog and formats the document for A4 portrait paper. Confirm the date, printer, page range, intended recipient, and secure storage before creating paper or PDF copies.',
        target: REPORTS_TARGETS.print,
        placement: 'bottom',
        padding: 3,
      },
      {
        id: 'finish',
        title: 'Sign only a report you have checked against the source records',
        description:
          'Final check: Is the date correct? Do the rows support the totals? Are Pending and Rejected records described accurately? Are field notes appropriate for the audience? Is the report being shared only with authorized people?',
        placement: 'center',
        eyebrow: 'Good reporting practice',
      },
    ],
  }), [user.id])

  return (
    <ContextualFeatureGuide
      user={user}
      tour={tour}
      navId="reports"
      label="Daily Reports guide"
      icon={<Printer className="h-4 w-4" />}
      discover={markReportsAnchors}
      clear={clearReportsAnchors}
      isFeatureVisible={workerReportsVisible}
    />
  )
}

export function WorkerFeatureWalkthroughs({ user }: { user: AuthUser }) {
  return (
    <>
      <WorkerDistributionsGuide user={user} />
      <WorkerRecordDistributionGuide user={user} />
      <WorkerRegisterCitizenGuide user={user} />
      <WorkerFieldNotesGuide user={user} />
      <WorkerAnnouncementsGuide user={user} />
      <WorkerReportsGuide user={user} />
    </>
  )
}
