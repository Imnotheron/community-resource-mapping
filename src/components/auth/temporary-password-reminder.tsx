'use client'

import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldAlert,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  apiFetch,
  type AuthUser,
} from '@/lib/api-client'

interface TemporaryPasswordReminderProps {
  user: AuthUser
  onUserUpdated: (user: AuthUser) => void
}

export function TemporaryPasswordReminder({
  user,
  onUserUpdated,
}: TemporaryPasswordReminderProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mustChangePassword = useMemo(
    () =>
      Boolean(
        user.temporaryPasswordIssued &&
          !user.passwordChangedAt,
      ),
    [
      user.temporaryPasswordIssued,
      user.passwordChangedAt,
    ],
  )

  useEffect(() => {
    if (!mustChangePassword) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowCurrent(false)
      setShowNew(false)
      setSubmitting(false)
      setError(null)
    }
  }, [mustChangePassword, user.id])

  async function changePassword() {
    setError(null)

    if (!currentPassword) {
      setError(
        'Enter the temporary password from your welcome email.',
      )
      return
    }

    if (newPassword.length < 8) {
      setError(
        'Your new password must contain at least 8 characters.',
      )
      return
    }

    if (newPassword === currentPassword) {
      setError(
        'Choose a new password that is different from the temporary password.',
      )
      return
    }

    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      const data = await apiFetch<{
        success: boolean
        user: AuthUser
        message: string
      }>('/api/user/settings', {
        method: 'PUT',
        useUserHeader: true,
        userId: user.id,
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      onUserUpdated(data.user)
      toast.success('Password changed successfully', {
        description:
          'Your temporary password is no longer active.',
      })
    } catch (requestError: any) {
      setError(
        requestError?.message ||
          'The password could not be changed.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={mustChangePassword}
      onOpenChange={() => undefined}
    >
      <DialogContent
        className="sm:max-w-lg [&>button]:hidden"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) =>
          event.preventDefault()
        }
      >
        <DialogHeader>
          <div className="mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700">
            <ShieldAlert className="h-6 w-6" />
          </div>

          <DialogTitle>
            Change your temporary password
          </DialogTitle>

          <DialogDescription className="leading-6">
            The password sent in your welcome email is
            temporary. Create a private password before
            continuing to use the system.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        <div className="space-y-4">
          <PasswordField
            id="temporary-password"
            label="Temporary password"
            value={currentPassword}
            onChange={setCurrentPassword}
            visible={showCurrent}
            onToggle={() =>
              setShowCurrent((current) => !current)
            }
            disabled={submitting}
            autoComplete="current-password"
          />

          <PasswordField
            id="new-password"
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            visible={showNew}
            onToggle={() =>
              setShowNew((current) => !current)
            }
            disabled={submitting}
            autoComplete="new-password"
          />

          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">
              Confirm new password
            </Label>
            <Input
              id="confirm-new-password"
              type={showNew ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              autoComplete="new-password"
              disabled={submitting}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !submitting
                ) {
                  event.preventDefault()
                  void changePassword()
                }
              }}
            />
          </div>

          <div className="rounded-xl border bg-muted/50 p-4 text-xs leading-5 text-muted-foreground">
            Use at least 8 characters. Avoid using the
            temporary password, your name, or an easily
            guessed password.
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => void changePassword()}
            disabled={submitting}
            className="w-full gap-2 sm:w-auto"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Save New Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
  disabled,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  visible: boolean
  onToggle: () => void
  disabled: boolean
  autoComplete: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>

      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          autoComplete={autoComplete}
          disabled={disabled}
          className="pr-11"
        />

        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          aria-label={
            visible ? `Hide ${label}` : `Show ${label}`
          }
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}
