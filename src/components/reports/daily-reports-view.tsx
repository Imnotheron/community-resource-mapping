'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Printer, RefreshCw, FileText, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch, type AuthUser } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { WowLoader } from '@/components/ui/wow-loader'

function todayInputValue() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  )
}

function ReportHeader({ title, date, generatedAt }: { title: string; date: string; generatedAt: string }) {
  return (
    <div className="border-b-2 border-slate-900 pb-4 text-center">
      <div className="flex items-center justify-center gap-3">
        <img src="/san-policarpo-logo.png" alt="San Policarpo" className="h-14 w-14 object-contain" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">Republic of the Philippines</p>
          <p className="text-lg font-bold">Municipality of San Policarpo</p>
          <p className="text-sm">Community Resource Mapping System</p>
        </div>
      </div>
      <h1 className="mt-4 text-xl font-bold uppercase tracking-wide">{title}</h1>
      <p className="mt-1 text-sm">Report Date: {formatDate(date)}</p>
      <p className="text-xs text-slate-500">Generated: {formatDateTime(generatedAt)}</p>
    </div>
  )
}

function SignatureBlock({ leftLabel, rightLabel }: { leftLabel: string; rightLabel: string }) {
  return (
    <div className="mt-12 grid grid-cols-2 gap-16 text-center text-sm">
      <div>
        <div className="border-t border-slate-900 pt-2">{leftLabel}</div>
      </div>
      <div>
        <div className="border-t border-slate-900 pt-2">{rightLabel}</div>
      </div>
    </div>
  )
}

