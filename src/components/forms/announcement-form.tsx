'use client'

import { useEffect, useState } from 'react'
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

const CONTENT_PRESETS = [
  {
    id: 'relief-distribution',
    label: 'Relief distribution notice',
    content:
      'Please be informed that a relief distribution has been scheduled. Kindly review the event date, time, and location below and follow the instructions of authorized personnel.',
  },
  {
    id: 'community-meeting',
    label: 'Community meeting reminder',
    content:
      'This is a reminder about the upcoming community meeting. Please review the event details below and arrive on time. Your attendance and cooperation are appreciated.',
  },
  {
    id: 'emergency-advisory',
    label: 'Emergency advisory',
    content:
      'Please take note of this important emergency advisory. Follow official LGU instructions, remain alert for updates, and contact the proper local authorities if assistance is needed.',
  },
  {
    id: 'registration-reminder',
    label: 'Registration reminder',
    content:
      'Residents who need to complete or update their vulnerable citizen registration are encouraged to prepare the required information and documents and coordinate with authorized personnel.',
  },
  {
    id: 'general-update',
    label: 'General community update',
    content:
      'Please be informed of this community update from the San Policarpo Community Resource Mapping System. Kindly read the details carefully and follow any applicable instructions.',
  },
]

type HistoricalAnnouncement = {
  title?: string | null
  content?: string | null
}

type FrequentSuggestion = {
  text: string
  count: number
}

function normalizeSuggestionText(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function buildFrequentSuggestions(
  announcements: HistoricalAnnouncement[],
  field: 'title' | 'content',
) {
  const counts = new Map<
    string,
    { text: string; count: number }
  >()

  for (const announcement of announcements) {
    const raw = String(announcement[field] || '').trim()
    const normalized = normalizeSuggestionText(raw)
    if (!normalized) continue

    const existing = counts.get(normalized)
    if (existing) {
      existing.count += 1
    } else {
      counts.set(normalized, {
        text: raw,
        count: 1,
      })
    }
  }

  return Array.from(counts.values())
    .filter((item) => item.count >= 3)
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.text.localeCompare(b.text),
    )
    .slice(0, 5)
}

function shortPreview(value: string, maxLength = 72) {
  const compact = value.replace(/\s+/g, ' ').trim()
  return compact.length <= maxLength
    ? compact
    : `${compact.slice(0, maxLength - 1)}…`
}

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
  const [frequentTitles, setFrequentTitles] = useState<FrequentSuggestion[]>([])
  const [frequentContents, setFrequentContents] = useState<FrequentSuggestion[]>([])
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

  useEffect(() => {
    let active = true

    apiFetch<{
      announcements?: HistoricalAnnouncement[]
    }>('/api/announcements?includeInactive=true')
      .then((data) => {
        if (!active) return
        const announcements = Array.isArray(
          data.announcements,
        )
          ? data.announcements
          : []

        setFrequentTitles(
          buildFrequentSuggestions(
            announcements,
            'title',
          ),
        )
        setFrequentContents(
          buildFrequentSuggestions(
            announcements,
            'content',
          ),
        )
      })
      .catch(() => {
        if (!active) return
        setFrequentTitles([])
        setFrequentContents([])
      })

    return () => {
      active = false
    }
  }, [])

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
      <div data-tour="announcement-message-fields" className="space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="an-title">Title</Label>
            {frequentTitles.length > 0 && (
              <span className="text-[0.6875rem] font-medium text-muted-foreground">
                Frequently used titles are available
              </span>
            )}
          </div>

          {frequentTitles.length > 0 && (
            <Select
              onValueChange={(value) =>
                setValue('title', value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a frequently used title" />
              </SelectTrigger>
              <SelectContent>
                {frequentTitles.map((item) => (
                  <SelectItem
                    key={normalizeSuggestionText(item.text)}
                    value={item.text}
                  >
                    {shortPreview(item.text, 58)} · used {item.count}×
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Input
            id="an-title"
            {...register('title')}
            placeholder="Type an announcement title"
          />

          <p className="text-xs leading-5 text-muted-foreground">
            A title automatically appears in the dropdown after it has been
            published at least 3 times. The 5 most-used titles are kept here.
          </p>

          {errors.title && (
            <p className="text-xs text-destructive">
              {errors.title.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Message preset</Label>
          <Select
            onValueChange={(value) => {
              const builtIn = CONTENT_PRESETS.find(
                (preset) => preset.id === value,
              )

              if (builtIn) {
                setValue('content', builtIn.content, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
                return
              }

              const learnedIndex = Number(
                value.replace('learned:', ''),
              )

              if (
                value.startsWith('learned:') &&
                Number.isInteger(learnedIndex) &&
                frequentContents[learnedIndex]
              ) {
                setValue(
                  'content',
                  frequentContents[learnedIndex].text,
                  {
                    shouldDirty: true,
                    shouldValidate: true,
                  },
                )
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a preset message or type your own below" />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_PRESETS.map((preset) => (
                <SelectItem
                  key={preset.id}
                  value={preset.id}
                >
                  {preset.label}
                </SelectItem>
              ))}

              {frequentContents.map((item, index) => (
                <SelectItem
                  key={`learned-${normalizeSuggestionText(item.text)}`}
                  value={`learned:${index}`}
                >
                  Previously used ({item.count}×) · {shortPreview(item.text, 48)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <p className="text-xs leading-5 text-muted-foreground">
            Choosing a preset fills the message box. You can still edit,
            replace, or type the entire announcement manually.
          </p>

          <Label htmlFor="an-content">Content</Label>
          <Textarea
            id="an-content"
            {...register('content')}
            placeholder="Type the announcement message, or choose a preset above..."
            rows={6}
          />

          {errors.content && (
            <p className="text-xs text-destructive">
              {errors.content.message}
            </p>
          )}
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
