'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, Clock, Loader2, MapPin, Megaphone, Send, Users } from 'lucide-react'
import { toast } from 'sonner'

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

interface AnnouncementFormProps {
  onSubmitted?: () => void
}

type FormState = {
  title: string
  content: string
  type: string
  priority: string
  targetRole: string
  eventDate: string
  eventTime: string
  location: string
}

const INITIAL_FORM: FormState = {
  title: '',
  content: '',
  type: 'GENERAL',
  priority: 'NORMAL',
  targetRole: 'ALL',
  eventDate: '',
  eventTime: '',
  location: '',
}

function getCurrentUserId() {
  if (typeof window === 'undefined') return ''

  try {
    const keys = ['crms_user', 'user', 'auth_user']

    for (const key of keys) {
      const raw = window.localStorage.getItem(key)
      if (!raw) continue

      const parsed = JSON.parse(raw)
      if (parsed?.id) return String(parsed.id)
      if (parsed?.user?.id) return String(parsed.user.id)
    }
  } catch {
    return ''
  }

  return ''
}

async function readApiError(response: Response) {
  const data = await response.json().catch(() => null)
  return data?.message || data?.error || data?.details || `Request failed with status ${response.status}`
}

export function AnnouncementForm({ onSubmitted }: AnnouncementFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(true)

  const contentCount = form.content.trim().length
  const titleCount = form.title.trim().length

  const canSubmit = useMemo(() => {
    return titleCount >= 3 && contentCount >= 5 && !submitting
  }, [contentCount, titleCount, submitting])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function resetForm() {
    setForm(INITIAL_FORM)
  }

  async function submitAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const title = form.title.trim()
    const content = form.content.trim()

    if (title.length < 3) {
      toast.error('Add a clearer title', {
        description: 'The title should be at least 3 characters.',
      })
      return
    }

    if (content.length < 5) {
      toast.error('Add announcement details', {
        description: 'The content should be at least 5 characters.',
      })
      return
    }

    setSubmitting(true)

    try {
      const createdBy = getCurrentUserId()

      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(createdBy ? { 'x-user-id': createdBy } : {}),
        },
        body: JSON.stringify({
          title,
          content,
          type: form.type,
          priority: form.priority,
          targetRole: form.targetRole,
          audience: form.targetRole,
          eventDate: form.eventDate || null,
          eventTime: form.eventTime || null,
          location: form.location.trim() || null,
          createdBy,
          requesterId: createdBy,
          adminId: createdBy,
          sendEmail: true,
        }),
      })

      if (!response.ok) {
        throw new Error(await readApiError(response))
      }

      const data = await response.json().catch(() => null)

      const emailNotification = data?.emailNotification

      toast.success('Announcement published', {
        description: emailNotification?.configured
          ? `${emailNotification.sent || 0} email notification${emailNotification.sent === 1 ? '' : 's'} sent.`
          : data?.announcement?.title || title,
      })

      if (emailNotification && !emailNotification.configured) {
        toast.warning('Email notification was not sent', {
          description: emailNotification.message || 'SMTP email is not configured yet.',
        })
      } else if (emailNotification?.failed > 0) {
        toast.warning('Some announcement emails failed', {
          description: `${emailNotification.sent || 0} sent · ${emailNotification.failed || 0} failed.`,
        })
      }

      resetForm()
      onSubmitted?.()
    } catch (error: any) {
      toast.error('Could not publish announcement', {
        description: error?.message || 'Please check the form and try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submitAnnouncement} className="space-y-5">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Email notification is sent automatically to the selected audience after publishing.
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="announcement-title" className="text-sm font-semibold text-slate-800">
              Title <span className="text-rose-600">*</span>
            </Label>
            <Input
              id="announcement-title"
              value={form.title}
              onChange={(event) => update('title', event.target.value)}
              placeholder="Example: Emergency meeting at municipal hall"
              maxLength={120}
              className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 focus-visible:ring-emerald-500"
              required
            />
            <p className="text-xs text-slate-500">{titleCount}/120 characters</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="announcement-content" className="text-sm font-semibold text-slate-800">
              Content <span className="text-rose-600">*</span>
            </Label>
            <Textarea
              id="announcement-content"
              value={form.content}
              onChange={(event) => update('content', event.target.value)}
              placeholder="Write the complete advisory, instruction, or update here..."
              rows={5}
              maxLength={1000}
              className="min-h-[132px] rounded-xl border-slate-200 bg-white text-slate-900 focus-visible:ring-emerald-500"
              required
            />
            <p className="text-xs text-slate-500">{contentCount}/1000 characters</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label className="text-sm font-semibold text-slate-800">Type</Label>
              <Select value={form.type} onValueChange={(value) => update('type', value)}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                  <SelectItem value="RELIEF">Relief</SelectItem>
                  <SelectItem value="MEETING">Meeting</SelectItem>
                  <SelectItem value="HEALTH">Health</SelectItem>
                  <SelectItem value="WEATHER">Weather</SelectItem>
                  <SelectItem value="SYSTEM">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label className="text-sm font-semibold text-slate-800">Priority</Label>
              <Select value={form.priority} onValueChange={(value) => update('priority', value)}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label className="text-sm font-semibold text-slate-800">Audience</Label>
              <Select value={form.targetRole} onValueChange={(value) => update('targetRole', value)}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Everyone</SelectItem>
                  <SelectItem value="WORKER">Workers only</SelectItem>
                  <SelectItem value="VULNERABLE">Citizens only</SelectItem>
                  <SelectItem value="ADMIN">Admins only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="announcement-date" className="text-sm font-semibold text-slate-800">
                Event date <span className="font-normal text-slate-400">optional</span>
              </Label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="announcement-date"
                  type="date"
                  value={form.eventDate}
                  onChange={(event) => update('eventDate', event.target.value)}
                  className="h-11 rounded-xl border-slate-200 bg-white pl-10 focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="announcement-time" className="text-sm font-semibold text-slate-800">
                Event time <span className="font-normal text-slate-400">optional</span>
              </Label>
              <div className="relative">
                <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="announcement-time"
                  type="time"
                  value={form.eventTime}
                  onChange={(event) => update('eventTime', event.target.value)}
                  className="h-11 rounded-xl border-slate-200 bg-white pl-10 focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="announcement-location" className="text-sm font-semibold text-slate-800">
                Location <span className="font-normal text-slate-400">optional</span>
              </Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="announcement-location"
                  value={form.location}
                  onChange={(event) => update('location', event.target.value)}
                  placeholder="Example: Municipal Hall"
                  className="h-11 rounded-xl border-slate-200 bg-white pl-10 focus-visible:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Preview
              </p>
              <h3 className="mt-1 text-base font-semibold text-slate-950">
                Official notice
              </h3>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview((value) => !value)}
              className="rounded-lg text-xs"
            >
              {showPreview ? 'Hide' : 'Show'}
            </Button>
          </div>

          {showPreview && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                  {form.type.replaceAll('_', ' ')}
                </span>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                  {form.priority}
                </span>
              </div>

              <h4 className="mt-3 text-lg font-semibold leading-6 text-slate-950">
                {form.title.trim() || 'Announcement title'}
              </h4>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                {form.content.trim() || 'Announcement content will appear here as you type.'}
              </p>

              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <p className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  {form.targetRole === 'ALL'
                    ? 'Everyone'
                    : form.targetRole === 'WORKER'
                      ? 'Workers only'
                      : form.targetRole === 'VULNERABLE'
                        ? 'Citizens only'
                        : 'Admins only'}
                </p>
                {form.eventDate && <p>📅 {form.eventDate}</p>}
                {form.eventTime && <p>🕒 {form.eventTime}</p>}
                {form.location && <p>📍 {form.location}</p>}
              </div>
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
            <div className="flex items-start gap-2">
              <Megaphone className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                The system will publish this to the selected audience and make it visible in the announcement list.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">
          Required fields are marked with <span className="text-rose-600">*</span>. Use urgent priority only for time-sensitive municipal advisories.
        </p>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={submitting}
            className="rounded-xl border-slate-200 bg-white"
          >
            Clear
          </Button>
          <Button
            type="submit"
            disabled={!canSubmit}
            className="gap-2 rounded-xl bg-cyan-600 px-5 text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting ? 'Publishing...' : 'Publish Announcement'}
          </Button>
        </div>
      </div>
    </form>
  )
}

export default AnnouncementForm
