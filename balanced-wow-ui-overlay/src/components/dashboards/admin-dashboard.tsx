'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import {
  LayoutDashboard, Users, UserCheck, Package, Megaphone, MessageSquare,
  BarChart3, MapIcon, Check, X, Trash2, Loader2, TrendingUp, AlertCircle,
  Clock, ShieldCheck,
} from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { NavItem } from '@/components/layout/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { AnnouncementForm } from '@/components/forms/announcement-form'
import { AnnouncementsCarousel } from '@/components/dashboards/announcements-carousel'
const VulnerableMap = dynamic(
  () => import('@/components/maps/vulnerable-map').then((m) => m.VulnerableMap),
  { ssr: false, loading: () => <Skeleton className="h-[500px]" /> }
)
import { apiFetch, AuthUser } from '@/lib/api-client'
import {
  formatDate, formatDateTime, timeAgo, StatusBadge, PriorityBadge,
  formatVulnerabilityTypes, vulnerabilityLabel,
} from './shared'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'registrations', label: 'Registrations', icon: UserCheck },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'distributions', label: 'Relief Approval', icon: Package },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'map', label: 'Vulnerable Map', icon: MapIcon },
]

interface AdminDashboardProps {
  user: AuthUser
  onLogout: () => void
  onProfile: () => void
}

export function AdminDashboard({ user, onLogout, onProfile }: AdminDashboardProps) {
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
      {view === 'overview' && <OverviewView />}
      {view === 'registrations' && <RegistrationsView />}
      {view === 'users' && <UsersView />}
      {view === 'distributions' && <DistributionsView />}
      {view === 'announcements' && <AnnouncementsView />}
      {view === 'feedback' && <FeedbackView />}
      {view === 'analytics' && <AnalyticsView />}
      {view === 'map' && <MapView />}
    </AppShell>
  )
}

