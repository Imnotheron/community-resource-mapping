'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import SuccessModal from '@/components/modals/SuccessModal'
import { User, Lock, Bell, Moon, Sun, LogOut, ArrowLeft, Camera, Upload, X } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  profilePicture: string | null
  theme: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Profile info
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  
  // Profile picture
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Password change
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  
  const [isSaving, setIsSaving] = useState(false)

  // Messages
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    fetchUserSettings()
  }, [])

  const fetchUserSettings = async () => {
    try {
      const userData = localStorage.getItem('user')
      if (!userData) {
        router.push('/')
        return
      }

      const parsedUser = JSON.parse(userData)
      const res = await fetch('/api/user/settings', {
        headers: {
          'x-user-id': parsedUser.id
        }
      })

      const data = await res.json()
      if (data.success) {
        setUser(data.user)
        setName(data.user.name)
        setPhone(data.user.phone || '')
        setProfilePicture(data.user.profilePicture)
        
        // Set theme from user preferences
        if (data.user.theme) {
          setTheme(data.user.theme)
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) {
      console.error('No user found in state')
      setMessage({ type: 'error', text: 'Please try refreshing the page' })
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ name, phone })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        // Show success modal instead of inline message
        setSuccessMessage('Profile has been saved successfully!')
        setShowSuccessModal(true)

        // Update local storage
        const localUser = JSON.parse(localStorage.getItem('user') || '{}')
        localUser.name = name
        localUser.phone = phone
        localStorage.setItem('user', JSON.stringify(localUser))

        // Update user state
        setUser({ ...user, name, phone })
      } else {
        setMessage({ type: 'error', text: data.error || data.message || 'Failed to update profile' })
      }
    } catch (error) {
      console.error('Error in handleSaveProfile:', error)
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Only JPG, PNG, and WebP images are allowed' })
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size must be less than 5MB' })
      return
    }

    setUploadingPicture(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/user/profile-picture', {
        method: 'POST',
        headers: {
          'x-user-id': user.id
        },
        body: formData
      })

      const data = await res.json()
      if (data.success) {
        // Add timestamp to force browser cache refresh
        const profilePictureUrlWithTimestamp = `${data.profilePictureUrl}?t=${Date.now()}`
        setProfilePicture(profilePictureUrlWithTimestamp)
        setSuccessMessage('Profile picture has been saved successfully!')
        setShowSuccessModal(true)

        // Update localStorage with new profile picture (with timestamp)
        const localUser = JSON.parse(localStorage.getItem('user') || '{}')
        localUser.profilePicture = profilePictureUrlWithTimestamp
        localStorage.setItem('user', JSON.stringify(localUser))
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to upload profile picture' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload profile picture' })
    } finally {
      setUploadingPicture(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveProfilePicture = async () => {
    if (!user) return

    try {
      const res = await fetch('/api/user/profile-picture', {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id
        }
      })

      const data = await res.json()
      if (data.success) {
        setProfilePicture(null)
        setSuccessMessage('Profile picture has been removed successfully!')
        setShowSuccessModal(true)

        // Update localStorage to remove profile picture
        const localUser = JSON.parse(localStorage.getItem('user') || '{}')
        delete localUser.profilePicture
        localStorage.setItem('user', JSON.stringify(localUser))
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to remove profile picture' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to remove profile picture' })
    }
  }

  const handleThemeChange = (checked: boolean) => {
    const newTheme = checked ? 'dark' : 'light'
    setTheme(newTheme)
    saveThemePreference(newTheme)
  }

  const saveThemePreference = async (themeValue: string) => {
    if (!user) return

    try {
      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ theme: themeValue })
      })
    } catch (error) {
      console.error('Error saving theme preference:', error)
    }
  }

  const handleChangePassword = async () => {
    if (!user) return

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      const data = await res.json()
      if (data.success) {
        setSuccessMessage('Password has been saved successfully!')
        setShowSuccessModal(true)
        setShowPasswordDialog(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setPasswordError('')
      } else {
        setPasswordError(data.error || 'Failed to change password')
      }
    } catch (error) {
      setPasswordError('Failed to change password')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-slate-950 shadow-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">
                  Profile Settings
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : ''} account
                </p>
              </div>
            </div>
            <Button variant="destructive" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Error message only (success goes to modal) */}
          {message && message.type === 'error' && (
            <div className="mb-6 p-4 border-2 border-red-400 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-700">
              <p className="font-semibold text-base text-red-900 dark:text-red-300">
                {message.text}
              </p>
            </div>
          )}

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Profile Picture Section */}
                  <div className="flex flex-col items-center space-y-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="relative">
                      <Avatar className="w-32 h-32">
                        <AvatarImage src={profilePicture || undefined} alt={user?.name} />
                        <AvatarFallback className="text-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleProfilePictureUpload}
                        className="hidden"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute bottom-0 right-0 rounded-full p-2 h-10 w-10"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPicture}
                      >
                        {uploadingPicture ? (
                          <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm font-medium">Profile Picture</p>
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPicture}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </Button>
                        {profilePicture && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleRemoveProfilePicture}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">JPG, PNG, or WebP (max 5MB)</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-slate-100 dark:bg-slate-800"
                    />
                    <p className="text-xs text-slate-500">Email cannot be changed</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09123456789"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={user?.role || ''}
                      disabled
                      className="bg-slate-100 dark:bg-slate-800 capitalize"
                    />
                  </div>

                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Profile Changes'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize how the application looks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="dark-mode" className="text-base">Dark Mode</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Switch between light and dark theme
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sun className="w-5 h-5 text-slate-500" />
                      <Switch
                        id="dark-mode"
                        checked={theme === 'dark'}
                        onCheckedChange={handleThemeChange}
                      />
                      <Moon className="w-5 h-5 text-slate-500" />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      {theme === 'dark' ? (
                        <Moon className="w-6 h-6 text-purple-500" />
                      ) : (
                        <Sun className="w-6 h-6 text-orange-500" />
                      )}
                      <div>
                        <p className="font-medium">
                          {theme === 'dark' ? 'Dark mode is active' : 'Light mode is active'}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {theme === 'dark' 
                            ? 'Easier on the eyes in low-light environments' 
                            : 'Best for daytime use and better visibility'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Manage your account security</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-slate-500" />
                      <div>
                        <p className="font-medium">Change Password</p>
                        <p className="text-sm text-slate-500">
                          Update your password regularly for better security
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => setShowPasswordDialog(true)}
                    variant="outline"
                    className="w-full"
                  >
                    Change Password
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and a new one to update your credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {passwordError && (
              <div className="bg-red-50 border-red-200 p-4 rounded-lg">
                <p className="text-red-800 text-sm font-medium">{passwordError}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPasswordDialog(false)
              setCurrentPassword('')
              setNewPassword('')
              setConfirmPassword('')
              setPasswordError('')
            }}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} className="bg-purple-600 hover:bg-purple-700">
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <SuccessModal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
      />
    </div>
  )
}
