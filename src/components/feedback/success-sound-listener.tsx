'use client'

import { useEffect, useRef, useState } from 'react'
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

type SuccessNotice = {
  title: string
  description: string | null
}

// Keep interruptions for real record changes. Routine actions such as
// copying a password, loading a draft, changing filters, or logging in
// still use Sonner's lightweight toast rather than a blocking dialog.
// Registration and staff creation already have their own result dialogs.
const DIALOG_SUCCESS_PATTERNS = [
  /^User deleted$/i,
  /^Announcement deleted$/i,
  /^Profile (approved|rejected)$/i,
  /^Vulnerable status updated$/i,
  /^\d+ relief distributions? (approved|rejected)$/i,
  /^Distribution recorded$/i,
  /^Field note saved$/i,
  /^Announcement published$/i,
  /^Response sent$/i,
  /^Feedback submitted$/i,
  /^Historical record added$/i,
  /^New relief cycle started$/i,
  /^Profile settings saved$/i,
  /^\d+ registrations? imported$/i,
  /^\d+ distributions? imported$/i,
  /^Draft deleted$/i,
  /^Report settings saved$/i,
  /^Relief report generated$/i,
  /^Dropdown option (added|restored|hidden)$/i,
]

const SOUND_SUCCESS_PATTERNS = [
  /profile settings saved/i,
  /administrator account created/i,
  /worker account created/i,
  /(vulnerable )?(citizen|person).*(registered|created)/i,
  /(registration|citizen registration).*(successful|completed|submitted|created)/i,
]

function isDialogSuccessMessage(message: unknown) {
  return typeof message === 'string' &&
    DIALOG_SUCCESS_PATTERNS.some((pattern) => pattern.test(message))
}

function isSoundSuccessMessage(message: unknown) {
  return typeof message === 'string' &&
    SOUND_SUCCESS_PATTERNS.some((pattern) => pattern.test(message))
}

function noticeTitle(message: string) {
  if (message === 'User deleted') return 'User deleted successfully'
  if (message === 'Announcement deleted') return 'Announcement deleted successfully'
  if (message === 'Profile settings saved') return 'Profile and settings saved'
  return message
}

export function SuccessSoundListener() {
  const [notice, setNotice] = useState<SuccessNotice | null>(null)
  const activeNoticeRef = useRef<SuccessNotice | null>(null)
  const noticeQueueRef = useRef<SuccessNotice[]>([])

  useEffect(() => {
    const sonnerToast = toast as typeof toast & {
      success: (...args: any[]) => any
    }
    const originalSuccess = sonnerToast.success

    const successWithFeedback = (...args: any[]) => {
      const message = args[0]
      const options = args[1]

      if (isSoundSuccessMessage(message)) {
        playInstantSuccessSound()
      }

      if (isDialogSuccessMessage(message)) {
        const nextNotice: SuccessNotice = {
          title: noticeTitle(message),
          description:
            typeof options?.description === 'string'
              ? options.description
              : null,
        }

        // Queue simultaneous results instead of silently overwriting one.
        // This also keeps the visible dialog stable during asynchronous list
        // refreshes and navigation after an API mutation.
        if (activeNoticeRef.current) {
          noticeQueueRef.current.push(nextNotice)
        } else {
          activeNoticeRef.current = nextNotice
          setNotice(nextNotice)
        }
      }

      // Preserve existing success toasts and their return values for callers.
      return originalSuccess(...args)
    }

    sonnerToast.success = successWithFeedback

    return () => {
      if (sonnerToast.success === successWithFeedback) {
        sonnerToast.success = originalSuccess
      }
      activeNoticeRef.current = null
      noticeQueueRef.current = []
    }
  }, [])

  function dismissNotice() {
    const next = noticeQueueRef.current.shift() || null
    activeNoticeRef.current = next
    setNotice(next)
  }

  const isEmailWarning = Boolean(
    notice?.title === 'User deleted successfully' &&
    notice.description?.includes('deletion email was not sent'),
  )

  return (
    <Dialog
      open={Boolean(notice)}
      onOpenChange={(open) => {
        if (!open) dismissNotice()
      }}
    >
      <DialogContent
        data-testid="action-success-dialog"
        className="w-[calc(100vw-2rem)] max-w-md"
      >
        <DialogHeader className="items-center text-center">
          <div className="mb-2 grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
          </div>
          <DialogTitle className="break-words text-center text-xl">
            {notice?.title}
          </DialogTitle>
          <DialogDescription
            data-testid="action-success-description"
            className="break-words text-center leading-6"
          >
            {notice?.description ||
              'The action was completed and saved successfully.'}
          </DialogDescription>
        </DialogHeader>

        {isEmailWarning ? (
          <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
            The account has been removed. Its notification email needs follow-up.
          </p>
        ) : null}

        <DialogFooter className="sm:justify-center">
          <Button
            type="button"
            className="min-w-32"
            onClick={dismissNotice}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
