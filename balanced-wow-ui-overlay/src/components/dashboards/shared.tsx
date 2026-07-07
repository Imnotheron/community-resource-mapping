'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return formatDate(d)
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  DISTRIBUTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  SUBMITTED: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  REVIEWED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  RESOLVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  DISMISSED: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = (status || '').toUpperCase()
  return (
    <Badge
      variant="outline"
      className={cn(
        'border-transparent font-medium',
        STATUS_STYLES[normalized] || 'bg-muted text-muted-foreground'
      )}
    >
      {normalized}
    </Badge>
  )
}

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  NORMAL: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  LOW: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
}

export function PriorityBadge({ priority }: { priority: string }) {
  const normalized = (priority || 'NORMAL').toUpperCase()
  return (
    <Badge variant="outline" className={cn('border-transparent font-medium', PRIORITY_STYLES[normalized] || PRIORITY_STYLES.NORMAL)}>
      {normalized}
    </Badge>
  )
}

export function formatVulnerabilityTypes(raw: string | string[] | null | undefined): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function vulnerabilityLabel(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
