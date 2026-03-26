'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, X } from 'lucide-react'

interface SuccessModalProps {
  open: boolean
  onClose: () => void
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function SuccessModal({
  open,
  onClose,
  title,
  message,
  actionLabel,
  onAction
}: SuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl font-semibold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-3">
          {onAction && actionLabel && (
            <Button
              onClick={() => {
                onAction()
                onClose()
              }}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {actionLabel}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
