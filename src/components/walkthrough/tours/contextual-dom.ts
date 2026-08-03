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

export function clearTourAnchors(attribute: string) {
  document
    .querySelectorAll<HTMLElement>(`[${attribute}="true"]`)
    .forEach((element) => {
      element.removeAttribute('data-tour')
      element.removeAttribute(attribute)
    })
}

export function setTourAnchor(
  element: HTMLElement | null,
  name: string,
  attribute: string,
) {
  if (!element) return false
  element.setAttribute('data-tour', name)
  element.setAttribute(attribute, 'true')
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
