'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  HeartHandshake,
  MessageSquareMore,
  Sparkles,
  TrendingUp,
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
import { ThreeDVulnerabilityChart } from '@/components/analytics/three-d-vulnerability-chart'

const VULNERABILITY_COLORS = [
  '#2563EB',
  '#0F766E',
  '#7C3AED',
  '#F59E0B',
  '#E11D48',
  '#0891B2',
  '#16A34A',
  '#EA580C',
]

const DISTRIBUTION_COLORS = ['#0F766E', '#2563EB', '#7C3AED', '#EA580C', '#DB2777', '#0891B2']

type Tone = 'emerald' | 'blue' | 'violet' | 'amber'

function MetricCard({ label, value, description, tone, icon: Icon }: {
  label: string
  value: number
  description: string
  tone: Tone
  icon: React.ComponentType<{ className?: string }>
}) {
  const toneClass = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
  }[tone]

  return (
    <div className="group rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.07)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_80px_rgba(15,23,42,0.11)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-slate-950">{value.toLocaleString()}</p>
          <p className="mt-2 text-xs font-medium leading-5 text-slate-500">{description}</p>
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-2xl border ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function Panel({ title, description, children, badge }: {
  title: string
  description: string
  children: React.ReactNode
  badge?: string
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-cyan-50/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        {badge ? <span className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-[0.68rem] font-semibold text-slate-600 shadow-sm">{badge}</span> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

function ExactLegend({ items }: { items: Array<{ name: string; value: number; color: string }> }) {
  const total = items.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => {
        const percent = total > 0 ? Math.round((item.value / total) * 100) : 0
        return (
          <div key={item.name} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
            <div className="min-w-0 flex items-center gap-2.5">
              <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: item.color }} />
              <span className="truncate text-sm font-semibold text-slate-700">{item.name}</span>
            </div>
            <span className="shrink-0 text-xs font-semibold text-slate-950">{item.value} · {percent}%</span>
          </div>
        )
      })}
    </div>
  )
}

