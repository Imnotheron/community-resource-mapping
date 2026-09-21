'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  HeartHandshake,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UsersRound,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'

import { apiFetch } from '@/lib/api-client'
import { vulnerabilityLabel } from '@/components/dashboards/shared'
import { WowLoader } from '@/components/ui/wow-loader'

const VULNERABILITY_COLORS = [
  '#7C3AED',
  '#0891B2',
  '#F59E0B',
  '#E11D48',
  '#2563EB',
  '#16A34A',
  '#EA580C',
  '#475569',
]

const TYPE_COLORS = ['#0F766E', '#2563EB', '#7C3AED', '#EA580C', '#DB2777']

type MetricCardProps = {
  label: string
  value: number
  description: string
  icon: React.ComponentType<{ className?: string }>
  tone: 'emerald' | 'blue' | 'amber' | 'violet'
}

const metricTone = {
  emerald: 'from-emerald-500/18 to-teal-500/5 text-emerald-700 bg-emerald-50 border-emerald-100',
  blue: 'from-blue-500/18 to-cyan-500/5 text-blue-700 bg-blue-50 border-blue-100',
  amber: 'from-amber-500/18 to-orange-500/5 text-amber-700 bg-amber-50 border-amber-100',
  violet: 'from-violet-500/18 to-fuchsia-500/5 text-violet-700 bg-violet-50 border-violet-100',
}

function MetricCard({ label, value, description, icon: Icon, tone }: MetricCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(15,23,42,0.11)]">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${metricTone[tone].split(' ').slice(0, 2).join(' ')}`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950">{value.toLocaleString()}</p>
          <p className="mt-2 text-xs font-medium leading-5 text-slate-500">{description}</p>
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-2xl border ${metricTone[tone].split(' ').slice(4).join(' ')}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function ChartCard({ title, description, children, action }: { title: string; description: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-emerald-50/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

function InsightCard({ icon: Icon, title, description, tone = 'emerald' }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; tone?: 'emerald' | 'amber' | 'blue' }) {
  const classes = {
    emerald: 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50/70 text-amber-700',
    blue: 'border-blue-200 bg-blue-50/70 text-blue-700',
  }[tone]

  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/80 shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  )
}

