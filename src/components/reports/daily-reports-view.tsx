'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, FileText, Printer, RefreshCw } from 'lucide-react'
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
    <div className="report-metric rounded-xl border border-slate-200 bg-white p-3">
      <p className="report-metric-label text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="report-metric-value mt-2 text-2xl font-semibold text-slate-950">
        {value}
      </p>
    </div>
  )
}

function ReportHeader({
  title,
  date,
  generatedAt,
}: {
  title: string
  date: string
  generatedAt: string
}) {
  return (
    <header className="report-document-header border-b-2 border-slate-900 pb-4 text-center">
      <div className="report-government-heading flex items-center justify-center gap-3">
        <img
          src="/san-policarpo-logo.png"
          alt="Municipality of San Policarpo seal"
          className="report-seal h-14 w-14 object-contain"
        />
        <div>
          <p className="report-republic text-xs font-semibold uppercase tracking-[0.18em]">
            Republic of the Philippines
          </p>
          <p className="report-municipality text-lg font-bold">
            Municipality of San Policarpo
          </p>
          <p className="report-system-name text-sm">
            Community Resource Mapping System
          </p>
        </div>
      </div>

      <h1 className="report-title mt-4 text-xl font-bold uppercase tracking-wide">
        {title}
      </h1>
      <p className="report-date mt-1 text-sm">
        Report Date: {formatDate(date)}
      </p>
      <p className="report-generated text-xs text-slate-500">
        Generated: {formatDateTime(generatedAt)}
      </p>
    </header>
  )
}

function SignatureBlock({
  leftLabel,
  rightLabel,
}: {
  leftLabel: string
  rightLabel: string
}) {
  return (
    <section className="report-signatures mt-12 grid grid-cols-2 gap-16 text-center text-sm">
      <div>
        <div className="border-t border-slate-900 pt-2">{leftLabel}</div>
      </div>
      <div>
        <div className="border-t border-slate-900 pt-2">{rightLabel}</div>
      </div>
    </section>
  )
}

function ReportTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="report-table-wrap overflow-hidden rounded-xl border border-slate-200">
      {children}
    </div>
  )
}