function AdminReport({ report }: { report: any }) {
  return (
    <div className="space-y-6">
      <ReportHeader title="Daily Municipal Operations Report" date={report.date} generatedAt={report.generatedAt} />

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Executive Summary</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Registered Citizens" value={report.summary.totalVulnerableCitizens} />
          <Metric label="New Registrations" value={report.summary.newRegistrations} />
          <Metric label="Active Workers" value={report.summary.activeWorkers} />
          <Metric label="Workers Online Today" value={report.summary.workersOnlineToday} />
          <Metric label="Distributions Recorded" value={report.summary.distributionsRecorded} />
          <Metric label="Approved" value={report.summary.approvedDistributions} />
          <Metric label="Pending" value={report.summary.pendingDistributions} />
          <Metric label="Field Notes" value={report.summary.fieldNotesCreated} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Daily Relief Distributions</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2">Beneficiary</th>
                <th className="px-3 py-2">Barangay</th>
                <th className="px-3 py-2">Type / Items</th>
                <th className="px-3 py-2">Qty.</th>
                <th className="px-3 py-2">Worker</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.distributions.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No distributions recorded for this date.</td></tr>
              ) : report.distributions.map((item: any) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{item.vulnerableProfile ? `${item.vulnerableProfile.firstName} ${item.vulnerableProfile.lastName}` : 'Household'}</td>
                  <td className="px-3 py-2">{item.vulnerableProfile?.barangay || '—'}</td>
                  <td className="px-3 py-2">{item.distributionType} — {item.itemsProvided}</td>
                  <td className="px-3 py-2">{item.quantity}</td>
                  <td className="px-3 py-2">{item.worker?.name || '—'}</td>
                  <td className="px-3 py-2">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">New Registrations</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100"><tr><th className="px-3 py-2">Citizen</th><th className="px-3 py-2">Barangay</th><th className="px-3 py-2">Status</th></tr></thead>
            <tbody>
              {report.registrations.length === 0 ? (
                <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-500">No new registrations for this date.</td></tr>
              ) : report.registrations.map((item: any) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{item.firstName} {item.lastName}</td>
                  <td className="px-3 py-2">{item.barangay}</td>
                  <td className="px-3 py-2">{item.registrationStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Barangay Summary</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100"><tr><th className="px-3 py-2">Barangay</th><th className="px-3 py-2">Registered Citizens</th><th className="px-3 py-2">Daily Distributions</th></tr></thead>
            <tbody>
              {report.barangaySummary.map((item: any) => (
                <tr key={item.name} className="border-t border-slate-200">
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2">{item.registeredCitizens}</td>
                  <td className="px-3 py-2">{item.distributions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <SignatureBlock leftLabel="Prepared by" rightLabel="Reviewed / Approved by" />
    </div>
  )
}

function WorkerReport({ report }: { report: any }) {
  return (
    <div className="space-y-6">
      <ReportHeader title="Daily Worker Accomplishment Report" date={report.date} generatedAt={report.generatedAt} />

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <p><strong>Worker:</strong> {report.worker.name}</p>
        <p><strong>Email:</strong> {report.worker.email}</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Daily Summary</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Distributions" value={report.summary.distributionsRecorded} />
          <Metric label="Approved" value={report.summary.approvedDistributions} />
          <Metric label="Pending" value={report.summary.pendingDistributions} />
          <Metric label="Rejected" value={report.summary.rejectedDistributions} />
          <Metric label="Total Quantity" value={report.summary.totalQuantity} />
          <Metric label="Field Notes" value={report.summary.fieldNotesCreated} />
          <Metric label="Assigned Households" value={report.summary.assignedHouseholds} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Relief Distributions</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100"><tr><th className="px-3 py-2">Beneficiary</th><th className="px-3 py-2">Barangay</th><th className="px-3 py-2">Items</th><th className="px-3 py-2">Qty.</th><th className="px-3 py-2">Status</th></tr></thead>
            <tbody>
              {report.distributions.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No distributions recorded for this date.</td></tr>
              ) : report.distributions.map((item: any) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{item.vulnerableProfile ? `${item.vulnerableProfile.firstName} ${item.vulnerableProfile.lastName}` : item.household?.headOfHousehold || 'Household'}</td>
                  <td className="px-3 py-2">{item.vulnerableProfile?.barangay || item.household?.barangay || '—'}</td>
                  <td className="px-3 py-2">{item.distributionType} — {item.itemsProvided}</td>
                  <td className="px-3 py-2">{item.quantity}</td>
                  <td className="px-3 py-2">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Field Notes</h2>
        <div className="space-y-2">
          {report.fieldNotes.length === 0 ? (
            <div className="rounded-xl border border-slate-200 p-5 text-center text-xs text-slate-500">No field notes recorded for this date.</div>
          ) : report.fieldNotes.map((item: any) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm">
              <p>{item.note}</p>
              <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
            </div>
          ))}
        </div>
      </section>

      <SignatureBlock leftLabel="Field Worker" rightLabel="Reviewed by Supervisor" />
    </div>
  )
}

export function DailyReportsView({ user }: { user: AuthUser }) {
  const isAdmin = String(user.role).toUpperCase() === 'ADMIN'
  const [date, setDate] = useState(todayInputValue())
  const [barangay, setBarangay] = useState('ALL')
  const [workerId, setWorkerId] = useState('ALL')
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams({ date })
      if (isAdmin) {
        if (barangay !== 'ALL') query.set('barangay', barangay)
        if (workerId !== 'ALL') query.set('workerId', workerId)
      } else {
        query.set('workerId', user.id)
      }

      const endpoint = isAdmin
        ? `/api/admin/reports/daily?${query}`
        : `/api/worker/reports/daily?${query}`
      const data = await apiFetch(endpoint)
      setReport(data.report)
    } catch (error: any) {
      toast.error('Failed to load report', { description: error.message })
    } finally {
      setLoading(false)
    }
  }, [barangay, date, isAdmin, user.id, workerId])

  useEffect(() => { load() }, [load])

  const barangays = useMemo(() => {
    return report?.barangays || []
  }, [report])

  return (
    <div className="space-y-5 animate-fade-in">
      <style>{`
        @media print {
          body { background: white !important; }
          aside, header, footer, .no-print { display: none !important; }
          main { overflow: visible !important; padding: 0 !important; }
          .report-print-root { box-shadow: none !important; border: 0 !important; padding: 0 !important; }
          @page { size: A4 portrait; margin: 12mm; }
        }
      `}</style>

      <div className="no-print flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-emerald-700">Operations Reporting</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Daily Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Generate a date-based report, verify the figures, then print it on A4 paper.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={() => window.print()} disabled={loading || !report} className="gap-2">
            <Printer className="h-4 w-4" /> Print Report
          </Button>
        </div>
      </div>

      <Card className="no-print border-slate-200">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4 text-emerald-600" /> Report Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="report-date">Report date</Label>
            <Input id="report-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          {isAdmin && (
            <>
              <div className="space-y-2">
                <Label>Barangay</Label>
                <Select value={barangay} onValueChange={setBarangay}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All barangays</SelectItem>
                    {barangays.map((name: string) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Worker</Label>
                <Select value={workerId} onValueChange={setWorkerId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All workers</SelectItem>
                    {(report?.workers || []).map((worker: any) => <SelectItem key={worker.id} value={worker.id}>{worker.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <WowLoader label="Generating daily report" description="Calculating registrations, distributions, workers, and field activity..." />
      ) : !report ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center"><FileText className="h-10 w-10 text-slate-400" /><p className="mt-3 text-sm text-slate-500">No report data is available.</p></CardContent></Card>
      ) : (
        <div className="report-print-root rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
          {isAdmin ? <AdminReport report={report} /> : <WorkerReport report={report} />}
        </div>
      )}
    </div>
  )
}