// =================== OVERVIEW ===================
function OverviewView() {
  const [stats, setStats] = useState<any>(null)
  const [activeUsers, setActiveUsers] = useState<any>(null)
  const [recentProfiles, setRecentProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, au, profiles] = await Promise.all([
        apiFetch('/api/admin/stats'),
        apiFetch('/api/active-users'),
        apiFetch('/api/admin/profiles'),
      ])
      setStats(s.stats)
      setActiveUsers(au.stats)
      setRecentProfiles((profiles.profiles || []).slice(0, 5))
    } catch (err: any) {
      toast.error('Failed to load overview', { description: err.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <OverviewSkeleton />

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground">
          System-wide summary of registrations, relief operations, and user activity.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="gov-stat">
          <span className="stat-label">Total Registrations</span>
          <span className="stat-value text-primary">{stats?.total ?? 0}</span>
          <span className="text-xs text-muted-foreground">{stats?.approved ?? 0} approved</span>
        </div>
        <div className="gov-stat">
          <span className="stat-label">Pending Approval</span>
          <span className="stat-value text-amber-600">{stats?.pending ?? 0}</span>
          <span className="text-xs text-muted-foreground">Awaiting review</span>
        </div>
        <div className="gov-stat">
          <span className="stat-label">Active Users</span>
          <span className="stat-value">{activeUsers?.total ?? 0}</span>
          <span className="text-xs text-muted-foreground">
            {activeUsers?.admins ?? 0} admin · {activeUsers?.workers ?? 0} worker · {activeUsers?.vulnerable ?? 0} vulnerable
          </span>
        </div>
        <div className="gov-stat">
          <span className="stat-label">Approved Profiles</span>
          <span className="stat-value text-emerald-600">{activeUsers?.approvedProfiles ?? 0}</span>
          <span className="text-xs text-muted-foreground">Eligible for relief</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Recent Registrations
            </CardTitle>
            <CardDescription>Latest vulnerable profile submissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentProfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No registrations yet.</p>
            ) : (
              recentProfiles.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.firstName} {p.lastName}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.barangay} · {timeAgo(p.createdAt)}</p>
                  </div>
                  <StatusBadge status={p.registrationStatus} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickAction label="Review pending registrations" count={stats?.pending ?? 0} hint="Approve or reject vulnerable profiles" />
            <QuickAction label="Approve relief distributions" hint="Pending distribution requests" />
            <QuickAction label="Publish an announcement" hint="Notify workers and citizens" />
            <QuickAction label="Review feedback" hint="Messages from citizens" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function QuickAction({ label, count, hint }: { label: string; count?: number; hint: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {count !== undefined && count > 0 && (
        <Badge className="bg-amber-100 text-amber-800">{count}</Badge>
      )}
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}

// =================== REGISTRATIONS ===================
function RegistrationsView() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDING')
  const [rejectTarget, setRejectTarget] = useState<any | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/api/admin/profiles')
      setProfiles(data.profiles || [])
    } catch (err: any) {
      toast.error('Failed to load profiles', { description: err.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = profiles.filter((p) => filter === 'ALL' || p.registrationStatus === filter)

  const approve = async (profileId: string) => {
    try {
      await apiFetch('/api/admin/approve', {
        method: 'POST',
        body: JSON.stringify({ profileId }),
      })
      toast.success('Profile approved', { description: 'The citizen can now log in.' })
      load()
    } catch (err: any) {
      toast.error('Approval failed', { description: err.message })
    }
  }

  const reject = async () => {
    if (!rejectTarget) return
    try {
      await apiFetch('/api/admin/reject', {
        method: 'POST',
        body: JSON.stringify({ profileId: rejectTarget.id, reason: rejectReason }),
      })
      toast.success('Profile rejected')
      setRejectTarget(null)
      setRejectReason('')
      load()
    } catch (err: any) {
      toast.error('Rejection failed', { description: err.message })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vulnerable Registrations</h1>
          <p className="text-sm text-muted-foreground">Review and approve citizen registration profiles.</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="ALL">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No {filter.toLowerCase()} registrations.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const vuln = formatVulnerabilityTypes(p.vulnerabilityTypes)
            return (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{p.firstName} {p.middleName ? p.middleName.charAt(0) + '.' : ''} {p.lastName}{p.suffix ? ', ' + p.suffix : ''}</h3>
                        <StatusBadge status={p.registrationStatus} />
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground md:grid-cols-3">
                        <span><b className="text-foreground">Email:</b> {p.emailAddress}</span>
                        <span><b className="text-foreground">Mobile:</b> {p.mobileNumber}</span>
                        <span><b className="text-foreground">Barangay:</b> {p.barangay}</span>
                        <span><b className="text-foreground">Gender:</b> {p.gender || '—'}</span>
                        <span><b className="text-foreground">DOB:</b> {formatDate(p.dateOfBirth)}</span>
                        <span><b className="text-foreground">Submitted:</b> {timeAgo(p.createdAt)}</span>
                      </div>
                      {vuln.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-xs font-medium text-foreground">Vulnerabilities:</span>
                          {vuln.map((v: string) => (
                            <Badge key={v} variant="secondary" className="text-[10px]">
                              {vulnerabilityLabel(v)}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {p.rejectionReason && (
                        <p className="text-xs text-destructive"><b>Rejection reason:</b> {p.rejectionReason}</p>
                      )}
                    </div>
                    {p.registrationStatus === 'PENDING' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approve(p.id)} className="gap-1.5">
                          <Check className="h-4 w-4" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setRejectTarget(p)} className="gap-1.5">
                          <X className="h-4 w-4" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {rejectTarget?.firstName} {rejectTarget?.lastName}&apos;s registration. This will be visible to the citizen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Missing required documents..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={reject}>Reject Registration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =================== USERS ===================
function UsersView() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/api/admin/users')
      setUsers(data.users || [])
    } catch (err: any) {
      toast.error('Failed to load users', { description: err.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const deleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return
    try {
      await apiFetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ adminId: getAdminId() }),
      })
      toast.success('User deleted')
      load()
    } catch (err: any) {
      toast.error('Delete failed', { description: err.message })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">All system users and their roles.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Create Worker</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{u.role}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.phone || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                    <TableCell>
                      {u.vulnerableProfile ? (
                        <StatusBadge status={u.vulnerableProfile.registrationStatus} />
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.role !== 'ADMIN' && (
                        <Button size="sm" variant="ghost" onClick={() => deleteUser(u.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateWorkerDialog open={showCreate} onOpenChange={setShowCreate} onCreated={load} />
    </div>
  )
}

function getAdminId(): string {
  if (typeof window === 'undefined') return ''
  const u = localStorage.getItem('crms_user')
  return u ? JSON.parse(u).id : ''
}

function CreateWorkerDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!name || !email) return
    setSubmitting(true)
    try {
      const data = await apiFetch('/api/admin/create-worker', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, adminId: getAdminId() }),
      })
      toast.success('Worker account created', {
        description: `Temporary password: ${data.tempPassword}`,
      })
      setName(''); setEmail(''); setPhone('')
      onOpenChange(false)
      onCreated()
    } catch (err: any) {
      toast.error('Failed to create worker', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Field Worker Account</DialogTitle>
          <DialogDescription>
            A temporary password will be generated. Share it securely with the worker.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="cw-name">Full Name</Label>
            <Input id="cw-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cw-email">Email</Label>
            <Input id="cw-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cw-phone">Phone (optional)</Label>
            <Input id="cw-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =================== DISTRIBUTIONS (Approval) ===================
function DistributionsView() {
  const [distributions, setDistributions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDING')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/api/admin/distributions')
      setDistributions(data.distributions || [])
    } catch (err: any) {
      toast.error('Failed to load distributions', { description: err.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = distributions.filter((d) => filter === 'ALL' || d.status === filter)

  const act = async (id: string, action: 'APPROVE' | 'REJECT') => {
    const reason = action === 'REJECT' ? prompt('Reason for rejection (optional):') || '' : ''
    try {
      await apiFetch('/api/admin/relief-approval', {
        method: 'POST',
        body: JSON.stringify({ distributionId: id, action, reason }),
      })
      toast.success(`Distribution ${action === 'APPROVE' ? 'approved' : 'rejected'}`)
      load()
    } catch (err: any) {
      toast.error('Action failed', { description: err.message })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relief Distribution Approval</h1>
          <p className="text-sm text-muted-foreground">Review relief distributions recorded by field workers.</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="ALL">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          No {filter.toLowerCase()} distributions.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{d.distributionType}</h3>
                      <StatusBadge status={d.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{d.itemsProvided}</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground md:grid-cols-4">
                      <span><b className="text-foreground">Beneficiary:</b> {d.vulnerableProfile ? `${d.vulnerableProfile.firstName} ${d.vulnerableProfile.lastName}` : 'Household'}</span>
                      <span><b className="text-foreground">Worker:</b> {d.worker?.name}</span>
                      <span><b className="text-foreground">Quantity:</b> {d.quantity}</span>
                      <span><b className="text-foreground">Date:</b> {formatDate(d.distributionDate)}</span>
                    </div>
                    {d.notes && <p className="text-xs italic text-muted-foreground">"{d.notes}"</p>}
                    {d.rejectionReason && <p className="text-xs text-destructive"><b>Reason:</b> {d.rejectionReason}</p>}
                  </div>
                  {d.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => act(d.id, 'APPROVE')} className="gap-1.5">
                        <Check className="h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => act(d.id, 'REJECT')} className="gap-1.5">
                        <X className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// =================== ANNOUNCEMENTS ===================
function AnnouncementsView() {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch(`/api/announcements?userRole=ADMIN`)
      setAnnouncements(data.announcements || [])
    } catch (err: any) {
      toast.error('Failed to load announcements', { description: err.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const remove = async (id: string) => {
    if (!confirm('Delete this announcement?')) return
    try {
      await apiFetch(`/api/announcements/${id}?requesterId=${getAdminId()}`, { method: 'DELETE' })
      toast.success('Announcement deleted')
      load()
    } catch (err: any) {
      toast.error('Delete failed', { description: err.message })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
          <p className="text-sm text-muted-foreground">Publish notices to workers and citizens.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'View List' : 'New Announcement'}</Button>
      </div>

      {/* Featured announcements carousel */}
      {!showForm && <AnnouncementsCarousel userRole="admin" />}

      {showForm ? (
        <Card>
          <CardHeader><CardTitle className="text-base">New Announcement</CardTitle></CardHeader>
          <CardContent><AnnouncementForm onSubmitted={() => { setShowForm(false); load() }} /></CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : announcements.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No announcements yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{a.title}</h3>
                      <Badge variant="outline" className="text-[10px]">{a.type.replace(/_/g, ' ')}</Badge>
                      <PriorityBadge priority={a.priority} />
                      {a.targetRole && <Badge variant="secondary" className="text-[10px]">To: {a.targetRole}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{a.content}</p>
                    <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                      {a.eventDate && <span>📅 {formatDate(a.eventDate)}{a.eventTime ? ` ${a.eventTime}` : ''}</span>}
                      {a.location && <span>📍 {a.location}</span>}
                      <span>🕒 {timeAgo(a.createdAt)}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => remove(a.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// =================== FEEDBACK ===================
function FeedbackView() {
  const [feedback, setFeedback] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [respondTarget, setRespondTarget] = useState<any | null>(null)
  const [response, setResponse] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/api/admin/feedback?adminView=true')
      setFeedback(data.feedback || [])
    } catch (err: any) {
      toast.error('Failed to load feedback', { description: err.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const respond = async () => {
    if (!respondTarget) return
    try {
      await apiFetch('/api/admin/feedback', {
        method: 'POST',
        body: JSON.stringify({ feedbackId: respondTarget.id, adminResponse: response }),
      })
      toast.success('Response sent')
      setRespondTarget(null)
      setResponse('')
      load()
    } catch (err: any) {
      toast.error('Failed to respond', { description: err.message })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feedback Management</h1>
        <p className="text-sm text-muted-foreground">Review and respond to feedback from citizens and workers.</p>
      </div>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : feedback.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No feedback yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {feedback.map((f) => (
            <Card key={f.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{f.type.replace(/_/g, ' ')}</Badge>
                      <StatusBadge status={f.status} />
                      <span className="text-xs text-muted-foreground">from {f.user?.name} · {timeAgo(f.createdAt)}</span>
                    </div>
                    {f.subject && <h3 className="font-medium">{f.subject}</h3>}
                    <p className="text-sm text-muted-foreground">{f.message}</p>
                    {f.adminResponse && (
                      <div className="mt-2 rounded-md bg-muted p-2 text-xs">
                        <span className="font-medium text-foreground">Admin response:</span> {f.adminResponse}
                      </div>
                    )}
                  </div>
                  {!f.adminResponse && (
                    <Button size="sm" variant="outline" onClick={() => { setRespondTarget(f); setResponse('') }}>
                      Respond
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!respondTarget} onOpenChange={(o) => !o && setRespondTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Feedback</DialogTitle>
            <DialogDescription>
              From {respondTarget?.user?.name}: {respondTarget?.message?.slice(0, 100)}...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="resp">Your response</Label>
            <Textarea id="resp" value={response} onChange={(e) => setResponse(e.target.value)} rows={4} placeholder="Type your response..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondTarget(null)}>Cancel</Button>
            <Button onClick={respond} disabled={!response.trim()}>Send Response</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =================== ANALYTICS ===================
function AnalyticsView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/admin/analytics?days=90')
        setData(res.analytics)
      } catch (err: any) {
        toast.error('Failed to load analytics', { description: err.message })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <div className="space-y-4"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
  if (!data) return <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No analytics data.</CardContent></Card>

  const regData = (data.registrationsByDate || []).map((r: any) => ({ date: r.date.slice(5), count: r.count }))
  const distData = (data.distributionsByDate || []).map((r: any) => ({ date: r.date.slice(5), count: r.count }))
  const vulnData = Object.entries(data.vulnerabilityCounts || {}).map(([name, value]) => ({
    name: vulnerabilityLabel(name),
    value: value as number,
  }))
  const typeData = Object.entries(data.distributionByType || {}).map(([name, value]) => ({
    name, value: value as number,
  }))
  const PIE_COLORS = ['#10b981', '#34d399', '#6ee7b7', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6']

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">90-day trends for registrations, distributions, and vulnerabilities.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="gov-stat">
          <span className="stat-label">Distributions</span>
          <span className="stat-value text-primary">{data.reliefCoverage.totalDistributions}</span>
        </div>
        <div className="gov-stat">
          <span className="stat-label">Items Distributed</span>
          <span className="stat-value">{data.reliefCoverage.totalQuantity}</span>
        </div>
        <div className="gov-stat">
          <span className="stat-label">Feedback</span>
          <span className="stat-value">{data.feedbackStats.total}</span>
        </div>
        <div className="gov-stat">
          <span className="stat-label">Pending Feedback</span>
          <span className="stat-value text-amber-600">{data.feedbackStats.submitted}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Registrations (90 days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={regData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 6 }} />
                <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Distributions (90 days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={distData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 6 }} />
                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Vulnerability Breakdown</CardTitle></CardHeader>
          <CardContent>
            {vulnData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={vulnData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {vulnData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 6 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Distribution Types</CardTitle></CardHeader>
          <CardContent>
            {typeData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={typeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} width={100} />
                  <Tooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 6 }} />
                  <Bar dataKey="value" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// =================== MAP ===================
function MapView() {
  const [points, setPoints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/api/map/data')
        setPoints(data.points || [])
      } catch (err: any) {
        toast.error('Failed to load map data', { description: err.message })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vulnerable Citizens Map</h1>
        <p className="text-sm text-muted-foreground">
          Geospatial view of approved vulnerable individuals. Markers: <span className="text-red-600">needs assistance</span> · <span className="text-amber-600">no relief yet</span> · <span className="text-emerald-600">relief received</span>
        </p>
      </div>
      {loading ? (
        <Skeleton className="h-[420px]" />
      ) : (
        <Card>
          <CardContent className="p-2">
            <VulnerableMap points={points} height={500} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
