'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import {
  LayoutDashboard, Package, PackagePlus, UserPlus, NotebookPen, Megaphone,
  Loader2, Check, MapPin, Users as UsersIcon,
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
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
const LocationPicker = dynamic(
  () => import('@/components/maps/location-picker').then((m) => m.LocationPicker),
  { ssr: false, loading: () => <Skeleton className="h-[260px]" /> }
)
import { AnnouncementsCarousel } from '@/components/dashboards/announcements-carousel'
import { apiFetch, AuthUser, getStoredUser } from '@/lib/api-client'
import { formatDate, formatDateTime, timeAgo, StatusBadge, PriorityBadge, formatVulnerabilityTypes, vulnerabilityLabel } from './shared'

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'my-distributions', label: 'My Distributions', icon: Package },
  { id: 'new-distribution', label: 'Record Distribution', icon: PackagePlus },
  { id: 'register-vulnerable', label: 'Register Citizen', icon: UserPlus },
  { id: 'field-notes', label: 'Field Notes', icon: NotebookPen },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
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
      userRole={user.role}
    >
      {view === 'overview' && <OverviewView workerId={user.id} onNavigate={setView} />}
      {view === 'my-distributions' && <MyDistributionsView workerId={user.id} />}
      {view === 'new-distribution' && <NewDistributionView workerId={user.id} onDone={() => setView('my-distributions')} />}
      {view === 'register-vulnerable' && <RegisterVulnerableView workerId={user.id} />}
      {view === 'field-notes' && <FieldNotesView workerId={user.id} />}
      {view === 'announcements' && <WorkerAnnouncementsView />}
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

  if (loading) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>

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
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
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
            <Skeleton className="h-10" />
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
const VULN_TYPES = [
  'SENIOR_CITIZEN', 'PWD', 'LOW_INCOME', 'PREGNANT',
  'CHRONIC_ILLNESS', 'SINGLE_PARENT', 'OTHER',
]