export function PremiumAdminAnalytics() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const response = await apiFetch('/api/admin/analytics?days=90')
        setData(response.analytics)
      } catch (error) {
        const description = error instanceof Error ? error.message : 'Please try again.'
        toast.error('Failed to load analytics', { description })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const analytics = useMemo(() => {
    if (!data) return null

    const registrations = (data.registrationsByDate || []).map((item: any) => ({
      date: String(item.date || '').slice(5),
      count: Number(item.count || 0),
    }))

    const distributions = (data.distributionsByDate || []).map((item: any) => ({
      date: String(item.date || '').slice(5),
      count: Number(item.count || 0),
    }))

    const vulnerabilities = Object.entries(data.vulnerabilityCounts || {})
      .map(([name, value], index) => ({
        name: vulnerabilityLabel(name),
        value: Number(value || 0),
        color: VULNERABILITY_COLORS[index % VULNERABILITY_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)

    const distributionTypes = Object.entries(data.distributionByType || {})
      .map(([name, value], index) => ({
        name: String(name).replace(/_/g, ' '),
        value: Number(value || 0),
        color: TYPE_COLORS[index % TYPE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)

    const vulnerabilityTotal = vulnerabilities.reduce((sum, item) => sum + item.value, 0)
    const leadingVulnerability = vulnerabilities[0]
    const pendingFeedback = Number(data.feedbackStats?.submitted || 0)

    return {
      registrations,
      distributions,
      vulnerabilities,
      distributionTypes,
      vulnerabilityTotal,
      leadingVulnerability,
      pendingFeedback,
    }
  }, [data])

  if (loading) {
    return (
      <WowLoader
        label="Preparing community intelligence"
        description="Analyzing 90 days of registrations, relief activity, vulnerabilities, and feedback..."
      />
    )
  }

  if (!data || !analytics) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
        <Activity className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-4 text-base font-semibold text-slate-950">No analytics data is available yet.</p>
        <p className="mt-1 text-sm text-slate-500">Charts will appear after registration and distribution records are created.</p>
      </div>
    )
  }

  const totalDistributions = Number(data.reliefCoverage?.totalDistributions || 0)
  const totalQuantity = Number(data.reliefCoverage?.totalQuantity || 0)
  const feedbackTotal = Number(data.feedbackStats?.total || 0)

  return (
    <div className="space-y-6 animate-fade-in" data-tour="admin-analytics-overview">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_85%_15%,rgba(16,185,129,0.28),transparent_30%),linear-gradient(135deg,#0f172a_0%,#10251f_55%,#0f766e_125%)] px-6 py-7 text-white shadow-[0_32px_100px_rgba(15,23,42,0.26)] sm:px-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/10" />
        <div className="absolute right-8 top-8 h-44 w-44 rounded-full border border-emerald-200/10" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Community intelligence · Last 90 days
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Analytics that explain what needs attention.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
              Review registration demand, relief activity, vulnerability patterns, and unresolved feedback without decoding crowded charts.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur-xl">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-white/45">Data window</p>
            <p className="mt-1 text-sm font-semibold text-white">Rolling 90-day operational view</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Relief distributions" value={totalDistributions} description="Recorded distribution events" icon={HeartHandshake} tone="emerald" />
        <MetricCard label="Items distributed" value={totalQuantity} description="Total quantity released" icon={Boxes} tone="blue" />
        <MetricCard label="Feedback received" value={feedbackTotal} description="Citizen and worker messages" icon={MessageSquareMore} tone="violet" />
        <MetricCard label="Awaiting response" value={analytics.pendingFeedback} description="Feedback requiring action" icon={AlertTriangle} tone="amber" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <ChartCard title="Registration demand" description="New vulnerable-citizen registrations across the last 90 days." action={<span className="rounded-full bg-blue-50 px-3 py-1 text-[0.6875rem] font-semibold text-blue-700">Demand trend</span>}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.registrations} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="registrationArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.34} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="4 6" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} minTickGap={28} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 20px 50px rgba(15,23,42,.12)' }} />
              <Area type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={3} fill="url(#registrationArea)" activeDot={{ r: 5, fill: '#2563EB', stroke: '#fff', strokeWidth: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="space-y-3">
          <InsightCard icon={TrendingUp} title="Watch demand movement" description="A rising registration line may require additional review capacity or field verification support." tone="blue" />
          <InsightCard icon={ShieldCheck} title="Prioritize the largest group" description={analytics.leadingVulnerability ? `${analytics.leadingVulnerability.name} is currently the most recorded vulnerability category.` : 'No vulnerability category is currently leading.'} />
          <InsightCard icon={analytics.pendingFeedback > 0 ? AlertTriangle : CheckCircle2} title={analytics.pendingFeedback > 0 ? 'Feedback needs attention' : 'Feedback queue is clear'} description={analytics.pendingFeedback > 0 ? `${analytics.pendingFeedback} message${analytics.pendingFeedback === 1 ? '' : 's'} still need an administrator response.` : 'There are no unresolved feedback submissions in this dataset.'} tone={analytics.pendingFeedback > 0 ? 'amber' : 'emerald'} />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Vulnerability profile" description="Distinct colors and ranked values make overlapping categories easier to compare." action={<span className="rounded-full bg-violet-50 px-3 py-1 text-[0.6875rem] font-semibold text-violet-700">{analytics.vulnerabilityTotal} recorded tags</span>}>
          {analytics.vulnerabilities.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">No vulnerability data is available.</p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
              <div className="relative mx-auto h-[220px] w-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.vulnerabilities} dataKey="value" nameKey="name" innerRadius={66} outerRadius={96} paddingAngle={4} cornerRadius={7} stroke="transparent">
                      {analytics.vulnerabilities.map((item) => <Cell key={item.name} fill={item.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 20px 50px rgba(15,23,42,.12)' }} formatter={(value: number) => [`${value} record${value === 1 ? '' : 's'}`, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-3xl font-semibold tracking-tight text-slate-950">{analytics.vulnerabilityTotal}</p>
                    <p className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Total tags</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {analytics.vulnerabilities.map((item) => {
                  const percentage = analytics.vulnerabilityTotal ? Math.round((item.value / analytics.vulnerabilityTotal) * 100) : 0
                  return (
                    <div key={item.name}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="truncate font-semibold text-slate-700">{item.name}</span>
                        </div>
                        <span className="shrink-0 font-semibold text-slate-950">{item.value} · {percentage}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${percentage}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Relief distribution mix" description="Compare which forms of assistance are being delivered most often." action={<span className="rounded-full bg-emerald-50 px-3 py-1 text-[0.6875rem] font-semibold text-emerald-700">Operational mix</span>}>
          {analytics.distributionTypes.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">No distribution-type data is available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={analytics.distributionTypes} layout="vertical" margin={{ top: 8, right: 12, left: 18, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="#E2E8F0" strokeDasharray="4 6" />
                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={108} tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }} />
                <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 20px 50px rgba(15,23,42,.12)' }} />
                <Bar dataKey="value" radius={[0, 9, 9, 0]} barSize={20}>
                  {analytics.distributionTypes.map((item) => <Cell key={item.name} fill={item.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      <ChartCard title="Distribution activity" description="Daily distribution events help identify active periods and service gaps." action={<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[0.6875rem] font-semibold text-slate-600">Open reports <ArrowUpRight className="h-3 w-3" /></span>}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={analytics.distributions} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="4 6" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} minTickGap={28} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 20px 50px rgba(15,23,42,.12)' }} />
            <Bar dataKey="count" fill="#0F766E" radius={[8, 8, 3, 3]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
