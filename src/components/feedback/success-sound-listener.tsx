'use client'

import { useEffect } from 'react'

import { playSuccessSound } from '@/lib/success-sound'

const SUCCESS_ACTION_PATTERNS = [
  /profile settings saved/i,
  /administrator account created/i,
  /worker account created/i,
  /vulnerable (citizen|person).*(registered|created)/i,
  /(registration|citizen registration).*(successful|completed|submitted|created)/i,
]

function isTargetSuccessMessage(message: string) {
  return SUCCESS_ACTION_PATTERNS.some((pattern) => pattern.test(message))
}

export function SuccessSoundListener() {
  useEffect(() => {
    const handledToasts = new WeakSet<Element>()

    function inspect(root: ParentNode) {
      const matchingRoot =
        root instanceof Element && root.matches('[data-sonner-toast]')
          ? [root]
          : Array.from(root.querySelectorAll?.('[data-sonner-toast]') || [])

      for (const toast of matchingRoot) {
        if (handledToasts.has(toast)) continue
        handledToasts.add(toast)

        const message = toast.textContent?.trim() || ''
        if (
          toast.getAttribute('data-type') === 'success' &&
          isTargetSuccessMessage(message)
        ) {
          playSuccessSound()
        }
      }
    }

    inspect(document)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) inspect(node)
        }
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [])

  return null
}
