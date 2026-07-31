'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useState, type ComponentType } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCircle2,
  Clock3,
  FileCheck2,
  LayoutDashboard,
  MapIcon,
  MapPin,
  Megaphone,
  PackageCheck,
  Plus,
  Radio,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { AppShell } from '@/components/layout/app-shell'
import type { NavItem } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { apiFetch, type AuthUser } from '@/lib/api-client'

const VulnerableMap = dynamic(
  () => import('@/components/maps/vulnerable-map').then((module) => module.VulnerableMap),
  { ssr: false },
)

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'approval-center', label: 'Approval Center', icon: ShieldCheck },
  { id: 'registrations', label: 'Registrations', icon: UserCheck },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'relief', label: 'Relief Operations', icon: PackageCheck },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
]

type MetricTone = 'emerald' | 'amber' | 'sky' | 'violet'

type MetricCardProps = {
  label: string
  value: number
  description: string
  icon: ComponentType<{ className?: string }>
  tone: MetricTone
}

const metricStyles: Record<MetricTone, { icon: string; glow: string }> = {
  emerald: { icon: 'bg-emerald-100 text-emerald-700', glow: 'from-emerald-500/10' },
  amber: { icon: 'bg-amber-100 text-amber-700', glow: 'from-amber-500/10' },
  sky: { icon: 'bg-sky-100 text-sky-700', glow: 'from-sky-500/10' },
  violet: { icon: 'bg-violet-100 text-violet-700', glow: 'from-violet-500/10' },
}

