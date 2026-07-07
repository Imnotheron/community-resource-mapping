'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'
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
import { apiFetch } from '@/lib/api-client'

const FEEDBACK_TYPES = [
  { value: 'FEEDBACK', label: 'General Feedback' },
  { value: 'MESSAGE', label: 'Message' },
  { value: 'REPORT', label: 'Report an Issue' },
  { value: 'BUG_REPORT', label: 'Bug Report' },
  { value: 'FEATURE_REQUEST', label: 'Feature Request' },
  { value: 'COMPLIMENT', label: 'Compliment' },
  { value: 'SUGGESTION', label: 'Suggestion' },
  { value: 'SERVICE_COMPLAINT', label: 'Service Complaint' },
  { value: 'OTHER', label: 'Other' },
]

const schema = z.object({
  type: z.string().min(1, 'Please select a type'),
  subject: z.string().max(120).optional(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})
type FormValues = z.infer<typeof schema>

interface FeedbackFormProps {
  onSubmitted?: () => void
}

export function FeedbackForm({ onSubmitted }: FeedbackFormProps) {
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
    defaultValues: { type: '', subject: '', message: '' },
  })
  const typeValue = watch('type')

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      await apiFetch('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          type: values.type,
          subject: values.subject || undefined,
          message: values.message,
        }),
      })
      toast.success('Feedback submitted', {
        description: 'Thank you. An administrator will review your submission.',
      })
      reset()
      onSubmitted?.()
    } catch (err: any) {
      toast.error('Failed to submit', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fb-type">Type</Label>
        <Select value={typeValue} onValueChange={(v) => setValue('type', v, { shouldValidate: true })}>
          <SelectTrigger id="fb-type">
            <SelectValue placeholder="Select feedback type" />
          </SelectTrigger>
          <SelectContent>
            {FEEDBACK_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="fb-subject">Subject (optional)</Label>
        <Input id="fb-subject" {...register('subject')} placeholder="Brief summary" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fb-message">Message</Label>
        <Textarea
          id="fb-message"
          {...register('message')}
          placeholder="Tell us more..."
          rows={5}
        />
        {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
      </div>
      <Button type="submit" disabled={submitting} className="w-full gap-2">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Submit Feedback
      </Button>
    </form>
  )
}
