const ALIAS_MARKER = 'data-contextual-tour-alias'
const POSITION_PATCH = 'data-contextual-tour-position-patched'
const ORIGINAL_POSITION = 'data-contextual-tour-original-position'

export function normalizedText(value: string | null | undefined) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

export function isVisible(element: HTMLElement) {
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

export function findExact<T extends HTMLElement>(
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

export function findContaining<T extends HTMLElement>(
  root: ParentNode,
  selector: string,
  text: string,
) {
  return (
    Array.from(root.querySelectorAll<T>(selector)).find(
      (element) =>
        isVisible(element) && normalizedText(element.textContent).includes(text),
    ) ?? null
  )
}

export function findButton(root: ParentNode, text: string) {
  return findExact<HTMLButtonElement>(root, 'button', text)
}

export function ancestorContaining(
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

export function findCard(root: ParentNode, title: string) {
  const heading = findExact<HTMLElement>(
    root,
    '[data-slot="card-title"], h2, h3, h4',
    title,
  )
  return heading?.closest<HTMLElement>('[data-slot="card"]') ?? null
}

export function findHeading(text: string) {
  return findExact<HTMLHeadingElement>(document, 'h1', text)
}

function restorePosition(element: HTMLElement) {
  if (element.getAttribute(POSITION_PATCH) !== 'true') return

  const original = element.getAttribute(ORIGINAL_POSITION) || ''
  element.style.position = original
  element.removeAttribute(POSITION_PATCH)
  element.removeAttribute(ORIGINAL_POSITION)
}

export function clearTourAnchors(attribute: string) {
  document
    .querySelectorAll<HTMLElement>(`[${attribute}="true"]`)
    .forEach((element) => {
      if (element.getAttribute(ALIAS_MARKER) === 'true') {
        const host = element.parentElement
        element.remove()
        if (host instanceof HTMLElement && !host.querySelector(`[${ALIAS_MARKER}="true"]`)) {
          restorePosition(host)
        }
        return
      }

      element.removeAttribute('data-tour')
      element.removeAttribute(attribute)
      if (!element.querySelector(`[${ALIAS_MARKER}="true"]`)) {
        restorePosition(element)
      }
    })
}

function aliasHost(element: HTMLElement) {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLImageElement ||
    element instanceof SVGElement
  ) {
    return element.parentElement instanceof HTMLElement
      ? element.parentElement
      : element
  }

  return element
}

/**
 * A real empty-state card can support several guide steps. Keep the first name
 * on the real element and create non-interactive absolute aliases for later
 * names. Every alias has the same rectangle as the host and is removed during
 * cleanup, so no visible layout or click behavior is changed.
 */
export function setTourAnchor(
  element: HTMLElement | null,
  name: string,
  attribute: string,
) {
  if (!element) return false

  const current = element.getAttribute('data-tour')
  if (!current || current === name) {
    element.setAttribute('data-tour', name)
    element.setAttribute(attribute, 'true')
    return true
  }

  const host = aliasHost(element)
  if (window.getComputedStyle(host).position === 'static') {
    host.setAttribute(ORIGINAL_POSITION, host.style.position || '')
    host.setAttribute(POSITION_PATCH, 'true')
    host.style.position = 'relative'
  }

  const alias = document.createElement('span')
  alias.setAttribute('data-tour', name)
  alias.setAttribute(attribute, 'true')
  alias.setAttribute(ALIAS_MARKER, 'true')
  alias.setAttribute('aria-hidden', 'true')
  alias.style.position = 'absolute'
  alias.style.inset = '0'
  alias.style.display = 'block'
  alias.style.pointerEvents = 'none'
  alias.style.borderRadius = 'inherit'
  alias.style.zIndex = '0'
  host.appendChild(alias)

  return true
}

export function nextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve())
    })
  })
}

export function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds)
  })
}
