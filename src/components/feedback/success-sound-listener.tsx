'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

import { playSuccessSound } from '@/lib/success-sound'

const SUCCESS_ACTION_PATTERNS = [
  /profile settings saved/i,
  /administrator account created/i,
  /worker account created/i,
  /vulnerable (citizen|person).*(registered|created)/i,
  /(registration|citizen registration).*(successful|completed|submitted|created)/i,
]

function isTargetSuccessMessage(message: unknown) {
  if (typeof message !== 'string') return false
  return SUCCESS_ACTION_PATTERNS.some((pattern) => pattern.test(message))
}

export function SuccessSoundListener() {
  useEffect(() => {
    const sonnerToast = toast as typeof toast & {
      success: (...args: any[]) => any
    }
    const originalSuccess = sonnerToast.success

    const successWithSound = (...args: any[]) => {
      if (isTargetSuccessMessage(args[0])) {
        playSuccessSound()
      }

      return originalSuccess(...args)
    }

    sonnerToast.success = successWithSound

    return () => {
      if (sonnerToast.success === successWithSound) {
        sonnerToast.success = originalSuccess
      }
    }
  }, [])

  return null
}