export function PremiumAdminAnalyticsV2() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const response = await apiFetch('/api/admin/analytics?days=90')
        setData(response.analytics)
      } catch (error) {
        toast.error('Failed to load analytics', {
          description: error instanceof Error ? error.message : 'Please try again.',
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const analytics = useMemo(() => {
    if (!data) return null

    const registrations = (data.registrationsByDate || [])
      .map((item: any) => ({ date: String(item.date || '').slice(5), count: Number(item.count || 0) }))
      .reverse()

    const distributions = (data.distributionsByDate || [])
      .map((item: any) => ({ date: String(item.date || '').slice(5), count: Number(item.count || 0), quantity: Number(item.totalQuantity || 0) }))
      .reverse()

    const vulnerabilities = Object.entries(data.vulnerabilityCounts || {})
      .map(([name, value], index) => ({
        name: vulnerabilityLabel(name),
        value: Number(value || 0),
        color: VULNERABILITY_COLORS[index % VULNERABILITY_COLORS.length],
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)

    const distributionTypes = Object.entries(data.distributionByType || {})
      .map(([name, value], index) => ({
        name: String(name).replace(/_/g, ' '),
        value: Number(value || 0),
        color: DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length],
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)

    return { registrations, distributions, vulnerabilities, distributionTypes }
  }, [data])

  if (loading) {
    return <WowLoader label="Preparing community intelligence" description="Checking registrations, relief activity, vulnerabilities, and feedback..." />
  }

  if (!data || !analytics) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <Activity className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-4 font-semibold text-slate-950">No analytics data is available yet.</p>
      </div>
    )
  }

  const totalDistributions = Number(data.reliefCoverage?.totalDistributions || 0)
  const totalQuantity = Number(data.reliefCoverage?.totalQuantity || 0)
  const feedbackTotal = Number(data.feedbackStats?.total || 0)
  const pendingFeedback = Number(data.feedbackStats?.submitted || 0)
  const vulnerabilityTotal = analytics.vulnerabilities.reduce((sum, item) => sum + item.value, 0)
  const leading = analytics.vulnerabilities[0]

  return (
    <div className="space-y-6 animate-fade-in" data-tour="admin-analytics-overview">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_82%_18%,rgba(34,211,238,0.25),transparent_28%),radial-gradient(circle_at_18%_110%,rgba(124,58,237,0.22),transparent_34%),linear-gradient(135deg,#07111f_0%,#0f172a_52%,#0f3f4a_120%)] px-6 py-7 text-white shadow-[0_34px_110px_rgba(15,23,42,0.28)] sm:px-8">
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 backdrop-blur-xl">
              <Sparkles className="h-3.5 w-3.5" /> Community intelligence · 90 days
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Clear analytics, accurate legends, actionable signals.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">Every chart uses the same source values for its shapes, legend colors, counts, percentages, and 3D visualization.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-xl">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-slate-400">Data integrity</p>
            <p className="mt-1 text-sm font-semibold text-white">Live API values · shared color mapping</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Relief distributions" value={totalDistributions} description="Recorded distribution events" tone="emerald" icon={HeartHandshake} />
        <MetricCard label="Items distributed" value={totalQuantity} description="Total quantity released" tone="blue" icon={Boxes} />
        <MetricCard label="Feedback received" value={feedbackTotal} description="Citizen and worker messages" tone="violet" icon={MessageSquareMore} />
        <MetricCard label="Awaiting response" value={pendingFeedback} description="Feedback requiring action" tone="amber" icon={AlertTriangle} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(330px,0.7fr)]">
        <Panel title="Registration demand" description="New vulnerable-citizen registrations over the selected 90-day window." badge="Demand trend">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.registrations} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="regAreaV2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="4 6" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={28} tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 20px 50px rgba(15,23,42,.12)' }} />
              <Area type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={3} fill="url(#regAreaV2)" activeDot={{ r: 5, strokeWidth: 3, stroke: '#fff', fill: '#2563EB' }} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <div className="grid gap-3">
          <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50/70 p-5">
            <TrendingUp className="h-5 w-5 text-blue-700" />
            <p className="mt-3 text-sm font-semibold text-slate-950">Demand signal</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">Use registration movement to decide whether the approval desk or field team needs more capacity.</p>
          </div>
          <div className="rounded-[1.5rem] border border-violet-200 bg-violet-50/70 p-5">
            <CheckCircle2 className="h-5 w-5 text-violet-700" />
            <p className="mt-3 text-sm font-semibold text-slate-950">Largest vulnerability group</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{leading ? `${leading.name} currently has ${leading.value} recorded tag${leading.value === 1 ? '' : 's'}.` : 'No vulnerability tags are recorded yet.'}</p>
          </div>
          <div className={`rounded-[1.5rem] border p-5 ${pendingFeedback > 0 ? 'border-amber-200 bg-amber-50/70' : 'border-emerald-200 bg-emerald-50/70'}`}>
            {pendingFeedback > 0 ? <AlertTriangle className="h-5 w-5 text-amber-700" /> : <CheckCircle2 className="h-5 w-5 text-emerald-700" />}
            <p className="mt-3 text-sm font-semibold text-slate-950">Feedback queue</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{pendingFeedback > 0 ? `${pendingFeedback} submission${pendingFeedback === 1 ? '' : 's'} still need a response.` : 'No submitted feedback is currently waiting for a response.'}</p>
          </div>
        </div>
      </section>

      <Panel title="Vulnerability breakdown" description="Legend markers, donut slices, values, and the 3D bars all use one exact shared color mapping." badge={`${vulnerabilityTotal} recorded tags`}>
        {analytics.vulnerabilities.length === 0 ? (
          <p className="py-14 text-center text-sm text-slate-500">No vulnerability data is available.</p>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[270px_minmax(0,1fr)] xl:items-center">
            <div className="relative mx-auto h-[250px] w-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.vulnerabilities} dataKey="value" nameKey="name" innerRadius={72} outerRadius={108} paddingAngle={3} cornerRadius={7} stroke="#fff" strokeWidth={3}>
                    {analytics.vulnerabilities.map((item) => <Cell key={item.name} fill={item.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 20px 50px rgba(15,23,42,.12)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="text-3xl font-semibold tracking-tight text-slate-950">{vulnerabilityTotal}</p>
                  <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500">Total tags</p>
                </div>
              </div>
            </div>

            <div>
              <ExactLegend items={analytics.vulnerabilities} />
              <p className="mt-3 text-xs leading-5 text-slate-500">A citizen can belong to more than one vulnerability category, so these values are category tags rather than a count of unique people.</p>
            </div>
          </div>
        )}
      </Panel>

      {analytics.vulnerabilities.length > 0 ? <ThreeDVulnerabilityChart data={analytics.vulnerabilities} /> : null}

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Relief activity" description="Distribution events over time. Hover any bar to inspect the date and count." badge={`${totalDistributions} events`}>
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={analytics.distributions} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="4 6" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={24} tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 20px 50px rgba(15,23,42,.12)' }} />
              <Bar dataKey="count" fill="#0F766E" radius={[8, 8, 2, 2]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Distribution types" description="Ranked relief categories using consistent colors and exact counts." badge={`${analytics.distributionTypes.length} types`}>
          {analytics.distributionTypes.length === 0 ? (
            <p className="py-14 text-center text-sm text-slate-500">No distribution-type data is available.</p>
          ) : (
            <div className="space-y-3">
              {analytics.distributionTypes.map((item) => {
                const max = analytics.distributionTypes[0]?.value || 1
                return (
                  <div key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-2.5">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="truncate text-sm font-semibold capitalize text-slate-700">{item.name.toLowerCase()}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-950">{item.value}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(5, (item.value / max) * 100)}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      </section>
    </div>
  )
}
