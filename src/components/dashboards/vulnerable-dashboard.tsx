'use client'

import { RoleManual } from '@/components/help/RoleManual'
import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import {
  LayoutDashboard, User, Package, MessageSquare, Megaphone,
  Loader2, Send, MapPin, CheckCircle2, Clock, AlertCircle, BookOpen,
} from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { NavItem } from '@/components/layout/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { WowLoader } from '@/components/ui/wow-loader'
import { FeedbackForm } from '@/components/forms/feedback-form'
import { AnnouncementsCarousel } from '@/components/dashboards/announcements-carousel'
import { apiFetch, AuthUser } from '@/lib/api-client'
import {
  formatDate, formatDateTime, timeAgo, StatusBadge, PriorityBadge,
  formatVulnerabilityTypes, vulnerabilityLabel,
} from './shared'

const SingleLocationMap = dynamic(
  () => import('@/components/maps/single-location-map').then((m) => m.SingleLocationMap),
  {
    ssr: false,
    loading: () => (
      <WowLoader
        compact
        label="Loading location"
        description="Rendering saved map position..."
        className="h-[280px]"
      />
    ),
  }
)

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'my-profile', label: 'My Profile', icon: User },
  { id: 'relief-history', label: 'Relief History', icon: Package },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'guide', label: 'User Guide', icon: BookOpen },
]

interface VulnerableDashboardProps {
  user: AuthUser
  onLogout: () => void
  onProfile: () => void
}

export function VulnerableDashboard({ user, onLogout, onProfile }: VulnerableDashboardProps) {
  const [view, setView] = useState('overview')
  return (
    <AppShell
      items={NAV_ITEMS}
      activeView={view}
      onNavigate={setView}
      onLogout={onLogout}
      onProfile={onProfile}
      userName={user.name}
      userEmail={user.email}
      userRole={user.role}
    >
      {view === 'overview' && <OverviewView userId={user.id} onNavigate={setView} />}
      {view === 'my-profile' && <MyProfileView userId={user.id} />}
      {view === 'relief-history' && <ReliefHistoryView userId={user.id} />}
      {view === 'feedback' && <FeedbackView userId={user.id} />}
      {view === 'announcements' && <AnnouncementsView />}
      {view === 'guide' && <RoleManual role={user.role} />}
    </AppShell>
  )
}

// =================== OVERVIEW ===================
function OverviewView({ userId, onNavigate }: { userId: string; onNavigate: (v: string) => void }) {
  const [profile, setProfile] = useState<any>(null)
  const [distributions, setDistributions] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [p, h, a] = await Promise.all([
          apiFetch(`/api/vulnerable/profile?userId=${userId}`).catch(() => null),
          apiFetch(`/api/vulnerable/relief-history?userId=${userId}`),
          apiFetch('/api/announcements?userRole=VULNERABLE'),
        ])
        setProfile(p?.profile || null)
        setDistributions(h.distributions || [])
        setAnnouncements((a.announcements || []).slice(0, 3))
      } catch (err: any) {
        toast.error('Failed to load overview', { description: err.message })
      } finally {
        setLoading(false)
      }
    })()
  }, [userId])

  if (loading) {
    return (
      <WowLoader
        label="Loading citizen dashboard"
        description="Checking your profile, relief history, and announcements..."
      />
    )
  }

  const receivedRelief = distributions.filter((d) => d.status === 'APPROVED').length
  const pendingRelief = distributions.filter((d) => d.status === 'PENDING').length

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {profile?.firstName || 'Citizen'}</h1>
        <p className="text-sm text-muted-foreground">Your assistance dashboard.</p>
      </div>

      {profile && (
        <div className="gov-card flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Registration Status</p>
            <p className="text-sm text-muted-foreground">
              {profile.registrationStatus === 'APPROVED'
                ? 'Your registration is approved. You can receive assistance.'
                : profile.registrationStatus === 'PENDING'
                ? 'Your registration is pending admin review.'
                : 'Your registration was rejected.'}
            </p>
          </div>
          <StatusBadge status={profile.registrationStatus} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="gov-stat">
          <span className="stat-label">Relief Received</span>
          <span className="stat-value text-emerald-600">{receivedRelief}</span>
        </div>
        <div className="gov-stat">
          <span className="stat-label">Pending Requests</span>
          <span className="stat-value text-amber-600">{pendingRelief}</span>
        </div>
        <div className="gov-stat">
          <span className="stat-label">New Announcements</span>
          <span className="stat-value text-primary">{announcements.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Relief</CardTitle>
            <CardDescription>Your latest distributions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {distributions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No relief distributions yet.</p>
            ) : (
              distributions.slice(0, 4).map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.distributionType}</p>
                    <p className="truncate text-xs text-muted-foreground">{timeAgo(d.createdAt)}</p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest Announcements</CardTitle>
            <CardDescription>Notices from the MSWDO</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements.</p>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="border-b border-border pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <PriorityBadge priority={a.priority} />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{a.content}</p>
                </div>
              ))
            )}
            <Button variant="ghost" size="sm" onClick={() => onNavigate('announcements')} className="w-full">
              View all announcements
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button onClick={() => onNavigate('relief-history')} variant="outline" className="gap-2" size="lg">
          <Package className="h-4 w-4" /> View Relief History
        </Button>
        <Button onClick={() => onNavigate('feedback')} className="gap-2" size="lg">
          <MessageSquare className="h-4 w-4" /> Send Feedback
        </Button>
      </div>
    </div>
  )
}

