'use client'

import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  Copy,
  Loader2,
  MailCheck,
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
import {
  apiFetch,
  getStoredUser,
} from '@/lib/api-client'
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
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(
    null,
  )
  const [formStatus, setFormStatus] = useState<string | null>(
    null,
  )
  const [createdAccount, setCreatedAccount] =
    useState<CreatedAccount | null>(null)

  useEffect(() => {
    if (open || submitting) return

    setRole('WORKER')
    setName('')
    setEmail('')
    setPhone('')
    setFormError(null)
    setFormStatus(null)
  }, [open, submitting])

  function closeCreateDialog(nextOpen: boolean) {
    if (submitting) return
    onOpenChange(nextOpen)
  }

  async function submit() {
    const cleanName = name.trim()
    const cleanEmail = email.trim().toLowerCase()
    const cleanPhone = phone.trim()
    const currentUser = getStoredUser()

    setFormError(null)
    setFormStatus(null)

    if (!cleanName || !cleanEmail) {
      setFormError(
        'Enter the staff member’s full name and email address.',
      )
      return
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailPattern.test(cleanEmail)) {
      setFormError('Enter a valid email address.')
      return
    }

    if (!currentUser?.id) {
      setFormError(
        'Your signed-in session could not be found. Sign out, sign in again, and retry.',
      )
      return
    }

    if (
      String(currentUser.role).toLowerCase() !== 'admin'
    ) {
      setFormError(
        'Only an Administrator can create staff accounts.',
      )
      return
    }

    setSubmitting(true)
    setFormStatus(
      role === 'ADMIN'
        ? 'Creating administrator account and temporary password…'
        : 'Creating worker account and temporary password…',
    )

    const controller = new AbortController()
    const timer = window.setTimeout(
      () => controller.abort(),
      20_000,
    )

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
        userId: currentUser.id,
        signal: controller.signal,
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          role,
          adminId: currentUser.id,
        }),
      })

      setCreatedAccount({
        name: data.user?.name || cleanName,
        email: data.user?.email || cleanEmail,
        phone:
          data.user?.phone || cleanPhone || null,
        role: data.user?.role || role,
        emailSent: Boolean(data.notification?.emailSent),
        temporaryPassword:
          data.temporaryPassword || null,
      })

      setFormStatus(null)
      onOpenChange(false)
      await onCreated()

      toast.success(
        role === 'ADMIN'
          ? 'Administrator account created'
          : 'Worker account created',
        {
          description: data.message,
        },
      )
    } catch (error: any) {
      const message =
        error?.name === 'AbortError'
          ? 'The server took too long to respond. Check the Users list before retrying.'
          : error?.message ||
            'The account could not be created.'

      setFormStatus(null)
      setFormError(message)

      toast.error('Account creation failed', {
        description: message,
      })
    } finally {
      window.clearTimeout(timer)
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
      <Dialog open={open} onOpenChange={closeCreateDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Staff Account</DialogTitle>
            <DialogDescription>
              Every new Administrator or Worker receives a
              generated temporary password and is prompted to
              change it after signing in.
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

            {(formError || formStatus) && (
              <div
                role={formError ? 'alert' : 'status'}
                aria-live="polite"
                className={cn(
                  'rounded-xl border px-4 py-3 text-sm leading-6',
                  formError
                    ? 'border-red-300 bg-red-50 text-red-800'
                    : 'border-blue-200 bg-blue-50 text-blue-800',
                )}
              >
                <div className="flex items-start gap-3">
                  {formStatus ? (
                    <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span>{formError || formStatus}</span>
                </div>
              </div>
            )}

            {role === 'ADMIN' && (
              <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">
                    Full system access
                  </p>
                  <p className="mt-1 text-xs leading-5">
                    Administrators can manage users, approve
                    records, publish announcements, view
                    reports, and access sensitive municipal
                    information.
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="staff-name">Full name</Label>
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
                <Label htmlFor="staff-phone">Phone</Label>
                <Input
                  id="staff-phone"
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  autoComplete="tel"
                  disabled={submitting}
                  placeholder="+63 9XX XXX XXXX"
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
              </div>
            </div>

            <div className="flex gap-3 rounded-xl border bg-muted/50 p-4">
              <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-xs leading-5 text-muted-foreground">
                The welcome email contains the temporary
                password and instructs the user to change it.
                After login, the system displays a mandatory
                password-change reminder.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => closeCreateDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                void submit()
              }}
              disabled={submitting}
              className="relative z-10 gap-2"
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
          if (!nextOpen) setCreatedAccount(null)
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
                  The account is active and will be reminded
                  to replace the temporary password after
                  signing in.
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

                {createdAccount.emailSent ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    The temporary password and login
                    instructions were sent to the user’s
                    email address.
                  </div>
                ) : (
                  <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
                    <p className="text-sm">
                      Email was not confirmed. Copy this
                      temporary password and deliver it
                      securely.
                    </p>

                    {createdAccount.temporaryPassword && (
                      <div className="flex gap-2">
                        <Input
                          value={
                            createdAccount.temporaryPassword
                          }
                          readOnly
                          className="bg-white font-mono font-semibold"
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
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="sm:justify-center">
                <Button
                  type="button"
                  onClick={() => setCreatedAccount(null)}
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
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </button>
  )
}
