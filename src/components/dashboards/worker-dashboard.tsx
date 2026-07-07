'use client'

import { RoleManual } from '@/components/help/RoleManual'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  LayoutDashboard, Package, PackagePlus, UserPlus, NotebookPen, Megaphone,
  Loader2, Check, Users as UsersIcon, BookOpen,
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
import { Skeleton } from '@/components/ui/skeleton'
import { WowLoader } from '@/components/ui/wow-loader'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { AnnouncementsCarousel } from '@/components/dashboards/announcements-carousel'
import VulnerableRegistrationModal from '@/components/modals/VulnerableRegistrationModal'
import { apiFetch, AuthUser, getStoredUser } from '@/lib/api-client'
import { formatDate, formatDateTime, timeAgo, StatusBadge, PriorityBadge, formatVulnerabilityTypes } from './shared'

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'my-distributions', label: 'My Distributions', icon: Package },
  { id: 'new-distribution', label: 'Record Distribution', icon: PackagePlus },
  { id: 'register-vulnerable', label: 'Register Citizen', icon: UserPlus },
  { id: 'field-notes', label: 'Field Notes', icon: NotebookPen },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'guide', label: 'User Guide', icon: BookOpen },
]

interface WorkerDashboardProps {
  user: AuthUser
  onLogout: () => void
  onProfile: () => void
}

export function WorkerDashboard({ user, onLogout, onProfile }: WorkerDashboardProps) {
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
      {view === 'overview' && <OverviewView workerId={user.id} onNavigate={setView} />}
      {view === 'my-distributions' && <MyDistributionsView workerId={user.id} />}
      {view === 'new-distribution' && <NewDistributionView workerId={user.id} onDone={() => setView('my-distributions')} />}
      {view === 'register-vulnerable' && <RegisterVulnerableView workerId={user.id} />}
      {view === 'field-notes' && <FieldNotesView workerId={user.id} />}
      {view === 'announcements' && <WorkerAnnouncementsView />}
      {view === 'guide' && <RoleManual role={user.role} />}
    </AppShell>
  )
}

// =================== OVERVIEW ===================
function OverviewView({ workerId, onNavigate }: { workerId: string; onNavigate: (v: string) => void }) {
  const [distributions, setDistributions] = useState<any[]>([])
  const [profilesCount, setProfilesCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [dist, prof] = await Promise.all([
          apiFetch(`/api/worker/my-distributions?workerId=${workerId}`),
          apiFetch('/api/worker/profiles'),
        ])
        setDistributions(dist.distributions || [])
        setProfilesCount(prof.profiles?.length || 0)
      } catch (err: any) {
        toast.error('Failed to load overview', { description: err.message })
      } finally {
        setLoading(false)
      }
    })()
  }, [workerId])

  if (loading) {
    return (
      <WowLoader
        label="Loading worker dashboard"
        description="Preparing field operations, distributions, and citizen records..."
      />
    )
  }

  const pending = distributions.filter((d) => d.status === 'PENDING').length
  const approved = distributions.filter((d) => d.status === 'APPROVED').length

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Worker Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your field operations at a glance.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="gov-stat">
          <span className="stat-label">Total Distributions</span>
          <span className="stat-value text-primary">{distributions.length}</span>
        </div>
        <div className="gov-stat">
          <span className="stat-label">Pending Approval</span>
          <span className="stat-value text-amber-600">{pending}</span>
        </div>
        <div className="gov-stat">
          <span className="stat-label">Approved</span>
          <span className="stat-value text-emerald-600">{approved}</span>
        </div>
        <div className="gov-stat">
          <span className="stat-label">Registered Citizens</span>
          <span className="stat-value">{profilesCount}</span>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Distributions</CardTitle>
          <CardDescription>Your latest recorded relief distributions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {distributions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No distributions recorded yet.</p>
          ) : (
            distributions.slice(0, 5).map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.distributionType} — {d.itemsProvided}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.vulnerableProfile ? `${d.vulnerableProfile.firstName} ${d.vulnerableProfile.lastName}` : 'Household'} · {timeAgo(d.createdAt)}
                  </p>
                </div>
                <StatusBadge status={d.status} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button onClick={() => onNavigate('new-distribution')} className="gap-2" size="lg">
          <PackagePlus className="h-4 w-4" /> Record New Distribution
        </Button>
        <Button onClick={() => onNavigate('register-vulnerable')} variant="outline" className="gap-2" size="lg">
          <UserPlus className="h-4 w-4" /> Register Vulnerable Citizen
        </Button>
      </div>
    </div>
  )
}