function AdminReport({ report }: { report: any }) {
  return (
    <div className="report-document space-y-6">
      <ReportHeader
        title="Daily Municipal Operations Report"
        date={report.date}
        generatedAt={report.generatedAt}
      />

      <section className="report-section">
        <h2 className="report-section-title mb-3 text-sm font-bold uppercase tracking-wide">
          Executive Summary
        </h2>
        <div className="report-summary-grid grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric
            label="Registered Citizens"
            value={report.summary.totalVulnerableCitizens}
          />
          <Metric
            label="New Registrations"
            value={report.summary.newRegistrations}
          />
          <Metric label="Active Workers" value={report.summary.activeWorkers} />
          <Metric
            label="Workers Online Today"
            value={report.summary.workersOnlineToday}
          />
          <Metric
            label="Distributions Recorded"
            value={report.summary.distributionsRecorded}
          />
          <Metric
            label="Approved"
            value={report.summary.approvedDistributions}
          />
          <Metric
            label="Pending"
            value={report.summary.pendingDistributions}
          />
          <Metric label="Field Notes" value={report.summary.fieldNotesCreated} />
        </div>
      </section>

      <section className="report-section">
        <h2 className="report-section-title mb-3 text-sm font-bold uppercase tracking-wide">
          Daily Relief Distributions
        </h2>
        <ReportTable>
          <table className="report-table w-full text-left text-xs">
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
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    No distributions recorded for this date.
                  </td>
                </tr>
              ) : (
                report.distributions.map((item: any) => (
                  <tr key={item.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">
                      {item.vulnerableProfile
                        ? `${item.vulnerableProfile.firstName} ${item.vulnerableProfile.lastName}`
                        : 'Household'}
                    </td>
                    <td className="px-3 py-2">
                      {item.vulnerableProfile?.barangay || '—'}
                    </td>
                    <td className="px-3 py-2">
                      {item.distributionType} — {item.itemsProvided}
                    </td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">{item.worker?.name || '—'}</td>
                    <td className="px-3 py-2">{item.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ReportTable>
      </section>

      <section className="report-section">
        <h2 className="report-section-title mb-3 text-sm font-bold uppercase tracking-wide">
          New Registrations
        </h2>
        <ReportTable>
          <table className="report-table w-full text-left text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2">Citizen</th>
                <th className="px-3 py-2">Barangay</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.registrations.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    No new registrations for this date.
                  </td>
                </tr>
              ) : (
                report.registrations.map((item: any) => (
                  <tr key={item.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">
                      {item.firstName} {item.lastName}
                    </td>
                    <td className="px-3 py-2">{item.barangay}</td>
                    <td className="px-3 py-2">{item.registrationStatus}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ReportTable>
      </section>

      <section className="report-section">
        <h2 className="report-section-title mb-3 text-sm font-bold uppercase tracking-wide">
          Barangay Summary
        </h2>
        <ReportTable>
          <table className="report-table w-full text-left text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2">Barangay</th>
                <th className="px-3 py-2">Registered Citizens</th>
                <th className="px-3 py-2">Daily Distributions</th>
              </tr>
            </thead>
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
        </ReportTable>
      </section>

      <SignatureBlock
        leftLabel="Prepared by"
        rightLabel="Reviewed / Approved by"
      />
    </div>
  )
}

function WorkerReport({ report }: { report: any }) {
  return (
    <div className="report-document space-y-6">
      <ReportHeader
        title="Daily Worker Accomplishment Report"
        date={report.date}
        generatedAt={report.generatedAt}
      />

      <section className="report-worker-info rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <p>
          <strong>Worker:</strong> {report.worker.name}
        </p>
        <p>
          <strong>Email:</strong> {report.worker.email}
        </p>
      </section>

      <section className="report-section">
        <h2 className="report-section-title mb-3 text-sm font-bold uppercase tracking-wide">
          Daily Summary
        </h2>
        <div className="report-summary-grid grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric
            label="Distributions"
            value={report.summary.distributionsRecorded}
          />
          <Metric
            label="Approved"
            value={report.summary.approvedDistributions}
          />
          <Metric
            label="Pending"
            value={report.summary.pendingDistributions}
          />
          <Metric
            label="Rejected"
            value={report.summary.rejectedDistributions}
          />
          <Metric label="Total Quantity" value={report.summary.totalQuantity} />
          <Metric label="Field Notes" value={report.summary.fieldNotesCreated} />
          <Metric
            label="Assigned Households"
            value={report.summary.assignedHouseholds}
          />
        </div>
      </section>

      <section className="report-section">
        <h2 className="report-section-title mb-3 text-sm font-bold uppercase tracking-wide">
          Relief Distributions
        </h2>
        <ReportTable>
          <table className="report-table w-full text-left text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2">Beneficiary</th>
                <th className="px-3 py-2">Barangay</th>
                <th className="px-3 py-2">Items</th>
                <th className="px-3 py-2">Qty.</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.distributions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    No distributions recorded for this date.
                  </td>
                </tr>
              ) : (
                report.distributions.map((item: any) => (
                  <tr key={item.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">
                      {item.vulnerableProfile
                        ? `${item.vulnerableProfile.firstName} ${item.vulnerableProfile.lastName}`
                        : item.household?.headOfHousehold || 'Household'}
                    </td>
                    <td className="px-3 py-2">
                      {item.vulnerableProfile?.barangay ||
                        item.household?.barangay ||
                        '—'}
                    </td>
                    <td className="px-3 py-2">
                      {item.distributionType} — {item.itemsProvided}
                    </td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">{item.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ReportTable>
      </section>

      <section className="report-section">
        <h2 className="report-section-title mb-3 text-sm font-bold uppercase tracking-wide">
          Field Notes
        </h2>
        <div className="report-field-notes space-y-2">
          {report.fieldNotes.length === 0 ? (
            <div className="report-empty-state rounded-xl border border-slate-200 p-5 text-center text-xs text-slate-500">
              No field notes recorded for this date.
            </div>
          ) : (
            report.fieldNotes.map((item: any) => (
              <article
                key={item.id}
                className="report-field-note rounded-xl border border-slate-200 p-3 text-sm"
              >
                <p>{item.note}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDateTime(item.createdAt)}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <SignatureBlock
        leftLabel="Field Worker"
        rightLabel="Reviewed by Supervisor"
      />
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

  useEffect(() => {
    load()
  }, [load])

  const barangays = useMemo(() => report?.barangays || [], [report])

  return (
    <div className="daily-reports-screen space-y-5 animate-fade-in">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          html {
            background: #ffffff !important;
            zoom: 1 !important;
          }

          body {
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
            color: #0f172a !important;
            zoom: 1 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          .report-print-root,
          .report-print-root * {
            visibility: visible !important;
          }

          .report-print-root {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            z-index: 2147483647 !important;
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            color: #0f172a !important;
            transform: none !important;
          }

          .report-document {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 9.5pt !important;
            line-height: 1.35 !important;
          }

          .report-document-header {
            margin: 0 0 6mm !important;
            padding: 0 0 4mm !important;
            border-bottom: 1.2pt solid #0f172a !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .report-government-heading {
            gap: 3mm !important;
          }

          .report-seal {
            width: 14mm !important;
            height: 14mm !important;
          }

          .report-republic {
            font-size: 7.5pt !important;
            letter-spacing: 0.16em !important;
          }

          .report-municipality {
            font-size: 12pt !important;
            line-height: 1.2 !important;
          }

          .report-system-name {
            font-size: 8.5pt !important;
          }

          .report-title {
            margin-top: 4mm !important;
            font-size: 14pt !important;
            line-height: 1.2 !important;
          }

          .report-date {
            margin-top: 1.5mm !important;
            font-size: 9pt !important;
          }

          .report-generated {
            font-size: 7.5pt !important;
          }

          .report-worker-info {
            margin: 0 0 5mm !important;
            padding: 3mm 4mm !important;
            border: 0.7pt solid #cbd5e1 !important;
            border-radius: 2mm !important;
            background: #ffffff !important;
            font-size: 8.5pt !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .report-section {
            margin: 0 0 5mm !important;
          }

          .report-section-title {
            margin: 0 0 2.5mm !important;
            font-size: 9pt !important;
            letter-spacing: 0.04em !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          .report-summary-grid {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 2.5mm !important;
          }

          .report-metric {
            min-height: 18mm !important;
            padding: 2.5mm 3mm !important;
            border: 0.7pt solid #cbd5e1 !important;
            border-radius: 2mm !important;
            background: #ffffff !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .report-metric-label {
            font-size: 6.5pt !important;
            letter-spacing: 0.11em !important;
            color: #475569 !important;
          }

          .report-metric-value {
            margin-top: 2mm !important;
            font-size: 15pt !important;
            line-height: 1 !important;
          }

          .report-table-wrap {
            overflow: visible !important;
            border: 0.7pt solid #cbd5e1 !important;
            border-radius: 2mm !important;
          }

          .report-table {
            width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
            font-size: 7.5pt !important;
          }

          .report-table thead {
            display: table-header-group !important;
          }

          .report-table tbody {
            display: table-row-group !important;
          }

          .report-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .report-table th,
          .report-table td {
            padding: 2mm 2.5mm !important;
            border-color: #cbd5e1 !important;
            vertical-align: top !important;
            overflow-wrap: anywhere !important;
          }

          .report-table th {
            background: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 700 !important;
          }

          .report-field-note,
          .report-empty-state {
            margin-bottom: 2mm !important;
            padding: 2.5mm 3mm !important;
            border: 0.7pt solid #cbd5e1 !important;
            border-radius: 2mm !important;
            font-size: 8pt !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .report-signatures {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 20mm !important;
            margin-top: 18mm !important;
            font-size: 8.5pt !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .no-print,
          [data-walkthrough-overlay="true"],
          [data-registration-form-controls="true"] {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Operations Reporting
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Daily Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate a date-based report, verify the figures, then print it on
            A4 paper.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={load}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button
            onClick={() => window.print()}
            disabled={loading || !report}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>

      <Card className="no-print border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="report-date">Report date</Label>
            <Input
              id="report-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          {isAdmin && (
            <>
              <div className="space-y-2">
                <Label>Barangay</Label>
                <Select value={barangay} onValueChange={setBarangay}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All barangays</SelectItem>
                    {barangays.map((name: string) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Worker</Label>
                <Select value={workerId} onValueChange={setWorkerId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All workers</SelectItem>
                    {(report?.workers || []).map((worker: any) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <WowLoader
          label="Generating daily report"
          description="Calculating registrations, distributions, workers, and field activity..."
        />
      ) : !report ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-slate-400" />
            <p className="mt-3 text-sm text-slate-500">
              No report data is available.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div
          data-print-report="true"
          className="report-print-root rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-10"
          aria-label={
            isAdmin
              ? 'Daily Municipal Operations Report'
              : 'Daily Worker Accomplishment Report'
          }
        >
          {isAdmin ? (
            <AdminReport report={report} />
          ) : (
            <WorkerReport report={report} />
          )}
        </div>
      )}
    </div>
  )
}
