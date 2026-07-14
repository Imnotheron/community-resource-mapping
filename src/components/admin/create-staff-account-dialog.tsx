'use client'

import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useState } from 'react'
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
import { apiFetch } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type StaffRole = 'ADMIN' | 'WORKER'

type CreatedAccount = {
  name: string
  email: string
  phone?: string | null
  role: StaffRole
  emailSent: boolean
  temporaryPassword?: string | null
}

interface CreateStaffAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void | Promise<void>
}

export function CreateStaffAccountDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateStaffAccountDialogProps) {
  const [role, setRole] = useState<StaffRole>('WORKER')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [createdAccount, setCreatedAccount] =
    useState<CreatedAccount | null>(null)

  useEffect(() => {
    if (open) return

    if (!submitting) {
      setRole('WORKER')
      setName('')
      setEmail('')
      setPhone('')
      setAdminPassword('')
      setShowPassword(false)
    }
  }, [open, submitting])

  function closeCreateDialog(nextOpen: boolean) {
    if (submitting) return
    onOpenChange(nextOpen)
  }

  async function submit() {
    const cleanName = name.trim()
    const cleanEmail = email.trim().toLowerCase()
    const cleanPhone = phone.trim()

    if (!cleanName || !cleanEmail) {
      toast.error('Complete the required details', {
        description:
          'Enter the staff member’s full name and email address.',
      })
      return
    }

    if (!adminPassword) {
      toast.error('Administrator password required', {
        description:
          'Re-enter your own password to authorize this account.',
      })
      return
    }

    setSubmitting(true)

    try {
      const data = await apiFetch<{
        success: boolean
        message: string
        user: {
          name: string
          email: string
          phone?: string | null
          role: StaffRole
        }
        notification?: {
          emailSent?: boolean
        }
        temporaryPassword?: string | null
      }>('/api/admin/create-staff', {
        method: 'POST',
        useUserHeader: true,
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          role,
          adminPassword,
        }),
      })

      setCreatedAccount({
        name: data.user?.name || cleanName,
        email: data.user?.email || cleanEmail,
        phone: data.user?.phone || cleanPhone || null,
        role: data.user?.role || role,
        emailSent: Boolean(
          data.notification?.emailSent,
        ),
        temporaryPassword:
          data.temporaryPassword || null,
      })

      onOpenChange(false)
      await onCreated()

      toast.success(
        role === 'ADMIN'
          ? 'Administrator account created'
          : 'Worker account created',
      )
    } catch (error: any) {
      toast.error('Account creation failed', {
        description:
          error?.message || 'Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function copyTemporaryPassword() {
    if (!createdAccount?.temporaryPassword) return

    try {
      await navigator.clipboard.writeText(
        createdAccount.temporaryPassword,
      )
      toast.success('Temporary password copied')
    } catch {
      toast.error('Could not copy the password')
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={closeCreateDialog}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Create Staff Account
            </DialogTitle>
            <DialogDescription>
              Create either a field-worker account or
              another administrator account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Account role</Label>

              <div className="grid gap-3 sm:grid-cols-2">
                <RoleChoice
                  active={role === 'WORKER'}
                  title="Field Worker"
                  description="Records field activity and relief distributions."
                  icon={BriefcaseBusiness}
                  onClick={() => setRole('WORKER')}
                  disabled={submitting}
                />

                <RoleChoice
                  active={role === 'ADMIN'}
                  title="Administrator"
                  description="Receives full administrative system access."
                  icon={ShieldCheck}
                  onClick={() => setRole('ADMIN')}
                  disabled={submitting}
                  danger
                />
              </div>
            </div>

            {role === 'ADMIN' && (
              <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">
                    Full system access
                  </p>
                  <p className="mt-1 text-xs leading-5">
                    Administrators can manage users,
                    approve records, publish announcements,
                    view reports, and access sensitive
                    municipal information.
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="staff-name">
                  Full name
                </Label>
                <Input
                  id="staff-name"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  autoComplete="name"
                  disabled={submitting}
                  placeholder="Juan Dela Cruz"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-email">
                  Email address
                </Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  autoComplete="email"
                  disabled={submitting}
                  placeholder="staff@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-phone">
                  Phone
                </Label>
                <Input
                  id="staff-phone"
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  autoComplete="tel"
                  disabled={submitting}
                  placeholder="+63 9XX XXX XXXX"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="admin-password">
                  Your administrator password
                </Label>

                <div className="relative">
                  <Input
                    id="admin-password"
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    value={adminPassword}
                    onChange={(event) =>
                      setAdminPassword(
                        event.target.value,
                      )
                    }
                    autoComplete="current-password"
                    disabled={submitting}
                    className="pr-11"
                    placeholder="Confirm this privileged action"
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter' &&
                        !submitting
                      ) {
                        event.preventDefault()
                        void submit()
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current,
                      )
                    }
                    disabled={submitting}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                    aria-label={
                      showPassword
                        ? 'Hide administrator password'
                        : 'Show administrator password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Your password is verified by the server
                  and is never stored in this form.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                closeCreateDialog(false)
              }
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className="gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : role === 'ADMIN' ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <BriefcaseBusiness className="h-4 w-4" />
              )}

              Create{' '}
              {role === 'ADMIN'
                ? 'Administrator'
                : 'Worker'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(createdAccount)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setCreatedAccount(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {createdAccount && (
            <>
              <DialogHeader className="items-center text-center">
                <div className="mb-2 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
                  <CheckCircle2 className="h-8 w-8" />
                </div>

                <DialogTitle>
                  {createdAccount.role === 'ADMIN'
                    ? 'Administrator created'
                    : 'Worker created'}
                </DialogTitle>

                <DialogDescription>
                  The account is active and can sign
                  in using the registered email.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="rounded-xl border bg-muted/50 p-4">
                  <p className="font-semibold">
                    {createdAccount.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {createdAccount.email}
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                    {createdAccount.role}
                  </p>
                </div>

                <div
                  className={cn(
                    'rounded-xl border p-4 text-sm',
                    createdAccount.emailSent
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-amber-300 bg-amber-50 text-amber-900',
                  )}
                >
                  {createdAccount.emailSent
                    ? 'Login instructions and the temporary password were sent by email.'
                    : 'The account was created, but email delivery failed. Give the temporary password to the user through a secure channel.'}
                </div>

                {!createdAccount.emailSent &&
                  createdAccount.temporaryPassword && (
                    <div className="rounded-xl border border-amber-300 bg-background p-4">
                      <Label>
                        One-time temporary password
                      </Label>

                      <div className="mt-2 flex gap-2">
                        <Input
                          value={
                            createdAccount.temporaryPassword
                          }
                          readOnly
                          className="font-mono"
                        />

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            void copyTemporaryPassword()
                          }
                          aria-label="Copy temporary password"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">
                        This password is shown only because
                        the email was not delivered.
                      </p>
                    </div>
                  )}
              </div>

              <DialogFooter className="sm:justify-center">
                <Button
                  type="button"
                  onClick={() =>
                    setCreatedAccount(null)
                  }
                  className="min-w-28"
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function RoleChoice({
  active,
  title,
  description,
  icon: Icon,
  onClick,
  disabled,
  danger = false,
}: {
  active: boolean
  title: string
  description: string
  icon: typeof ShieldCheck
  onClick: () => void
  disabled: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'rounded-xl border p-4 text-left transition',
        active
          ? danger
            ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300/50'
            : 'border-primary bg-primary/10 ring-2 ring-primary/25'
          : 'border-border bg-card hover:border-primary/50',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
            active && danger
              ? 'bg-amber-100 text-amber-700'
              : 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <p className="font-semibold">
            {title}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </button>
  )
}
