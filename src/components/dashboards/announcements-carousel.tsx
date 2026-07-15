'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Megaphone, Calendar, MapPin, Clock, Bell,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Carousel, type CarouselSlide } from '@/components/landing/carousel'
import { apiFetch } from '@/lib/api-client'

/**
 * AnnouncementsCarousel
 * =====================
 * A reusable carousel that fetches announcements from /api/announcements
 * and displays each as a featured slide. Designed for use inside the
 * in-app dashboards (admin, worker, vulnerable) as a hero element at
 * the top of the announcements view.
 *
 * Uses the same accessible Carousel primitive as the landing page
 * FeatureSlider, demonstrating the component's reusability.
 */

interface Announcement {
  id: string
  title: string
  content: string
  type: string
  targetRole: string | null
  eventDate: string | null
  eventTime: string | null
  location: string | null
  isActive: boolean
  priority: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface AnnouncementSlide extends CarouselSlide {
  announcement: Announcement
}

interface AnnouncementsCarouselProps {
  /** The role of the current user, used to filter announcements. */
  userRole: 'admin' | 'worker' | 'vulnerable'
  /** Max number of slides to show (defaults to 5). */
  maxSlides?: 5
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  EMERGENCY: AlertTriangle,
  RELIEF_DISTRIBUTION: Megaphone,
  MEETING: Calendar,
  IMPORTANT: Bell,
  GENERAL: Megaphone,
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: '#ef4444',
  HIGH: '#f59e0b',
  NORMAL: '#34d399',
  LOW: '#6ee7b7',
}

function formatDate(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return formatDate(d)
}

export function AnnouncementsCarousel({ userRole, maxSlides = 5 }: AnnouncementsCarouselProps) {
  const [slides, setSlides] = useState<AnnouncementSlide[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch<{ success: boolean; announcements: Announcement[] }>(
        `/api/announcements?userRole=${userRole.toUpperCase()}`
      )
      const anns = (data.announcements || []).slice(0, maxSlides)
      const total = anns.length
      const built: AnnouncementSlide[] = anns.map((a, i) => ({
        id: a.id,
        index: i + 1,
        total,
        announcement: a,
      }))
      setSlides(built)
    } catch (err: any) {
      toast.error('Failed to load announcements', { description: err.message })
    } finally {
      setLoading(false)
    }
  }, [userRole, maxSlides])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="mb-6 flex items-center justify-center rounded-3xl border border-border bg-card/50 p-12">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Bell className="h-6 w-6 animate-pulse text-primary" />
          <span className="text-sm">Loading announcements...</span>
        </div>
      </div>
    )
  }

  if (slides.length === 0) {
    return (
      <div className="mb-6 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/30 p-10 text-center">
        <Bell className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">No announcements yet</p>
        <p className="text-xs text-muted-foreground">New notices will appear here as a featured carousel.</p>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Featured Announcements</h3>
        <span className="text-xs text-muted-foreground">· auto-rotating</span>
      </div>
      <Carousel<AnnouncementSlide>
        slides={slides}
        ariaLabel="Featured announcements"
        accentColor={PRIORITY_COLORS[slides[0]?.announcement.priority] || '#34d399'}
        autoAdvanceMs={7000}
        renderSlide={({ announcement: a }) => {
          const Icon = TYPE_ICONS[a.type] || Megaphone
          const color = PRIORITY_COLORS[a.priority] || '#34d399'
          return (
            <motion.article
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-card/50 p-6 md:p-7"
              style={{ borderColor: `${color}40` }}
            >
              {/* Accent glow */}
              <div
                className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full opacity-20 blur-[80px]"
                style={{ background: color }}
                aria-hidden="true"
              />
              {/* Left accent bar */}
              <div
                className="absolute inset-y-0 left-0 w-1"
                style={{ background: `linear-gradient(to bottom, ${color}, transparent)` }}
                aria-hidden="true"
              />

              <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex-1 space-y-3">
                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-wide"
                      style={{ backgroundColor: `${color}1a`, color }}
                    >
                      <Icon className="h-3 w-3" />
                      {a.type.replace(/_/g, ' ')}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase"
                      style={{ backgroundColor: `${color}22`, color }}
                    >
                      {a.priority}
                    </span>
                    {a.targetRole && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
                        To: {a.targetRole}
                      </span>
                    )}
                  </div>

                  {/* Title + content */}
                  <div>
                    <h4 className="text-lg font-bold tracking-tight text-foreground md:text-xl">
                      {a.title}
                    </h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {a.content}
                    </p>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    {a.eventDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        {formatDate(a.eventDate)}{a.eventTime ? ` · ${a.eventTime}` : ''}
                      </span>
                    )}
                    {a.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {a.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      {timeAgo(a.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Priority visual — right side */}
                <div className="hidden shrink-0 md:block">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 180, damping: 14 }}
                    className="relative flex h-20 w-20 items-center justify-center rounded-2xl border"
                    style={{ borderColor: `${color}40`, backgroundColor: `${color}0d` }}
                  >
                    <Icon className="h-9 w-9" style={{ color }} />
                    {a.priority === 'URGENT' && (
                      <motion.span
                        className="absolute inset-0 rounded-2xl border-2"
                        style={{ borderColor: color }}
                        animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                </div>
              </div>
            </motion.article>
          )
        }}
      />
    </div>
  )
}
