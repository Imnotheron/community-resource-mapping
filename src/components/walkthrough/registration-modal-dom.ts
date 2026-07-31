'use client'

const TOUR_ANCHOR_ATTRIBUTE = 'data-registration-form-tour-anchor'
export const REGISTRATION_LAYOUT_ATTRIBUTE = 'data-registration-layout'

export const REGISTRATION_MODAL_TARGETS = {
  window: '[data-tour="registration-modal-window"]',
  progress: '[data-tour="registration-modal-progress"]',
  steps: '[data-tour="registration-modal-steps"]',
  drafts: '[data-tour="registration-modal-drafts"]',
  section: '[data-tour="registration-modal-section"]',
  saveDraft: '[data-tour="registration-modal-save-draft"]',
  footer: '[data-tour="registration-modal-footer"]',
  resize: '[data-tour="registration-modal-resize"]',
} as const

const STEP_KEYS = [
  'personal',
  'medical',
  'administrative',
  'documents',
  'review',
] as const

export type RegistrationModalExperience = {
  modal: HTMLElement
  controlsHost: HTMLElement
}

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

function findExact<T extends HTMLElement>(
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

function findStartingWith<T extends HTMLElement>(
  root: ParentNode,
  selector: string,
  text: string,
) {
  return (
    Array.from(root.querySelectorAll<T>(selector)).find(
      (element) =>
        isVisible(element) && normalizedText(element.textContent).startsWith(text),
    ) ?? null
  )
}

function setLayoutMarker(element: Element | null, name: string) {
  if (element instanceof HTMLElement) {
    element.setAttribute(REGISTRATION_LAYOUT_ATTRIBUTE, name)
  }
}

function setTourAnchor(element: Element | null, name: string) {
  if (!(element instanceof HTMLElement)) return
  element.setAttribute('data-tour', name)
  element.setAttribute(TOUR_ANCHOR_ATTRIBUTE, 'true')
}

function clearTourAnchors(modal: HTMLElement) {
  modal
    .querySelectorAll<HTMLElement>(`[${TOUR_ANCHOR_ATTRIBUTE}="true"]`)
    .forEach((element) => {
      element.removeAttribute('data-tour')
      element.removeAttribute(TOUR_ANCHOR_ATTRIBUTE)
    })

  if (modal.getAttribute(TOUR_ANCHOR_ATTRIBUTE) === 'true') {
    modal.removeAttribute('data-tour')
    modal.removeAttribute(TOUR_ANCHOR_ATTRIBUTE)
  }
}

function nextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve())
    })
  })
}

export function findVisibleRegistrationModal() {
  return (
    Array.from(
      document.querySelectorAll<HTMLElement>('[data-registration-modal]'),
    ).find(isVisible) ?? null
  )
}