function RegisterVulnerableView({ workerId }: { workerId: string }) {
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    lastName: '', firstName: '', middleName: '', suffix: '',
    gender: '', civilStatus: '', mobileNumber: '', emailAddress: '',
    houseNumber: '', street: '', barangay: '', municipality: 'San Policarpo', province: 'Eastern Samar',
    latitude: undefined as number | undefined, longitude: undefined as number | undefined,
    educationalAttainment: '', employmentStatus: '',
    selectedVulnerabilities: [] as string[],
    emergencyContact: '', emergencyPhone: '',
    hasMedicalCondition: false, medicalConditions: '',
    needsAssistance: false, assistanceType: '',
  })

  const toggleVuln = (v: string) => {
    setForm((f) => ({
      ...f,
      selectedVulnerabilities: f.selectedVulnerabilities.includes(v)
        ? f.selectedVulnerabilities.filter((x) => x !== v)
        : [...f.selectedVulnerabilities, v],
    }))
  }

  const submit = async () => {
    if (!form.lastName || !form.firstName || !form.emailAddress || !form.mobileNumber) {
      toast.error('Please fill all required fields')
      return
    }
    setSubmitting(true)
    try {
      const data = await apiFetch('/api/worker/register-vulnerable', {
        method: 'POST',
        body: JSON.stringify({ ...form, workerId }),
      })
      toast.success('Citizen registered', {
        description: `Temporary password: ${data.tempPassword}. Profile pending approval.`,
      })
      setForm({
        lastName: '', firstName: '', middleName: '', suffix: '',
        gender: '', civilStatus: '', mobileNumber: '', emailAddress: '',
        houseNumber: '', street: '', barangay: '', municipality: 'San Policarpo', province: 'Eastern Samar',
        latitude: undefined, longitude: undefined,
        educationalAttainment: '', employmentStatus: '',
        selectedVulnerabilities: [],
        emergencyContact: '', emergencyPhone: '',
        hasMedicalCondition: false, medicalConditions: '',
        needsAssistance: false, assistanceType: '',
      })
    } catch (err: any) {
      toast.error('Registration failed', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Register Vulnerable Citizen</h1>
        <p className="text-sm text-muted-foreground">
          Register a new vulnerable individual. An account will be created with a temporary password and the profile will be submitted for admin approval.
        </p>
      </div>
      <Card>
        <CardContent className="space-y-5 p-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Personal Information</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Middle Name</Label>
                <Input value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Civil Status</Label>
                <Select value={form.civilStatus} onValueChange={(v) => setForm({ ...form, civilStatus: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Widowed">Widowed</SelectItem>
                    <SelectItem value="Separated">Separated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Mobile Number *</Label>
                <Input value={form.mobileNumber} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} placeholder="+63 9XX XXX XXXX" />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label>Email Address *</Label>
                <Input type="email" value={form.emailAddress} onChange={(e) => setForm({ ...form, emailAddress: e.target.value })} placeholder="citizen@email.com" />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Address</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>House Number</Label>
                <Input value={form.houseNumber} onChange={(e) => setForm({ ...form, houseNumber: e.target.value })} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Street</Label>
                <Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Barangay</Label>
                <Input value={form.barangay} onChange={(e) => setForm({ ...form, barangay: e.target.value })} placeholder="Barangay No. 1 (Poblacion)" />
              </div>
              <div className="space-y-1.5">
                <Label>Municipality</Label>
                <Input value={form.municipality} onChange={(e) => setForm({ ...form, municipality: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Province</Label>
                <Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
              </div>
            </div>
            <div className="rounded-md border border-border p-3">
              <Label className="mb-2 flex items-center gap-1.5 text-xs"><MapPin className="h-3.5 w-3.5 text-primary" /> Location on Map</Label>
              <LocationPicker
                onChange={(lat, lng) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
                height={260}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Vulnerability Assessment</h3>
            <div className="flex flex-wrap gap-2">
              {VULN_TYPES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggleVuln(v)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
                    form.selectedVulnerabilities.includes(v)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  {vulnerabilityLabel(v)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Educational Attainment</Label>
                <Input value={form.educationalAttainment} onChange={(e) => setForm({ ...form, educationalAttainment: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Employment Status</Label>
                <Select value={form.employmentStatus} onValueChange={(v) => setForm({ ...form, employmentStatus: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Employed">Employed</SelectItem>
                    <SelectItem value="Unemployed">Unemployed</SelectItem>
                    <SelectItem value="Self-employed">Self-employed</SelectItem>
                    <SelectItem value="Retired">Retired</SelectItem>
                    <SelectItem value="Student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Emergency & Medical</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Emergency Contact Name</Label>
                <Input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Emergency Contact Phone</Label>
                <Input value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.hasMedicalCondition}
                onChange={(e) => setForm({ ...form, hasMedicalCondition: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              Has medical condition(s)
            </label>
            {form.hasMedicalCondition && (
              <div className="space-y-1.5">
                <Label>Medical Conditions</Label>
                <Textarea value={form.medicalConditions} onChange={(e) => setForm({ ...form, medicalConditions: e.target.value })} rows={2} />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.needsAssistance}
                onChange={(e) => setForm({ ...form, needsAssistance: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              Currently needs assistance
            </label>
            {form.needsAssistance && (
              <div className="space-y-1.5">
                <Label>Type of Assistance Needed</Label>
                <Input value={form.assistanceType} onChange={(e) => setForm({ ...form, assistanceType: e.target.value })} placeholder="e.g. Food, medicine, shelter" />
              </div>
            )}
          </section>

          <Button onClick={submit} disabled={submitting} className="w-full gap-2" size="lg">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Register Citizen
          </Button>
        </CardContent>
      </Card>
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
          <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-16" />)}</div>
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
        <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-28" />)}</div>
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
