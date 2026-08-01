'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiFetch, getStoredUser } from '@/lib/api-client'

const TYPES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'RELIEF_DISTRIBUTION', label: 'Relief Distribution' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'IMPORTANT', label: 'Important' },
]
const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]
const TARGETS = [
  { value: 'ALL', label: 'All roles' },
  { value: 'ADMIN', label: 'Admins only' },
  { value: 'WORKER', label: 'Workers only' },
  { value: 'VULNERABLE', label: 'Vulnerable users only' },
]

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  type: z.string().min(1, 'Type is required'),
  priority: z.string().min(1, 'Priority is required'),
  targetRole: z.string().min(1, 'Audience is required'),
  eventDate: z.string().optional(),
  eventTime: z.string().optional(),
  location: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface AnnouncementFormProps {
  onSubmitted?: () => void
}

export function AnnouncementForm({ onSubmitted }: AnnouncementFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '', content: '', type: 'GENERAL', priority: 'NORMAL',
      targetRole: 'ALL', eventDate: '', eventTime: '', location: '',
    },
  })
  const typeValue = watch('type')
  const priorityValue = watch('priority')
  const targetValue = watch('targetRole')

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      const user = getStoredUser()
      await apiFetch('/api/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title: values.title,
          content: values.content,
          type: values.type,
          priority: values.priority,
          targetRole: values.targetRole === 'ALL' ? null : values.targetRole,
          eventDate: values.eventDate || undefined,
          eventTime: values.eventTime || undefined,
          location: values.location || undefined,
          createdBy: user?.id,
        }),
      })
      toast.success('Announcement published', {
        description: 'Target users have been notified.',
      })
      reset()
      onSubmitted?.()
    } catch (err: any) {
      toast.error('Failed to publish', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      data-tour="announcement-create-form"
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >
      <div data-tour="announcement-message-fields" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="an-title">Title</Label>
          <Input id="an-title" {...register('title')} placeholder="Announcement title" />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="an-content">Content</Label>
          <Textarea
            id="an-content"
            {...register('content')}
            placeholder="Announcement details..."
            rows={5}
          />
          {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
        </div>
      </div>
      <div
        data-tour="announcement-classification-fields"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={typeValue} onValueChange={(v) => setValue('type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priorityValue} onValueChange={(v) => setValue('priority', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Audience</Label>
          <Select value={targetValue} onValueChange={(v) => setValue('targetRole', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TARGETS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div
        data-tour="announcement-event-fields"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <div className="space-y-2">
          <Label htmlFor="an-date">Event date (optional)</Label>
          <Input id="an-date" type="date" {...register('eventDate')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="an-time">Event time (optional)</Label>
          <Input id="an-time" type="time" {...register('eventTime')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="an-loc">Location (optional)</Label>
          <Input id="an-loc" {...register('location')} placeholder="Venue" />
        </div>
      </div>
      <Button
        data-tour="announcement-publish-button"
        type="submit"
        disabled={submitting}
        className="w-full gap-2"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
        Publish Announcement
      </Button>
    </form>
  )
}
