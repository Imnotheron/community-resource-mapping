'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Bell,
  Megaphone,
  AlertCircle,
  Calendar,
  MapPin,
  Clock,
  X,
  AlertTriangle,
  Info,
  Package,
  Users
} from 'lucide-react'

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

interface AnnouncementListProps {
  userRole?: 'ADMIN' | 'WORKER' | 'VULNERABLE'
  maxDisplay?: number
  showHeader?: boolean
  className?: string
}

export default function AnnouncementList({
  userRole,
  maxDisplay = 5,
  showHeader = true,
  className = ''
}: AnnouncementListProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAnnouncements()
  }, [userRole])

  const fetchAnnouncements = async () => {
    try {
      const url = userRole
        ? `/api/announcements?userRole=${userRole}`
        : '/api/announcements'

      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setAnnouncements(data.announcements)
      }
    } catch (error) {
      console.error('Error fetching announcements:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <Badge className="bg-red-600 hover:bg-red-700 gap-1"><AlertTriangle className="w-3 h-3" /> Urgent</Badge>
      case 'HIGH':
        return <Badge className="bg-orange-500 hover:bg-orange-600 gap-1"><AlertCircle className="w-3 h-3" /> High</Badge>
      case 'NORMAL':
        return <Badge className="bg-blue-500 hover:bg-blue-600 gap-1"><Info className="w-3 h-3" /> Normal</Badge>
      case 'LOW':
        return <Badge className="bg-slate-500 hover:bg-slate-600 gap-1">Low</Badge>
      default:
        return <Badge>{priority}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'RELIEF_DISTRIBUTION':
        return <Package className="w-5 h-5 text-emerald-600" />
      case 'MEETING':
        return <Users className="w-5 h-5 text-blue-600" />
      case 'EMERGENCY':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'IMPORTANT':
        return <AlertCircle className="w-5 h-5 text-orange-600" />
      case 'GENERAL':
      default:
        return <Megaphone className="w-5 h-5 text-purple-600" />
    }
  }

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'RELIEF_DISTRIBUTION': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      'MEETING': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'EMERGENCY': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      'IMPORTANT': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      'GENERAL': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    }
    const label = type.replace(/_/g, ' ')
    return <Badge className={colors[type] || colors['GENERAL']}>{label}</Badge>
  }

  const displayAnnouncements = maxDisplay
    ? announcements.slice(0, maxDisplay)
    : announcements

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-slate-600 dark:text-slate-400">
            Loading announcements...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Announcements
              {announcements.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {announcements.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Important updates and notifications for you
            </CardDescription>
          </CardHeader>
        )}
        <CardContent>
          {announcements.length === 0 ? (
            <div className="text-center py-8 text-slate-600 dark:text-slate-400">
              <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p>No announcements at this time</p>
              <p className="text-sm mt-1">Check back later for updates</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayAnnouncements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer bg-white dark:bg-slate-800"
                  onClick={() => setSelectedAnnouncement(announcement)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <div className="flex-shrink-0">
                          {getTypeIcon(announcement.type)}
                        </div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">
                          {announcement.title}
                        </h4>
                        {getPriorityBadge(announcement.priority)}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-500 flex-wrap">
                        {getTypeBadge(announcement.type)}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(announcement.createdAt).toLocaleDateString()}
                        </span>
                        {announcement.eventDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(announcement.eventDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {maxDisplay && announcements.length > maxDisplay && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowAllAnnouncements(true)}
                >
                  View All {announcements.length} Announcements
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Announcement Detail Modal - Shows either single announcement or all announcements */}
      <Dialog open={!!selectedAnnouncement || showAllAnnouncements} onOpenChange={(open) => {
        if (!open) {
          setSelectedAnnouncement(null)
          setShowAllAnnouncements(false)
        }
      }}>
        <DialogContent showCloseButton={false} className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {showAllAnnouncements ? (
            <>
              {/* View All Announcements Mode */}
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <DialogTitle className="flex items-center gap-3 text-2xl">
                      <Bell className="w-6 h-6 text-blue-600" />
                      All Announcements
                    </DialogTitle>
                    <CardDescription className="mt-2">
                      {announcements.length} announcement{announcements.length !== 1 ? 's' : ''} total
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllAnnouncements(false)}
                    className="flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer bg-white dark:bg-slate-800"
                    onClick={() => {
                      setShowAllAnnouncements(false)
                      setSelectedAnnouncement(announcement)
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {getTypeIcon(announcement.type)}
                          <h4 className="font-semibold text-slate-900 dark:text-white">
                            {announcement.title}
                          </h4>
                          {getPriorityBadge(announcement.priority)}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                          {announcement.content}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-500 flex-wrap">
                          {getTypeBadge(announcement.type)}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(announcement.createdAt).toLocaleDateString()}
                          </span>
                          {announcement.eventDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(announcement.eventDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : selectedAnnouncement ? (
            <>
              {/* Single Announcement Mode */}
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <DialogTitle className="flex items-center gap-3 text-xl">
                      {getTypeIcon(selectedAnnouncement.type)}
                      {selectedAnnouncement.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      {getTypeBadge(selectedAnnouncement.type)}
                      {getPriorityBadge(selectedAnnouncement.priority)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedAnnouncement(null)}
                    className="flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-slate-900 dark:text-white whitespace-pre-wrap">
                    {selectedAnnouncement.content}
                  </p>
                </div>

                {selectedAnnouncement.eventDate && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Event Details
                    </p>
                    <div className="mt-2 text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <p>
                        <strong>Date:</strong> {new Date(selectedAnnouncement.eventDate).toLocaleDateString('en-PH', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      {selectedAnnouncement.eventTime && (
                        <p>
                          <strong>Time:</strong> {selectedAnnouncement.eventTime}
                        </p>
                      )}
                      {selectedAnnouncement.location && (
                        <p className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <strong>Location:</strong> {selectedAnnouncement.location}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Posted: {new Date(selectedAnnouncement.createdAt).toLocaleString('en-PH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {selectedAnnouncement.updatedAt !== selectedAnnouncement.createdAt && (
                      <span>
                        Updated: {new Date(selectedAnnouncement.updatedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