export function markRegistrationModalExperience(): RegistrationModalExperience | null {
  const modal = findVisibleRegistrationModal()
  if (!modal) return null

  clearTourAnchors(modal)
  modal.setAttribute('data-registration-enhanced', 'true')

  const shell = Array.from(modal.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement &&
      child.classList.contains('flex') &&
      child.classList.contains('h-full') &&
      child.classList.contains('flex-col'),
  )

  if (!shell) return null

  const header = shell.children[0] instanceof HTMLElement ? shell.children[0] : null
  const body = shell.children[1] instanceof HTMLElement ? shell.children[1] : null
  const footer = shell.children[2] instanceof HTMLElement ? shell.children[2] : null
  if (!header || !body || !footer) return null

  const title = findExact<HTMLHeadingElement>(
    header,
    'h2',
    'Register Vulnerable Person',
  )
  const titleGroup = title?.parentElement ?? null
  const subtitle = titleGroup?.querySelector<HTMLElement>('p') ?? null
  const headerGrid = header.firstElementChild

  const progressLabel = findExact<HTMLElement>(header, 'p', 'Progress')
  const progressDescription = findExact<HTMLElement>(
    header,
    'p',
    'Required completion status',
  )
  const progressCard =
    progressLabel?.parentElement?.parentElement?.parentElement ?? null
  const headerProgressTrack = header.lastElementChild

  const controlsHost =
    headerGrid instanceof HTMLElement &&
    headerGrid.lastElementChild instanceof HTMLElement
      ? headerGrid.lastElementChild
      : null

  const draftShortcut = controlsHost
    ? findStartingWith<HTMLElement>(controlsHost, 'span', 'Drafts ')
    : null

  const rail = body.querySelector<HTMLElement>('aside')
  const railInner = rail?.firstElementChild instanceof HTMLElement
    ? rail.firstElementChild
    : null
  const stepNavigation =
    railInner?.firstElementChild instanceof HTMLElement
      ? railInner.firstElementChild
      : null
  const draftWrapper =
    stepNavigation?.nextElementSibling instanceof HTMLElement
      ? stepNavigation.nextElementSibling
      : null
  const draftCard =
    draftWrapper?.firstElementChild instanceof HTMLElement
      ? draftWrapper.firstElementChild
      : null

  const mainForm =
    rail?.nextElementSibling instanceof HTMLElement
      ? rail.nextElementSibling
      : Array.from(body.children).find(
          (child): child is HTMLElement =>
            child instanceof HTMLElement && child !== rail,
        ) ?? null
  const mainInner =
    mainForm?.firstElementChild instanceof HTMLElement
      ? mainForm.firstElementChild
      : null
  const sectionHeading = mainInner
    ? Array.from(mainInner.querySelectorAll<HTMLHeadingElement>('h3')).find(isVisible) ?? null
    : null
  const sectionTitle = sectionHeading?.parentElement ?? null

  const saveDraftButton =
    findStartingWith<HTMLButtonElement>(footer, 'button', 'Save Draft') ??
    findStartingWith<HTMLButtonElement>(footer, 'button', 'Update Draft') ??
    findStartingWith<HTMLButtonElement>(footer, 'button', 'Saving')

  const resizeHandle = Array.from(modal.children).find(
    (child): child is HTMLElement => {
      if (!(child instanceof HTMLElement)) return false
      const classes = String(child.className)
      return (
        classes.includes('bottom-0') &&
        classes.includes('right-0') &&
        classes.includes('cursor-nwse-resize')
      )
    },
  ) ?? null

  setLayoutMarker(header, 'header')
  setLayoutMarker(headerGrid, 'header-grid')
  setLayoutMarker(titleGroup, 'title-group')
  setLayoutMarker(subtitle, 'modal-subtitle')
  setLayoutMarker(progressCard, 'progress-card')
  setLayoutMarker(progressDescription, 'progress-description')
  setLayoutMarker(headerProgressTrack, 'header-progress-track')
  setLayoutMarker(controlsHost, 'header-controls')
  setLayoutMarker(draftShortcut, 'draft-shortcut')
  setLayoutMarker(body, 'body')
  setLayoutMarker(rail, 'rail')
  setLayoutMarker(railInner, 'rail-inner')
  setLayoutMarker(stepNavigation, 'step-navigation')
  setLayoutMarker(draftWrapper, 'draft-wrapper')
  setLayoutMarker(draftCard, 'draft-card')
  setLayoutMarker(mainForm, 'main-form')
  setLayoutMarker(mainInner, 'main-inner')
  setLayoutMarker(footer, 'footer')
  setLayoutMarker(resizeHandle, 'resize-handle')

  if (stepNavigation) {
    Array.from(stepNavigation.querySelectorAll<HTMLButtonElement>('button'))
      .slice(0, STEP_KEYS.length)
      .forEach((button, index) => {
        button.setAttribute('data-registration-step-index', String(index))
        button.setAttribute('data-registration-step-key', STEP_KEYS[index])
        setLayoutMarker(button, 'step-button')
      })
  }

  if (draftShortcut && draftCard) {
    draftShortcut.setAttribute('role', 'button')
    draftShortcut.setAttribute('tabindex', '0')
    draftShortcut.setAttribute('title', 'Show saved drafts')

    const showDrafts = () => {
      draftCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }

    draftShortcut.onclick = showDrafts
    draftShortcut.onkeydown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        showDrafts()
      }
    }
  }

  if (resizeHandle) {
    resizeHandle.setAttribute(
      'title',
      'Drag this corner to resize the registration window',
    )
  }

  setTourAnchor(modal, 'registration-modal-window')
  setTourAnchor(progressCard, 'registration-modal-progress')
  setTourAnchor(stepNavigation, 'registration-modal-steps')
  setTourAnchor(draftCard, 'registration-modal-drafts')
  setTourAnchor(sectionTitle, 'registration-modal-section')
  setTourAnchor(saveDraftButton, 'registration-modal-save-draft')
  setTourAnchor(footer, 'registration-modal-footer')
  setTourAnchor(resizeHandle, 'registration-modal-resize')

  return controlsHost ? { modal, controlsHost } : null
}

export async function showRegistrationModalStep(index: number) {
  const experience = markRegistrationModalExperience()
  const modal = experience?.modal
  if (!modal) return

  modal
    .querySelector<HTMLButtonElement>(
      `[data-registration-step-index="${index}"]`,
    )
    ?.click()

  await nextPaint()
  const refreshed = markRegistrationModalExperience()
  const mainForm = refreshed?.modal.querySelector<HTMLElement>(
    `[${REGISTRATION_LAYOUT_ATTRIBUTE}="main-form"]`,
  )
  mainForm?.scrollTo({ top: 0, behavior: 'auto' })
  await nextPaint()
}
