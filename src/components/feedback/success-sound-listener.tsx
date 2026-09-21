'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { playInstantSuccessSound } from '@/lib/instant-success-sound'

const SUCCESS_ACTION_PATTERNS = [
  /profile settings saved/i,
  /administrator account created/i,
  /worker account created/i,
  /(vulnerable )?(citizen|person).*(registered|created)/i,
  /(registration|citizen registration).*(successful|completed|submitted|created)/i,
]

function isTargetSuccessMessage(message: unknown) {
  if (typeof message !== 'string') return false
  return SUCCESS_ACTION_PATTERNS.some((pattern) => pattern.test(message))
}

function isProfileSavedMessage(message: unknown) {
  return typeof message === 'string' && /profile settings saved/i.test(message)
}

export function SuccessSoundListener() {
  const [profileSavedOpen, setProfileSavedOpen] = useState(false)

  useEffect(() => {
    const sonnerToast = toast as typeof toast & {
      success: (...args: any[]) => any
    }
    const originalSuccess = sonnerToast.success

    const successWithFeedback = (...args: any[]) => {
      const message = args[0]

      if (isTargetSuccessMessage(message)) {
        playInstantSuccessSound()
      }

      if (isProfileSavedMessage(message)) {
        setProfileSavedOpen(true)
      }

      return originalSuccess(...args)
    }

    sonnerToast.success = successWithFeedback

    return () => {
      if (sonnerToast.success === successWithFeedback) {
        sonnerToast.success = originalSuccess
      }
    }
  }, [])

  return (
    <Dialog open={profileSavedOpen} onOpenChange={setProfileSavedOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <DialogTitle>Profile and settings saved</DialogTitle>
          <DialogDescription className="text-center">
            Your profile information and account preferences were saved successfully and are now active.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-center">
          <Button
            type="button"
            className="min-w-28"
            onClick={() => setProfileSavedOpen(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