// =================== MY DISTRIBUTIONS ===================
function MyDistributionsView({ workerId }: { workerId: string }) {
  const [distributions, setDistributions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch(`/api/worker/my-distributions?workerId=${workerId}`)
      setDistributions(data.distributions || [])
    } catch (err: any) {
      toast.error('Failed to load distributions', { description: err.message })
    } finally {
      setLoading(false)
    }
  }, [workerId])

  useEffect(() => { load() }, [load])

  const filtered = distributions.filter((d) => filter === 'ALL' || d.status === filter)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Distributions</h1>
          <p className="text-sm text-muted-foreground">Relief distributions you have recorded.</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <WowLoader
          compact
          label="Loading distributions"
          description="Fetching your field records..."
        />
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No distributions found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{d.distributionType}</h3>
                  <StatusBadge status={d.status} />
                </div>
                <p className="text-sm text-muted-foreground">{d.itemsProvided}</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground md:grid-cols-4">
                  <span><b className="text-foreground">Beneficiary:</b> {d.vulnerableProfile ? `${d.vulnerableProfile.firstName} ${d.vulnerableProfile.lastName}` : '—'}</span>
                  <span><b className="text-foreground">Quantity:</b> {d.quantity}</span>
                  <span><b className="text-foreground">Date:</b> {formatDate(d.distributionDate)}</span>
                  <span><b className="text-foreground">Recorded:</b> {timeAgo(d.createdAt)}</span>
                </div>
                {d.notes && <p className="text-xs italic text-muted-foreground">"{d.notes}"</p>}
                {d.rejectionReason && <p className="text-xs text-destructive"><b>Rejection:</b> {d.rejectionReason}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// =================== NEW DISTRIBUTION ===================
function NewDistributionView({ workerId, onDone }: { workerId: string; onDone: () => void }) {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    vulnerableProfileId: '',
    distributionType: 'Food Pack',
    itemsProvided: '',
    quantity: '1',
    notes: '',
  })

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/api/worker/profiles')
        setProfiles((data.profiles || []).filter((p: any) => p.registrationStatus === 'APPROVED'))
      } catch (err: any) {
        toast.error('Failed to load profiles', { description: err.message })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const submit = async () => {
    if (!form.vulnerableProfileId || !form.distributionType || !form.itemsProvided || !form.quantity) {
      toast.error('Please fill all required fields')
      return
    }
    setSubmitting(true)
    try {
      await apiFetch('/api/worker/distribute', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          workerId,
          quantity: parseInt(form.quantity, 10),
        }),
      })
      toast.success('Distribution recorded', { description: 'Pending admin approval.' })
      onDone()
    } catch (err: any) {
      toast.error('Failed to record', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Record Relief Distribution</h1>
        <p className="text-sm text-muted-foreground">Log a new relief distribution for an approved citizen.</p>
      </div>
      <Card>
        <CardContent className="space-y-4 p-6">
          {loading ? (
            <WowLoader
              compact
              label="Loading beneficiaries"
              description="Fetching approved citizens..."
            />
          ) : (
            <div className="space-y-2">
              <Label>Beneficiary (approved citizens)</Label>
              <Select value={form.vulnerableProfileId} onValueChange={(v) => setForm({ ...form, vulnerableProfileId: v })}>
                <SelectTrigger><SelectValue placeholder="Select a citizen..." /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} — {p.barangay}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {profiles.length === 0 && (
                <p className="text-xs text-muted-foreground">No approved citizens available. Register one first.</p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label>Distribution Type</Label>
            <Select value={form.distributionType} onValueChange={(v) => setForm({ ...form, distributionType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Food Pack">Food Pack</SelectItem>
                <SelectItem value="Hygiene Kit">Hygiene Kit</SelectItem>
                <SelectItem value="Cash Assistance">Cash Assistance</SelectItem>
                <SelectItem value="Medical Supplies">Medical Supplies</SelectItem>
                <SelectItem value="Shelter Materials">Shelter Materials</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Items Provided</Label>
            <Input
              value={form.itemsProvided}
              onChange={(e) => setForm({ ...form, itemsProvided: e.target.value })}
              placeholder="e.g. Rice 5kg, Canned goods x6, Water 5L"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional details..."
              rows={3}
            />
          </div>
          <Button onClick={submit} disabled={submitting || !form.vulnerableProfileId} className="w-full gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Record Distribution
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// =================== REGISTER VULNERABLE ===================
function RegisterVulnerableView({ workerId }: { workerId: string }) {
  const [open, setOpen] = useState(false)

  const registerVulnerablePerson = async (formData: any) => {
    const vulnerabilityTypes: string[] = []

    if (formData.hasDisability && formData.disabilityType) {
      vulnerabilityTypes.push(String(formData.disabilityType).toUpperCase().replace(/\s+/g, '_'))
    }

    if (formData.needsAssistance) {
      vulnerabilityTypes.push('NEEDS_ASSISTANCE')
    }

    if (formData.registryCategory) {
      vulnerabilityTypes.push(String(formData.registryCategory).toUpperCase().replace(/\s+/g, '_'))
    }

    if (vulnerabilityTypes.length === 0) {
      vulnerabilityTypes.push('OTHER')
    }

    try {
      const data = await apiFetch('/api/worker/register-vulnerable', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          workerId,
          vulnerabilityTypes,

          // Files are not uploaded by the current worker API yet. Keep the boolean flags,
          // but remove File objects so JSON.stringify does not break the request.
          pwdRegistrationForm: undefined,
          medicalCertificate: undefined,
          proofOfIdentity: undefined,
          proofOfResidence: undefined,
          idPhotos: undefined,

          hasPWDRegistrationForm: !!formData.hasPWDRegistrationForm,
          hasMedicalCertificate: !!formData.hasMedicalCertificate,
          hasProofOfIdentity: !!formData.hasProofOfIdentity,
          hasProofOfResidence: !!formData.hasProofOfResidence,
          hasIDPhotos: !!formData.hasIDPhotos,
        }),
      })

      toast.success('Vulnerable person registered', {
        description: data?.message || 'The profile was submitted for admin approval.',
      })

      setOpen(false)
    } catch (err: any) {
      toast.error('Registration failed', {
        description: err.message || 'Unable to register vulnerable person.',
      })
      throw err
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Register Vulnerable Citizen</h1>
        <p className="text-sm text-muted-foreground">
          Workers now use the same guided registration form as Admin, including drafts,
          address map picker, review card, and required-field confirmation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Register Vulnerable Person
          </CardTitle>
          <CardDescription>
            Open the shared registration wizard. Worker registrations remain pending for admin approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Register Vulnerable Person
          </Button>
        </CardContent>
      </Card>

      <VulnerableRegistrationModal
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={registerVulnerablePerson}
        userRole="worker"
      />
    </div>
  )
}

// =================== FIELD NOTES ===================
function FieldNotesView({ workerId }: { workerId: string }) {
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch(`/api/feedback?type=FIELD_NOTE&userId=${workerId}`)
      setNotes(data.feedback || [])
    } catch (err: any) {
      toast.error('Failed to load notes', { description: err.message })
    } finally {
      setLoading(false)
    }
  }, [workerId])

  useEffect(() => { load() }, [load])

  const submit = async () => {
    if (!note.trim()) return
    setSubmitting(true)
    try {
      await apiFetch('/api/worker/field-notes', {
        method: 'POST',
        body: JSON.stringify({ workerId, note }),
      })
      toast.success('Field note saved')
      setNote('')
      load()
    } catch (err: any) {
      toast.error('Failed to save note', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Field Notes</h1>
        <p className="text-sm text-muted-foreground">Record observations and updates from the field.</p>
      </div>
      <Card>
        <CardContent className="space-y-3 p-4">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What did you observe in the field today?"
            rows={4}
          />
          <Button onClick={submit} disabled={submitting || !note.trim()} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <NotebookPen className="h-4 w-4" />}
            Save Note
          </Button>
        </CardContent>
      </Card>
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Recent Notes</h3>
        {loading ? (
          <WowLoader
            compact
            label="Loading field notes"
            description="Fetching recent observations..."
          />
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No field notes yet.</p>
        ) : (
          notes.map((n) => (
            <Card key={n.id}>
              <CardContent className="p-3">
                <p className="text-sm">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

// =================== ANNOUNCEMENTS ===================
function WorkerAnnouncementsView() {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/api/announcements?userRole=WORKER')
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
        <p className="text-sm text-muted-foreground">Notices from administrators.</p>
      </div>
      <AnnouncementsCarousel userRole="worker" />
      {loading ? (
        <WowLoader
          compact
          label="Loading announcements"
          description="Collecting official notices..."
        />
      ) : announcements.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No announcements.</CardContent></Card>
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
                <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                  {a.eventDate && <span>📅 {formatDate(a.eventDate)}{a.eventTime ? ` ${a.eventTime}` : ''}</span>}
                  {a.location && <span>📍 {a.location}</span>}
                  <span>🕒 {timeAgo(a.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