// =================== MY PROFILE ===================
function MyProfileView({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`/api/vulnerable/profile?userId=${userId}`)
        setProfile(data.profile)
      } catch (err: any) {
        toast.error('Failed to load profile', { description: err.message })
      } finally {
        setLoading(false)
      }
    })()
  }, [userId])

  if (loading) {
    return (
      <WowLoader
        label="Loading profile"
        description="Preparing your registration details..."
      />
    )
  }
  if (!profile) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-center">
          <AlertCircle className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No profile found. Please contact a field worker to register.</p>
        </CardContent>
      </Card>
    )
  }

  const vuln = formatVulnerabilityTypes(profile.vulnerabilityTypes)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground">Your registration details on file.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">{profile.firstName} {profile.middleName ? profile.middleName + ' ' : ''}{profile.lastName}{profile.suffix ? ', ' + profile.suffix : ''}</h2>
              <p className="text-sm text-muted-foreground">{profile.emailAddress}</p>
            </div>
            <StatusBadge status={profile.registrationStatus} />
          </div>
          {profile.rejectionReason && (
            <p className="mt-2 text-sm text-destructive"><b>Rejection reason:</b> {profile.rejectionReason}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ProfileRow label="Gender" value={profile.gender} />
            <ProfileRow label="Civil Status" value={profile.civilStatus} />
            <ProfileRow label="Mobile" value={profile.mobileNumber} />
            <ProfileRow label="Landline" value={profile.landlineNumber} />
            <ProfileRow label="Education" value={profile.educationalAttainment} />
            <ProfileRow label="Employment" value={profile.employmentStatus} />
            {profile.employmentDetails && <ProfileRow label="Employment Details" value={profile.employmentDetails} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Address</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ProfileRow label="House No." value={profile.houseNumber} />
            <ProfileRow label="Street" value={profile.street} />
            <ProfileRow label="Barangay" value={profile.barangay} />
            <ProfileRow label="Municipality" value={profile.municipality} />
            <ProfileRow label="Province" value={profile.province} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Vulnerability & Medical</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Vulnerability Types:</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {vuln.length > 0 ? vuln.map((v: string) => (
                  <Badge key={v} variant="secondary" className="text-[10px]">{vulnerabilityLabel(v)}</Badge>
                )) : <span className="text-muted-foreground">None specified</span>}
              </div>
            </div>
            {profile.disabilityType && <ProfileRow label="Disability Type" value={profile.disabilityType} />}
            {profile.disabilityCause && <ProfileRow label="Disability Cause" value={profile.disabilityCause} />}
            {profile.disabilityIdNumber && <ProfileRow label="Disability ID No." value={profile.disabilityIdNumber} />}
            {profile.hasMedicalCondition && (
              <ProfileRow label="Medical Conditions" value={profile.medicalConditions || 'Yes (details not specified)'} />
            )}
            <ProfileRow label="Needs Assistance" value={profile.needsAssistance ? 'Yes' : 'No'} />
            {profile.assistanceType && <ProfileRow label="Assistance Type" value={profile.assistanceType} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Emergency Contact</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ProfileRow label="Contact Name" value={profile.emergencyContact} />
            <ProfileRow label="Contact Phone" value={profile.emergencyPhone} />
          </CardContent>
        </Card>
      </div>

      {profile.latitude && profile.longitude && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-primary" /> Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SingleLocationMap
              latitude={profile.latitude}
              longitude={profile.longitude}
              label={`${profile.firstName} ${profile.lastName}'s location`}
              height={280}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ProfileRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-1.5 last:border-0 last:pb-0">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="text-right">{value || '—'}</span>
    </div>
  )
}

// =================== RELIEF HISTORY ===================
function ReliefHistoryView({ userId }: { userId: string }) {
  const [distributions, setDistributions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [feedbackTarget, setFeedbackTarget] = useState<any | null>(null)
  const [feedbackForm, setFeedbackForm] = useState({ feedbackType: 'FEEDBACK', message: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch(`/api/vulnerable/relief-history?userId=${userId}`)
      setDistributions(data.distributions || [])
    } catch (err: any) {
      toast.error('Failed to load history', { description: err.message })
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  const submitFeedback = async () => {
    if (!feedbackTarget || !feedbackForm.message.trim()) return
    setSubmitting(true)
    try {
      await apiFetch('/api/vulnerable/feedback', {
        method: 'POST',
        body: JSON.stringify({
          reliefDistributionId: feedbackTarget.id,
          userId,
          feedbackType: feedbackForm.feedbackType,
          message: feedbackForm.message,
        }),
      })
      toast.success('Feedback submitted', { description: 'Thank you for your feedback.' })
      setFeedbackTarget(null)
      setFeedbackForm({ feedbackType: 'FEEDBACK', message: '' })
      load()
    } catch (err: any) {
      toast.error('Failed to submit', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relief History</h1>
        <p className="text-sm text-muted-foreground">All relief distributions you have received.</p>
      </div>
      {loading ? (
        <WowLoader
          compact
          label="Loading relief history"
          description="Checking your distribution records..."
        />
      ) : distributions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No relief distributions recorded yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {distributions.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{d.distributionType}</h3>
                      <StatusBadge status={d.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{d.itemsProvided}</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground md:grid-cols-3">
                      <span><b className="text-foreground">Worker:</b> {d.worker?.name || '—'}</span>
                      <span><b className="text-foreground">Quantity:</b> {d.quantity}</span>
                      <span><b className="text-foreground">Date:</b> {formatDate(d.distributionDate)}</span>
                    </div>
                    {d.notes && <p className="text-xs italic text-muted-foreground">"{d.notes}"</p>}
                    {d.feedback && d.feedback.length > 0 && (
                      <div className="mt-2 rounded-md bg-muted p-2 text-xs">
                        <span className="font-medium text-foreground">Your feedback:</span> {d.feedback[0].message}
                        {d.feedback[0].adminResponse && (
                          <div className="mt-1"><span className="font-medium text-foreground">Response:</span> {d.feedback[0].adminResponse}</div>
                        )}
                      </div>
                    )}
                  </div>
                  {d.status === 'APPROVED' && (!d.feedback || d.feedback.length === 0) && (
                    <Button size="sm" variant="outline" onClick={() => setFeedbackTarget(d)}>
                      Give Feedback
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!feedbackTarget} onOpenChange={(o) => !o && setFeedbackTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feedback for {feedbackTarget?.distributionType}</DialogTitle>
            <DialogDescription>Share your experience about this relief distribution.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={feedbackForm.feedbackType} onValueChange={(v) => setFeedbackForm({ ...feedbackForm, feedbackType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FEEDBACK">Feedback</SelectItem>
                  <SelectItem value="MESSAGE">Message</SelectItem>
                  <SelectItem value="REPORT">Report an Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={feedbackForm.message}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                rows={4}
                placeholder="Tell us about your experience..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackTarget(null)}>Cancel</Button>
            <Button onClick={submitFeedback} disabled={submitting || !feedbackForm.message.trim()} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =================== FEEDBACK ===================
function FeedbackView({ userId }: { userId: string }) {
  const [feedback, setFeedback] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch(`/api/feedback?userId=${userId}`)
      setFeedback(data.feedback || [])
    } catch (err: any) {
      toast.error('Failed to load feedback', { description: err.message })
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feedback</h1>
        <p className="text-sm text-muted-foreground">Send feedback to the MSWDO and view your previous submissions.</p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Submit New Feedback</CardTitle></CardHeader>
          <CardContent><FeedbackForm onSubmitted={load} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Your Previous Feedback</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <WowLoader
                compact
                label="Loading feedback"
                description="Fetching your previous messages..."
              />
            ) : feedback.length === 0 ? (
              <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>
            ) : (
              feedback.map((f) => (
                <div key={f.id} className="border-b border-border pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{f.type.replace(/_/g, ' ')}</Badge>
                    <StatusBadge status={f.status} />
                    <span className="text-xs text-muted-foreground">{timeAgo(f.createdAt)}</span>
                  </div>
                  {f.subject && <p className="mt-1 text-sm font-medium">{f.subject}</p>}
                  <p className="text-sm text-muted-foreground">{f.message}</p>
                  {f.adminResponse && (
                    <div className="mt-1 rounded-md bg-muted p-2 text-xs">
                      <span className="font-medium text-foreground">Admin response:</span> {f.adminResponse}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// =================== ANNOUNCEMENTS ===================
function AnnouncementsView() {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/api/announcements?userRole=VULNERABLE')
        setAnnouncements(data.announcements || [])
      } catch (err: any) {
        toast.error('Failed to load announcements', { description: err.message })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
        <p className="text-sm text-muted-foreground">Official notices from the MSWDO and administrators.</p>
      </div>
      <AnnouncementsCarousel userRole="vulnerable" />
      {loading ? (
        <WowLoader
          compact
          label="Loading announcements"
          description="Collecting official notices..."
        />
      ) : announcements.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No announcements at this time.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{a.title}</h3>
                  <Badge variant="outline" className="text-[10px]">{a.type.replace(/_/g, ' ')}</Badge>
                  <PriorityBadge priority={a.priority} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{a.content}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {a.eventDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDate(a.eventDate)}{a.eventTime ? ` ${a.eventTime}` : ''}
                    </span>
                  )}
                  {a.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {a.location}
                    </span>
                  )}
                  <span>Posted {timeAgo(a.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
