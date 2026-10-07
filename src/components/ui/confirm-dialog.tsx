'use client'

import type { ReactNode } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  showCancel?: boolean
  confirmDisabled?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  showCancel = true,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full ${
              variant === 'destructive' 
                ? 'bg-red-100 dark:bg-red-900/30' 
                : 'bg-amber-100 dark:bg-amber-900/30'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${
                variant === 'destructive' 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-amber-600 dark:text-amber-400'
              }`} />
            </div>
            <AlertDialogTitle className="text-xl">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="pt-2 text-base text-muted-foreground">
              {description}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3">
          {showCancel ? (
            <AlertDialogCancel className="flex-1">
              {cancelLabel}
            </AlertDialogCancel>
          ) : null}
          <AlertDialogAction
            disabled={confirmDisabled}
            onClick={() => {
              if (confirmDisabled) return
              onConfirm()
              onClose()
            }}
            className={`${showCancel ? 'flex-1' : 'w-full'} ${
              variant === 'destructive' 
                ? 'bg-red-600 hover:bg-red-700' 
                : ''
            }`}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
