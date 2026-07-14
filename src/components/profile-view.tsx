'use client'

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
  Moon,
  Palette,
  RotateCcw,
  Save,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'

import {
  type AccentColor,
  type AppearanceTheme,
  useAppearance,
} from '@/components/providers/theme-provider'
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { cn } from '@/lib/utils'

interface ProfileViewProps {
  user: AuthUser
  onBack: () => void
  onUserUpdated: (user: AuthUser) => void
}

type AccountSnapshot = {
  name: string
  phone: string
  profilePicture: string | null
}

const ACCENT_OPTIONS: Array<{
  id: AccentColor
  label: string
  color: string
}> = [
  {
    id: 'emerald',
    label: 'Emerald',
    color: '#059669',
  },
  {
    id: 'teal',
    label: 'Teal',
    color: '#0d9488',
  },
  {
    id: 'green',
    label: 'Green',
    color: '#16a34a',
  },
  {
    id: 'amber',
    label: 'Amber',
    color: '#d97706',
  },
]

function normalizePicture(
  value: unknown,
): string | null {
  return typeof value === 'string' &&
    value.trim()
    ? value
    : null
}

export function ProfileView({
  user,
  onBack,
  onUserUpdated,
}: ProfileViewProps) {
  const {
    theme,
    accent,
    savedTheme,
    savedAccent,
    previewTheme,
    previewAccent,
    commitAppearance,
    revertAppearance,
  } = useAppearance()

  const initialPicture = normalizePicture(
    user.profilePicture,
  )

  const initialAccount: AccountSnapshot = {
    name: user.name || '',
    phone: user.phone || '',
    profilePicture: initialPicture,
  }

  const [savedAccount, setSavedAccount] =
    useState<AccountSnapshot>(initialAccount)
  const savedAccountRef =
    useRef<AccountSnapshot>(initialAccount)

  const [name, setName] = useState(
    initialAccount.name,
  )
  const [phone, setPhone] = useState(
    initialAccount.phone,
  )

  const [currentPassword, setCurrentPassword] =
    useState('')
  const [newPassword, setNewPassword] =
    useState('')

  const [
    pendingPictureFile,
    setPendingPictureFile,
  ] = useState<File | null>(null)
  const [
    pendingPictureUrl,
    setPendingPictureUrl,
  ] = useState<string | null>(null)
  const [
    removePictureOnSave,
    setRemovePictureOnSave,
  ] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [
    savedModalOpen,
    setSavedModalOpen,
  ] = useState(false)

  const revertRef = useRef(revertAppearance)

  useEffect(() => {
    revertRef.current = revertAppearance
  }, [revertAppearance])

  useEffect(() => {
    return () => {
      // Leaving Profile without saving always restores the
      // last committed database-backed appearance.
      revertRef.current()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      try {
        const data = await apiFetch(
          '/api/user/settings',
          {
            method: 'GET',
            useUserHeader: true,
            cache: 'no-store',
          },
        )

        if (cancelled) return

        const loadedAccount: AccountSnapshot = {
          name: String(
            data.user?.name || user.name || '',
          ),
          phone: String(
            data.user?.phone || '',
          ),
          profilePicture: normalizePicture(
            data.user?.profilePicture ??
              initialPicture,
          ),
        }

        savedAccountRef.current =
          loadedAccount
        setSavedAccount(loadedAccount)
        setName(loadedAccount.name)
        setPhone(loadedAccount.phone)

        // The global provider already hydrates these values,
        // but committing the API response here keeps Profile
        // and Dashboard synchronized if the page was opened
        // before hydration completed.
        commitAppearance(
          data.user?.theme === 'dark'
            ? 'dark'
            : 'light',
          data.user?.accent === 'teal' ||
            data.user?.accent === 'green' ||
            data.user?.accent === 'amber'
            ? data.user.accent
            : 'emerald',
        )
      } catch (error: any) {
        toast.error(
          'Failed to load settings',
          {
            description:
              error?.message ||
              'Please try again.',
          },
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
    // Load once for this profile session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (pendingPictureUrl) {
        URL.revokeObjectURL(
          pendingPictureUrl,
        )
      }
    }
  }, [pendingPictureUrl])

  const displayedPicture =
    removePictureOnSave
      ? null
      : pendingPictureUrl ||
        savedAccount.profilePicture

  const initials = useMemo(
    () =>
      (name || user.name || 'User')
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [name, user.name],
  )

  const hasPasswordDraft = Boolean(
    currentPassword || newPassword,
  )

  const isDirty =
    name.trim() !== savedAccount.name ||
    phone.trim() !== savedAccount.phone ||
    theme !== savedTheme ||
    accent !== savedAccent ||
    pendingPictureFile !== null ||
    removePictureOnSave ||
    hasPasswordDraft

  function clearPictureDraft() {
    if (pendingPictureUrl) {
      URL.revokeObjectURL(
        pendingPictureUrl,
      )
    }

    setPendingPictureFile(null)
    setPendingPictureUrl(null)
    setRemovePictureOnSave(false)
  }

  function choosePicture(file: File) {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]
    const maximumBytes = 5 * 1024 * 1024

    if (!allowedTypes.includes(file.type)) {
      toast.error('Unsupported image', {
        description:
          'Choose a JPG, PNG, or WebP image.',
      })
      return
    }

    if (file.size > maximumBytes) {
      toast.error('Image is too large', {
        description:
          'The maximum size is 5 MB.',
      })
      return
    }

    if (pendingPictureUrl) {
      URL.revokeObjectURL(
        pendingPictureUrl,
      )
    }

    setPendingPictureFile(file)
    setPendingPictureUrl(
      URL.createObjectURL(file),
    )
    setRemovePictureOnSave(false)
  }

  function stagePictureRemoval() {
    clearPictureDraft()
    setRemovePictureOnSave(true)
  }

  function revertAllChanges() {
    const saved = savedAccountRef.current

    setName(saved.name)
    setPhone(saved.phone)
    setCurrentPassword('')
    setNewPassword('')
    clearPictureDraft()
    revertAppearance()
  }

  function handleBack() {
    revertAllChanges()
    onBack()
  }

  async function savePictureChanges() {
    if (pendingPictureFile) {
      const formData = new FormData()
      formData.append(
        'file',
        pendingPictureFile,
      )

      const response = await fetch(
        '/api/user/profile-picture',
        {
          method: 'POST',
          headers: {
            'x-user-id': user.id,
          },
          body: formData,
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Profile-picture upload failed',
        )
      }

      return normalizePicture(
        data.profilePictureUrl,
      )
    }

    if (removePictureOnSave) {
      await apiFetch(
        '/api/user/profile-picture',
        {
          method: 'DELETE',
          useUserHeader: true,
        },
      )

      return null
    }

    return savedAccountRef.current
      .profilePicture
  }

  async function saveAllChanges() {
    const cleanName = name.trim()
    const cleanPhone = phone.trim()

    if (!cleanName) {
      toast.error('Name is required')
      return
    }

    if (hasPasswordDraft) {
      if (
        !currentPassword ||
        !newPassword
      ) {
        toast.error(
          'Complete both password fields',
        )
        return
      }

      if (newPassword.length < 6) {
        toast.error(
          'Password is too short',
          {
            description:
              'Use at least 6 characters.',
          },
        )
        return
      }
    }

    setSaving(true)

    try {
      const settingsResult =
        await apiFetch(
          '/api/user/settings',
          {
            method: 'PUT',
            useUserHeader: true,
            body: JSON.stringify({
              name: cleanName,
              phone: cleanPhone,
              theme,
              accent,
              ...(hasPasswordDraft
                ? {
                    currentPassword,
                    newPassword,
                  }
                : {}),
            }),
          },
        )

      const savedPicture =
        await savePictureChanges()

      const nextAccount: AccountSnapshot = {
        name: cleanName,
        phone: cleanPhone,
        profilePicture: savedPicture,
      }

      savedAccountRef.current = nextAccount
      setSavedAccount(nextAccount)

      // Commit only after the API accepted the selected
      // theme and accent. This updates the dashboard
      // synchronously and refresh-safe browser cache.
      commitAppearance(theme, accent)

      const updatedUser = {
        ...user,
        ...settingsResult.user,
        name: cleanName,
        phone: cleanPhone,
        profilePicture: savedPicture,
        theme,
        accent,
      } as AuthUser

      onUserUpdated(updatedUser)

      setCurrentPassword('')
      setNewPassword('')
      clearPictureDraft()
      setSavedModalOpen(true)
    } catch (error: any) {
      toast.error(
        'Could not save settings',
        {
          description:
            error?.message ||
            'Please try again.',
        },
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6 p-4 animate-fade-in md:p-8">
        <Button
          type="button"
          variant="ghost"
          onClick={handleBack}
          className="-ml-2 gap-2"
          disabled={saving}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Profile &amp; Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Preview your edits, then save
            everything once at the bottom.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Account
            </CardTitle>
            <CardDescription>
              Update your personal information
              and profile picture.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar className="h-20 w-20">
                {displayedPicture ? (
                  <img
                    src={displayedPicture}
                    alt={name || user.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>

              <div className="flex flex-wrap gap-2">
                <label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={saving}
                    onChange={(event) => {
                      const file =
                        event.target
                          .files?.[0]

                      if (file) {
                        choosePicture(file)
                      }

                      event.currentTarget.value =
                        ''
                    }}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer gap-2"
                    disabled={saving}
                    asChild
                  >
                    <span>
                      <Upload className="h-4 w-4" />
                      Choose photo
                    </span>
                  </Button>
                </label>

                {displayedPicture && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={
                      stagePictureRemoval
                    }
                    className="gap-2 text-destructive"
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-name">
                  Name
                </Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email">
                  Email
                </Label>
                <Input
                  id="profile-email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-phone">
                  Phone
                </Label>
                <Input
                  id="profile-phone"
                  value={phone}
                  onChange={(event) =>
                    setPhone(
                      event.target.value,
                    )
                  }
                  placeholder="+63 9XX XXX XXXX"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-role">
                  Role
                </Label>
                <Input
                  id="profile-role"
                  value={String(
                    user.role,
                  ).toUpperCase()}
                  disabled
                  className="bg-muted font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4 text-primary" />
              Appearance
            </CardTitle>
            <CardDescription>
              Theme changes brightness. Accent
              changes buttons and highlights.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <Label className="mb-3 block">
                Theme mode
              </Label>

              <div className="grid gap-3 sm:grid-cols-2">
                <ThemeOption
                  value="light"
                  current={theme}
                  title="Light"
                  description="Bright surfaces for daytime use."
                  icon={Sun}
                  onSelect={previewTheme}
                  disabled={saving}
                />

                <ThemeOption
                  value="dark"
                  current={theme}
                  title="Dark"
                  description="Low-glare surfaces for dim environments."
                  icon={Moon}
                  onSelect={previewTheme}
                  disabled={saving}
                />
              </div>
            </div>

            <div>
              <Label className="mb-3 block">
                Accent color
              </Label>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {ACCENT_OPTIONS.map(
                  (option) => {
                    const selected =
                      accent === option.id

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          previewAccent(
                            option.id,
                          )
                        }
                        disabled={saving}
                        aria-pressed={selected}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border p-3 text-sm font-medium transition',
                          selected
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/25'
                            : 'border-border bg-card hover:border-primary/50',
                        )}
                      >
                        <span
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white shadow-sm"
                          style={{
                            backgroundColor:
                              option.color,
                          }}
                        >
                          {selected && (
                            <Check className="h-4 w-4" />
                          )}
                        </span>

                        {option.label}
                      </button>
                    )
                  },
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Security
            </CardTitle>
            <CardDescription>
              Leave both fields empty to keep
              your current password.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="current-password">
                  Current Password
                </Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) =>
                    setCurrentPassword(
                      event.target.value,
                    )
                  }
                  autoComplete="current-password"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">
                  New Password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(
                      event.target.value,
                    )
                  }
                  autoComplete="new-password"
                  disabled={saving}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="sticky bottom-4 z-20 rounded-2xl border border-border bg-background/95 p-3 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">
                {isDirty
                  ? 'You have unsaved changes'
                  : 'Everything is saved'}
              </p>
              <p className="text-xs text-muted-foreground">
                Back or Revert restores the
                last database-saved settings.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={revertAllChanges}
                disabled={!isDirty || saving}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Revert
              </Button>

              <Button
                type="button"
                onClick={saveAllChanges}
                disabled={!isDirty || saving}
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={savedModalOpen}
        onOpenChange={setSavedModalOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-center text-center">
            <div className="mb-2 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <DialogTitle>
              Changes have been saved
            </DialogTitle>

            <DialogDescription>
              Your profile and appearance are
              now active across the dashboard.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              onClick={() =>
                setSavedModalOpen(false)
              }
              className="min-w-28"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ThemeOption({
  value,
  current,
  title,
  description,
  icon: Icon,
  onSelect,
  disabled,
}: {
  value: AppearanceTheme
  current: AppearanceTheme
  title: string
  description: string
  icon: typeof Sun
  onSelect: (
    value: AppearanceTheme,
  ) => void
  disabled: boolean
}) {
  const selected = value === current
  const darkPreview = value === 'dark'

  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'rounded-2xl border p-4 text-left transition',
        selected
          ? 'border-primary bg-primary/10 ring-2 ring-primary/25'
          : 'border-border bg-card hover:border-primary/50',
      )}
    >
      <div
        className={cn(
          'mb-3 overflow-hidden rounded-xl border p-2',
          darkPreview
            ? 'border-slate-700 bg-slate-950'
            : 'bg-white',
        )}
      >
        <div
          className={cn(
            'h-3 rounded',
            darkPreview
              ? 'bg-slate-700'
              : 'bg-slate-200',
          )}
        />
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className={cn(
                'h-8 rounded',
                darkPreview
                  ? 'bg-slate-800'
                  : 'bg-slate-100',
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <p className="font-semibold">
            {title}
          </p>
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </button>
  )
}