function MetricCard({ label, value, description, icon: Icon, tone }: MetricCardProps) {
  const styles = metricStyles[tone]

  return (
    <Card className="group relative overflow-hidden rounded-3xl border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)] transition-transform duration-200 hover:-translate-y-0.5">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${styles.glow} via-transparent to-transparent opacity-80`} />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-600">{label}</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{value.toLocaleString()}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
          </div>
          <div className={`rounded-2xl p-3 ${styles.icon}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ActionButton({ icon: Icon, label, onClick }: { icon: ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-24 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
    >
      <div className="flex w-full items-center justify-between">
        <span className="rounded-xl bg-slate-100 p-2.5 text-slate-700 transition group-hover:bg-emerald-100 group-hover:text-emerald-700">
          <Icon className="h-4 w-4" />
        </span>
        <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
      </div>
      <span className="mt-4 text-sm font-semibold text-slate-800">{label}</span>
    </button>
  )
}

export function AdminRedesignPreview({ user, onLogout, onProfile }: { user: AuthUser; onLogout: () => void; onProfile: () => void }) {
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [activeUsers, setActiveUsers] = useState<any>(null)
  const [mapPoints, setMapPoints] = useState<any[]>([])
  const [recentProfiles, setRecentProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadOverview = useCallback(async () => {
    setLoading(true)
    try {
      const [statsResponse, usersResponse, mapResponse, profilesResponse] = await Promise.all([
        apiFetch('/api/admin/stats'),
        apiFetch('/api/active-users'),
        apiFetch('/api/map/data').catch(() => ({ points: [] })),
        apiFetch('/api/admin/profiles').catch(() => ({ profiles: [] })),
      ])

      setStats(statsResponse.stats || {})
      setActiveUsers(usersResponse.stats || {})
      setMapPoints(mapResponse.points || [])
      setRecentProfiles((profilesResponse.profiles || []).slice(0, 4))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.'
      toast.error('Could not load the redesign preview', { description: message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  const pending = Number(stats?.pending || 0)
  const total = Number(stats?.total || 0)
  const approved = Number(stats?.approved || activeUsers?.approvedProfiles || 0)
  const activeTotal = Number(activeUsers?.total || 0)

  const openCurrentDashboard = () => router.push('/admin/dashboard')

  return (
    <AppShell
      items={NAV_ITEMS}
      activeView="overview"
      onNavigate={(view) => {
        if (view !== 'overview') openCurrentDashboard()
      }}
      onLogout={onLogout}
      onProfile={onProfile}
      userName={user.name || 'Admin User'}
      userEmail={user.email || ''}
      userRole={user.role || 'ADMIN'}
    >
      <div className="space-y-6 pb-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-[linear-gradient(135deg,#052e2b_0%,#064e3b_45%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_28px_90px_rgba(6,78,59,0.22)] sm:px-8">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Premium redesign preview
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Good day, {user.name?.split(' ')[0] || 'Administrator'}.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/85 sm:text-base">
                Focus on urgent community needs first, then review municipal activity and location coverage without unnecessary dashboard clutter.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => router.push('/admin/dashboard')} className="rounded-xl bg-white text-emerald-900 hover:bg-emerald-50">
                Open current dashboard
              </Button>
              <Button onClick={() => void loadOverview()} variant="outline" className="rounded-xl border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                Refresh data
              </Button>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Needs your attention</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">Priority actions</h2>
            </div>
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline-flex">Clear, action-first overview</span>
          </div>

          <Card className="overflow-hidden rounded-3xl border-amber-200 bg-amber-50/70 shadow-[0_16px_45px_rgba(245,158,11,0.08)]">
            <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                  {pending > 0 ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-950">
                    {pending > 0 ? `${pending} application${pending === 1 ? '' : 's'} waiting for review` : 'No applications are waiting for review'}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {pending > 0 ? 'Review pending registrations before moving to lower-priority administrative work.' : 'The registration queue is clear. You can continue with routine monitoring.'}
                  </p>
                </div>
              </div>
              <Button onClick={openCurrentDashboard} className="shrink-0 rounded-xl bg-amber-600 text-white hover:bg-amber-700">
                Review applications
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Vulnerable households" value={total} description={`${approved} approved household records`} icon={ShieldCheck} tone="emerald" />
          <MetricCard label="Pending applications" value={pending} description="Require an administrator decision" icon={Clock3} tone="amber" />
          <MetricCard label="Active system users" value={activeTotal} description={`${activeUsers?.admins || 0} admin · ${activeUsers?.workers || 0} worker · ${activeUsers?.vulnerable || 0} citizen`} icon={Users} tone="sky" />
          <MetricCard label="Mapped locations" value={mapPoints.length} description="Protected operational GIS records" icon={MapPin} tone="violet" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
          <Card className="overflow-hidden rounded-[1.75rem] border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
            <CardHeader className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg text-slate-950">
                    <MapIcon className="h-5 w-5 text-emerald-600" />
                    Community coverage map
                  </CardTitle>
                  <CardDescription className="mt-1">A calm operational view of approved household locations.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-medium">
                  <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">Needs assistance</span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">Awaiting relief</span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Relief received</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <div className="overflow-hidden rounded-[1.35rem] bg-slate-100">
                {loading ? (
                  <div className="flex h-[430px] items-center justify-center text-sm text-slate-500">Loading protected map data…</div>
                ) : (
                  <VulnerableMap points={mapPoints} height={430} interactiveMarkers={false} />
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="rounded-[1.75rem] border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-slate-950">
                  <Radio className="h-5 w-5 text-emerald-600" />
                  Recent activity
                </CardTitle>
                <CardDescription>Only the latest useful signals.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><BellRing className="h-4 w-4 text-amber-600" /> Registration queue</div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{pending > 0 ? `${pending} pending review` : 'No pending applications'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><MapPin className="h-4 w-4 text-violet-600" /> Map coverage</div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{mapPoints.length} protected locations available</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Users className="h-4 w-4 text-sky-600" /> Active accounts</div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{activeTotal} users currently enabled</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.75rem] border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-slate-950">Quick actions</CardTitle>
                <CardDescription>Common tasks without searching the sidebar.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <ActionButton icon={FileCheck2} label="Review applications" onClick={openCurrentDashboard} />
                <ActionButton icon={Plus} label="Add worker" onClick={openCurrentDashboard} />
                <ActionButton icon={Megaphone} label="Create announcement" onClick={openCurrentDashboard} />
                <ActionButton icon={BarChart3} label="Open reports" onClick={openCurrentDashboard} />
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Card className="rounded-[1.75rem] border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
            <CardHeader>
              <CardTitle className="text-lg text-slate-950">Recent registrations</CardTitle>
              <CardDescription>Latest submissions, shown without a dense table.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentProfiles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                  <UserCheck className="mx-auto h-6 w-6 text-slate-400" />
                  <p className="mt-3 text-sm font-semibold text-slate-800">No recent registrations</p>
                  <p className="mt-1 text-xs text-slate-500">New submissions will appear here automatically.</p>
                </div>
              ) : (
                recentProfiles.map((profile) => (
                  <div key={profile.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{`${profile.firstName || 'Citizen'} ${profile.lastName || ''}`.trim()}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{profile.barangay || 'Barangay not provided'}</p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{profile.registrationStatus || 'SUBMITTED'}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-slate-200 bg-slate-950 text-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            <CardContent className="flex h-full min-h-64 flex-col justify-between p-6">
              <div>
                <div className="inline-flex rounded-2xl bg-white/10 p-3 text-emerald-300"><PackageCheck className="h-6 w-6" /></div>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight">Designed for decisions, not decoration.</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                  Detailed charts remain available in Reports. The main dashboard keeps only urgent actions, essential numbers, community coverage, and recent activity.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Premium clarity standard
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  )
}
