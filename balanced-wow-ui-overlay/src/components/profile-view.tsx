'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Moon, Sun, Palette, Upload, Trash2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useTheme } from 'next-themes'
import { useAccent } from '@/components/providers/theme-provider'
import { apiFetch, AuthUser } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface ProfileViewProps {
  user: AuthUser
  onBack: () => void
  onUserUpdated: (u: AuthUser) => void
}

const ACCENT_OPTIONS = [
  { id: 'emerald', label: 'Emerald', color: '#059669' },
  { id: 'teal', label: 'Teal', color: '#0d9488' },
  { id: 'green', label: 'Green', color: '#16a34a' },
  { id: 'amber', label: 'Amber', color: '#d97706' },
] as const

export function ProfileView({ user, onBack, onUserUpdated }: ProfileViewProps) {
  const { theme, setTheme } = useTheme()
  const { accent, setAccent } = useAccent()
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changingPwd, setChangingPwd] = useState(false)

  // Upload
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/api/user/settings', { useUserHeader: true })
        setName(data.user.name)
        setPhone(data.user.phone || '')
      } catch (err: any) {
        toast.error('Failed to load settings', { description: err.message })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    try {
      await apiFetch('/api/user/settings', {
        method: 'PUT',
        useUserHeader: true,
        body: JSON.stringify({ name, phone }),
      })
      const updated = { ...user, name }
      onUserUpdated(updated)
      toast.success('Profile updated')
    } catch (err: any) {
      toast.error('Update failed', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async () => {
    if (!currentPassword || !newPassword) return
    if (newPassword.length < 6) {
      toast.error('Password too short', { description: 'Minimum 6 characters.' })
      return
    }
    setChangingPwd(true)
    try {
      await apiFetch('/api/user/settings', {
        method: 'PUT',
        useUserHeader: true,
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      toast.success('Password changed')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err: any) {
      toast.error('Failed to change password', { description: err.message })
    } finally {
      setChangingPwd(false)
    }
  }

  const uploadPicture = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/user/profile-picture', {
        method: 'POST',
        headers: { 'x-user-id': user.id },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      const updated = { ...user, profilePicture: data.profilePictureUrl }
      onUserUpdated(updated)
      toast.success('Profile picture updated')
    } catch (err: any) {
      toast.error('Upload failed', { description: err.message })
    } finally {
      setUploading(false)
    }
  }

  const removePicture = async () => {
    try {
      await apiFetch('/api/user/profile-picture', { method: 'DELETE', useUserHeader: true })
      const updated = { ...user, profilePicture: null }
      onUserUpdated(updated)
      toast.success('Profile picture removed')
    } catch (err: any) {
      toast.error('Failed to remove', { description: err.message })
    }
  }

  const saveTheme = async (newTheme: string) => {
    setTheme(newTheme)
    try {
      await apiFetch('/api/user/settings', {
        method: 'PUT',
        useUserHeader: true,
        body: JSON.stringify({ theme: newTheme }),
      })
    } catch {}
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in p-4 md:p-8">
      <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile & Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account, appearance, and security.</p>
      </div>

      {/* Profile picture + basic info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt={user.name} className="h-full w-full rounded-full object-cover" />
              ) : (
                <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">{initials}</AvatarFallback>
              )}
            </Avatar>
            <div className="flex gap-2">
              <label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadPicture(e.target.files[0])}
                />
                <Button variant="outline" size="sm" className="gap-2 cursor-pointer" disabled={uploading} asChild>
                  <span>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload
                  </span>
                </Button>
              </label>
              {user.profilePicture && (
                <Button variant="ghost" size="sm" onClick={removePicture} className="gap-2 text-destructive">
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-email">Email</Label>
              <Input id="p-email" value={user.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-phone">Phone</Label>
              <Input id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 9XX XXX XXXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-role">Role</Label>
              <Input id="p-role" value={user.role.toUpperCase()} disabled className="bg-muted font-mono" />
            </div>
          </div>
          <Button onClick={saveProfile} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-primary" /> Appearance
          </CardTitle>
          <CardDescription>Customize how the system looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">Theme</Label>
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => saveTheme('light')}
                className="gap-2"
              >
                <Sun className="h-4 w-4" /> Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => saveTheme('dark')}
                className="gap-2"
              >
                <Moon className="h-4 w-4" /> Dark
              </Button>
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Accent Color</Label>
            <div className="flex gap-2">
              {ACCENT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setAccent(opt.id as any)}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                    accent === opt.id ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: opt.color }}
                  title={opt.label}
                  aria-label={opt.label}
                >
                  {accent === opt.id && <span className="text-white text-xs">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Security</CardTitle>
          <CardDescription>Change your password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cur-pwd">Current Password</Label>
              <Input id="cur-pwd" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pwd">New Password</Label>
              <Input id="new-pwd" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
          </div>
          <Button onClick={changePassword} disabled={changingPwd || !currentPassword || !newPassword} className="gap-2">
            {changingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Change Password
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
