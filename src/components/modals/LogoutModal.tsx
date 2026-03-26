'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { LogOut, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LogoutModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  userName?: string
}

export default function LogoutModal({ open, onClose, onConfirm, userName }: LogoutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <LogOut className="w-6 h-6 text-red-600" />
            Confirm Logout
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Are you sure you want to log out of your account?
            {userName && (
              <span className="block mt-2 text-slate-600 dark:text-slate-400">
                You are currently logged in as <strong>{userName}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              You will need to sign in again to access your account after logging out.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
