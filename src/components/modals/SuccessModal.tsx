'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CheckCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SuccessModalProps {
  open: boolean
  onClose: () => void
  title?: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export default function SuccessModal({
  open,
  onClose,
  title = 'Success',
  message,
  actionLabel = 'OK',
  onAction
}: SuccessModalProps) {
  const handleAction = () => {
    if (onAction) {
      onAction()
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="py-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg text-slate-700 dark:text-slate-300">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button onClick={handleAction} className="bg-green-600 hover:bg-green-700">
            {actionLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
