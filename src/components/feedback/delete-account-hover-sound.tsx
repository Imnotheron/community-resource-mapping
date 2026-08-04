'use client'

import { useEffect } from 'react'

const DELETE_WARNING_SOUND =
  'data:audio/mpeg;base64,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 aJi6+PHJmjQGGS...



  
  '

let cachedWarningAudio: HTMLAudioElement | null = null

function getWarningAudio() {
  if (typeof window === 'undefined') return null

  if (!cachedWarningAudio) {
    cachedWarningAudio = new Audio(DELETE_WARNING_SOUND)
    cachedWarningAudio.preload = 'auto'
    cachedWarningAudio.volume = 0.78
  }

  return cachedWarningAudio
}

function isDeleteAccountConfirmButton(element: Element | null) {
  const button = element?.closest('button')
  if (!(button instanceof HTMLButtonElement)) return null

  if (!/delete account/i.test(button.textContent || '')) {
    return null
  }

  const dialog = button.closest('[role="dialog"]')
  if (!dialog) return null

  const dialogText = dialog.textContent || ''
  if (!/delete this account\?/i.test(dialogText)) {
    return null
  }

  return button
}

function playDeleteWarning() {
  const audio = getWarningAudio()
  if (!audio) return

  audio.pause()
  audio.currentTime = 0
  void audio.play().catch(() => {
    // Hover sound is supplementary and must never block the dialog.
  })
}

export function DeleteAccountHoverSound() {
  useEffect(() => {
    const handlePointerOver = (event: PointerEvent) => {
      const button = isDeleteAccountConfirmButton(
        event.target instanceof Element ? event.target : null,
      )

      if (!button || button.disabled) return

      const previousTarget =
        event.relatedTarget instanceof Node
          ? event.relatedTarget
          : null

      // Ignore movement between the icon and label inside the same button.
      if (previousTarget && button.contains(previousTarget)) {
        return
      }

      playDeleteWarning()
    }

    document.addEventListener('pointerover', handlePointerOver)

    return () => {
      document.removeEventListener('pointerover', handlePointerOver)
      cachedWarningAudio?.pause()
    }
  }, [])

  return null
}
