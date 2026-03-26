'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Megaphone,
  Send,
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  Bell,
  Tag,
  Users,
  Info
} from 'lucide-react'

interface AnnouncementFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  userId: string
  userRole: 'ADMIN' | 'WORKER'
  onShowSuccess?: (message: string) => void
}

export default function AnnouncementForm({
  isOpen,
  onClose,
  onSuccess,
  userId,
  userRole,
  onShowSuccess
}: AnnouncementFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'GENERAL',
    targetRole: 'ALL',
    priority: 'NORMAL',
    eventDate: '',
    eventTime: '',
    location: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = {
        ...formData,
        createdBy: userId,
        targetRole: formData.targetRole === 'ALL' ? null : formData.targetRole,
        eventDate: formData.eventDate || null,
        eventTime: formData.eventTime || null,
        location: formData.location || null
      }

      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (data.success) {
        if (onShowSuccess) {
          onShowSuccess(data.message || 'Announcement created successfully!')
        }
        onSuccess()
        handleClose()
      } else {
        if (onShowSuccess) {
          onShowSuccess(data.error || 'Failed to create announcement')
        }
      }
    } catch (error) {
      console.error('Error creating announcement:', error)
      if (onShowSuccess) {
        onShowSuccess('Failed to create announcement. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      title: '',
      content: '',
      type: 'GENERAL',
      targetRole: 'ALL',
      priority: 'NORMAL',
      eventDate: '',
      eventTime: '',
      location: ''
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-2 shadow-2xl">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent font-bold">
              Create New Announcement
            </span>
          </DialogTitle>
          <DialogDescription className="text-base text-slate-600 dark:text-slate-400 mt-2">
            Share important updates with the community
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-6">
          <div className="space-y-3">
            <Label htmlFor="title" className="text-base font-semibold flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600" />
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Enter announcement title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="h-11 text-base border-2 focus:border-blue-500 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="content" className="text-base font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              Content <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="content"
              placeholder="Enter the announcement content..."
              rows={6}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              maxLength={2000}
              className="text-base border-2 focus:border-blue-500 focus:ring-blue-500 transition-all resize-none"
            />
            <p className="text-xs text-slate-500 text-right font-medium">
              {formData.content.length}/2000 characters
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="type" className="text-base font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger id="type" className="h-11 text-base border-2 focus:border-blue-500 focus:ring-blue-500 transition-all relative z-10">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="border-2 shadow-lg z-50">
                <SelectItem value="GENERAL" className="text-base py-3">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-600" />
                    <span>General Announcement</span>
                  </div>
                </SelectItem>
                <SelectItem value="RELIEF_DISTRIBUTION" className="text-base py-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-600" />
                    <span>Relief Distribution</span>
                  </div>
                </SelectItem>
                <SelectItem value="MEETING" className="text-base py-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-600" />
                    <span>Meeting</span>
                  </div>
                </SelectItem>
                <SelectItem value="EMERGENCY" className="text-base py-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-red-600 font-medium">Emergency</span>
                  </div>
                </SelectItem>
                <SelectItem value="IMPORTANT" className="text-base py-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-600" />
                    <span className="text-amber-600 font-medium">Important Notice</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label htmlFor="priority" className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
              Priority <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger id="priority" className="h-11 text-base border-2 focus:border-blue-500 focus:ring-blue-500 transition-all relative z-10">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent className="border-2 shadow-lg z-50">
                <SelectItem value="LOW" className="text-base py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-400" />
                    <span>Low Priority</span>
                  </div>
                </SelectItem>
                <SelectItem value="NORMAL" className="text-base py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>Normal Priority</span>
                  </div>
                </SelectItem>
                <SelectItem value="HIGH" className="text-base py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-amber-600 font-medium">High Priority</span>
                  </div>
                </SelectItem>
                <SelectItem value="URGENT" className="text-base py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-red-600 font-bold">Urgent</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label htmlFor="targetRole" className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Target Audience
            </Label>
            <Select
              value={formData.targetRole}
              onValueChange={(value) => setFormData({ ...formData, targetRole: value })}
            >
              <SelectTrigger id="targetRole" className="h-11 text-base border-2 focus:border-blue-500 focus:ring-blue-500 transition-all relative z-10">
                <SelectValue placeholder="Send to all users" />
              </SelectTrigger>
              <SelectContent className="border-2 shadow-lg z-50">
                <SelectItem value="ALL" className="text-base py-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-600" />
                    <span>All Users</span>
                  </div>
                </SelectItem>
                <SelectItem value="ADMIN" className="text-base py-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-purple-600" />
                    <span className="text-purple-600 font-medium">Admins Only</span>
                  </div>
                </SelectItem>
                <SelectItem value="WORKER" className="text-base py-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-600 font-medium">Workers Only</span>
                  </div>
                </SelectItem>
                <SelectItem value="VULNERABLE" className="text-base py-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-green-600" />
                    <span className="text-green-600 font-medium">Vulnerable Individuals Only</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(formData.type === 'MEETING' || formData.type === 'RELIEF_DISTRIBUTION') && (
            <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl border-2 border-blue-200 dark:border-blue-700 shadow-sm">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Event Details (Optional)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eventDate" className="text-sm font-medium">Event Date</Label>
                  <Input
                    id="eventDate"
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="h-10 border-2 focus:border-blue-500 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventTime" className="text-sm font-medium">Event Time</Label>
                  <Input
                    id="eventTime"
                    type="time"
                    value={formData.eventTime}
                    onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
                    className="h-10 border-2 focus:border-blue-500 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor="location" className="text-sm font-medium">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="location"
                    placeholder="Enter event location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="pl-10 h-10 border-2 focus:border-blue-500 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {formData.priority === 'URGENT' && (
            <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-xl border-2 border-red-200 dark:border-red-700 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-base font-bold text-red-900 dark:text-red-100 mb-1">
                    Urgent Announcement
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
                    This will be marked as urgent and notifications will be sent immediately to all targeted users.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-11 px-6 gap-2 border-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-6 gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md transition-all font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Announcement
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
