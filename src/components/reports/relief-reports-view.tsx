'use client'

import { useMemo, useState } from 'react'
import {
  CalendarRange,
  Download,
  FileBarChart2,
  Printer,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

import { type AuthUser, apiFetch } from '@/lib/api-client'
import {
  RELIEF_GENERAL_LABELS,
  VULNERABILITY_GENERAL_LABELS,
  reliefGeneralCategory,
  vulnerabilityGeneralGroups,
} from '@/lib/relief-classification'
import {
  formatVulnerabilityTypes,
  vulnerabilityLabel,
} from '@/components/dashboards/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { WowLoader } from '@/components/ui/wow-loader'
import {
  AdditionalReliefPrintTemplate,
  type ReportTemplate,
} from '@/components/reports/relief-report-templates'

type Distribution = {
  id: string
  distributionDate: string
  distributionType: string
  itemsProvided: string
  quantity: number
  status: string
  worker: { id: string; name: string } | null
  vulnerableProfile: {
    id: string
    firstName: string
    lastName: string
    barangay: string
    vulnerabilityTypes: string | null
  } | null
  household: {
    id: string
    headOfHousehold: string | null
    barangay: string
  } | null
}

type ReliefReport = {
  from: string
  to: string
  generatedAt: string
  scope: 'ADMIN' | 'WORKER'
  distributions: Distribution[]
}

type Filters = {
  status: string
  barangay: string
  worker: string
  generalRelief: string
  specificRelief: string
  generalVulnerability: string
  specificVulnerability: string
}

const ALL = 'ALL'
const INITIAL_FILTERS: Filters = {
  status: ALL,
  barangay: ALL,
  worker: ALL,
  generalRelief: ALL,
  specificRelief: ALL,
  generalVulnerability: ALL,
  specificVulnerability: ALL,
}

function manilaToday() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function presetPeriod(days: number) {
  const to = manilaToday()
  const end = new Date(`${to}T00:00:00.000Z`)
  end.setUTCDate(end.getUTCDate() - (days - 1))
  return { from: end.toISOString().slice(0, 10), to }
}

function dateText(value: string) {
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00+08:00`)
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function fullName(record: Distribution) {
  const profile = record.vulnerableProfile
  return profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ')
    : record.household?.headOfHousehold || 'Unspecified household'
}

function barangayOf(record: Distribution) {
  return record.vulnerableProfile?.barangay ||
    record.household?.barangay ||
    'Unspecified'
}

function specificSectors(record: Distribution): string[] {
  const value = formatVulnerabilityTypes(
    record.vulnerableProfile?.vulnerabilityTypes,
  )
  return value.length ? value : ['OTHER']
}

function matches(record: Distribution, filters: Filters, omit?: keyof Filters) {
  return (
    (omit === 'status' || filters.status === ALL || record.status === filters.status) &&
    (omit === 'barangay' || filters.barangay === ALL || barangayOf(record) === filters.barangay) &&
    (omit === 'worker' || filters.worker === ALL || record.worker?.id === filters.worker) &&
    (omit === 'generalRelief' || filters.generalRelief === ALL || reliefGeneralCategory(record) === filters.generalRelief) &&
    (omit === 'specificRelief' || filters.specificRelief === ALL || record.distributionType === filters.specificRelief) &&
    (omit === 'generalVulnerability' || filters.generalVulnerability === ALL ||
      vulnerabilityGeneralGroups(record.vulnerableProfile).includes(filters.generalVulnerability)) &&
    (omit === 'specificVulnerability' || filters.specificVulnerability === ALL ||
      specificSectors(record).includes(filters.specificVulnerability))
  )
}

function csvCell(value: unknown) {
  const text = String(value ?? '')
  const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

const PRINT_CSS = `
  @media print {
    @page { size: A4 landscape; margin: 12mm; }
    html, body {
      height: auto !important;
      overflow: visible !important;
      background: white !important;
      print-color-adjust: exact;
    }
    body * { visibility: hidden !important; }
    .relief-report-print, .relief-report-print * { visibility: visible !important; }
    aside, nav, footer, button, .no-print, [data-walkthrough-overlay="true"] {
      display: none !important;
    }
    header:not(.relief-print-header) { display: none !important; }
    .crms-dashboard-theme, .crms-dashboard-theme > div,
    .crms-dashboard-theme > div > div, main, main > div {
      display: block !important;
      position: static !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      transform: none !important;
      filter: none !important;
    }
    .relief-report-print {
      position: static !important;
      width: 100% !important;
      max-width: none !important;
      box-shadow: none !important;
      border: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      font-family: Arial, Helvetica, sans-serif !important;
      font-size: 9pt !important;
      color: #0f172a !important;
    }
    .relief-report-print table { width: 100% !important; border-collapse: collapse; font-size: 8pt; }
    .relief-report-print th, .relief-report-print td {
      border: 1px solid #cbd5e1 !important;
      padding: 5px !important;
      text-align: left;
      vertical-align: top;
      overflow-wrap: anywhere;
    }
    .relief-report-print thead { display: table-header-group; }
    .relief-report-print .rds-sheet { break-inside: auto !important; }
    .relief-report-print .rds-sheet:not(:last-child) { break-after: page; page-break-after: always; }
    .relief-report-print .rds-signature-cell { min-width: 105px; height: 35px; }
    .relief-report-print tr, .relief-report-print .relief-keep-together {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
  }
`

export function ReliefReportsView({ user }: { user: AuthUser }) {
  const isAdmin = String(user.role).toUpperCase() === 'ADMIN'
  const [period, setPeriod] = useState(() => presetPeriod(7))
  const [report, setReport] = useState<ReliefReport | null>(null)
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS)
  const [sortBy, setSortBy] = useState('DATE_DESC')
  const [loading, setLoading] = useState(false)
  const [preparedName, setPreparedName] = useState(user.name || '')
  const [approvedName, setApprovedName] = useState('')
  const [reportTemplate, setReportTemplate] = useState<ReportTemplate>('LGU')
  const [rdsInfo, setRdsInfo] = useState({
    region: 'Region VIII (Eastern Visayas)',
    province: 'Eastern Samar',
    municipality: 'Municipality of San Policarpo',
    disasterType: '',
    occurrenceDate: '',
    evacuationCenter: '',
  })
  const [dependentCounts, setDependentCounts] = useState<Record<string, string>>({})
  const [quantityUnits, setQuantityUnits] = useState<Record<string, string>>({})

  const switchTemplate = (value: ReportTemplate) => {
    setReportTemplate(value)
    setFilters(INITIAL_FILTERS)
  }

  const isCurrent = Boolean(
    report && report.from === period.from && report.to === period.to,
  )

  const updateFilter = (field: keyof Filters, value: string) => {
    setFilters((previous) => ({
      ...previous,
      [field]: value,
      ...(field === 'generalRelief' ? { specificRelief: ALL } : {}),
      ...(field === 'generalVulnerability' ? { specificVulnerability: ALL } : {}),
    }))
  }

  const allRows = useMemo(() => {
    const records = isCurrent ? report?.distributions || [] : []
    // CRMS Admin approval confirms workers' already recorded distributions.
    return reportTemplate === 'LGU'
      ? records
      : records.filter((row) => row.status === 'APPROVED' || row.status === 'DISTRIBUTED')
  }, [isCurrent, report, reportTemplate])
  const facets = (field: keyof Filters) =>
    allRows.filter((row) => matches(row, filters, field))

  const options = {
    status: Array.from(new Set(facets('status').map((row) => row.status))).sort(),
    barangay: Array.from(new Set(facets('barangay').map(barangayOf))).sort(),
    worker: Array.from(
      new Map(
        facets('worker')
          .filter((row) => row.worker)
          .map((row) => [row.worker!.id, row.worker!.name]),
      ).entries(),
    ).sort((a, b) => a[1].localeCompare(b[1])),
    generalRelief: Array.from(
      new Set(facets('generalRelief').map(reliefGeneralCategory)),
    ).sort(),
    specificRelief: Array.from(
      new Set(facets('specificRelief').map((row) => row.distributionType)),
    ).sort(),
    generalVulnerability: Array.from(
      new Set(facets('generalVulnerability').flatMap((row) =>
        vulnerabilityGeneralGroups(row.vulnerableProfile),
      )),
    ).sort(),
    specificVulnerability: Array.from(
      new Set(facets('specificVulnerability').flatMap(specificSectors)),
    ).sort(),
  }

  const rows = useMemo(() => {
    return allRows.filter((row) => matches(row, filters)).sort((a, b) => {
      if (sortBy === 'DATE_ASC') {
        return new Date(a.distributionDate).getTime() -
          new Date(b.distributionDate).getTime()
      }
      if (sortBy === 'BARANGAY') return barangayOf(a).localeCompare(barangayOf(b))
      if (sortBy === 'BENEFICIARY') return fullName(a).localeCompare(fullName(b))
      if (sortBy === 'RELIEF') return a.distributionType.localeCompare(b.distributionType)
      if (sortBy === 'STATUS') return a.status.localeCompare(b.status)
      return new Date(b.distributionDate).getTime() -
        new Date(a.distributionDate).getTime()
    })
  }, [allRows, filters, sortBy])

  const summary = useMemo(() => {
    const approved = rows.filter((row) => row.status === 'APPROVED')
    const barangays = new Map<string, { count: number; quantity: number }>()
    const reliefTypes = new Map<string, { count: number; quantity: number }>()

    for (const row of rows) {
      const isApproved = row.status === 'APPROVED'
      const barangay = barangayOf(row)
      const relief = row.distributionType || 'Unspecified'
      const location = barangays.get(barangay) || { count: 0, quantity: 0 }
      const category = reliefTypes.get(relief) || { count: 0, quantity: 0 }
      location.count += 1
      category.count += 1
      if (isApproved) {
        location.quantity += Number(row.quantity) || 0
        category.quantity += Number(row.quantity) || 0
      }
      barangays.set(barangay, location)
      reliefTypes.set(relief, category)
    }

    return {
      records: rows.length,
      approved: approved.length,
      pending: rows.filter((row) => row.status === 'PENDING').length,
      rejected: rows.filter((row) => row.status === 'REJECTED').length,
      approvedQuantity: approved.reduce((n, row) => n + (Number(row.quantity) || 0), 0),
      beneficiaries: new Set(
        rows.map((row) => row.vulnerableProfile?.id || row.household?.id || row.id),
      ).size,
      barangays: Array.from(barangays.entries()).sort((a, b) => a[0].localeCompare(b[0])),
      reliefTypes: Array.from(reliefTypes.entries()).sort((a, b) => a[0].localeCompare(b[0])),
    }
  }, [rows])

  const dateError =
    !period.from || !period.to || period.from > period.to
      ? 'Select a valid date range (From must not be after To).'
      : null

  async function generate() {
    if (dateError) {
      toast.error(dateError)
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams({ from: period.from, to: period.to })
      const endpoint = isAdmin ? '/api/admin/reports/relief' : '/api/worker/reports/relief'
      const data = await apiFetch<{ report: ReliefReport }>(
        `${endpoint}?${params.toString()}`,
      )
      setReport(data.report)
      setFilters(INITIAL_FILTERS)
      toast.success('Relief report generated')
    } catch (error: any) {
      setReport(null)
      toast.error('Relief report could not be generated', {
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  function exportCsv() {
    if (!isCurrent || !rows.length || !report) return
    const headers = [
      'Date', 'Beneficiary', 'Barangay', 'General relief',
      'Specific relief', 'Items', 'Quantity', 'Vulnerability',
      'Worker', 'Status',
    ]
    const csvRows = rows.map((row) => [
      dateText(row.distributionDate),
      fullName(row),
      barangayOf(row),
      RELIEF_GENERAL_LABELS[reliefGeneralCategory(row)] || 'Other Relief',
      row.distributionType,
      row.itemsProvided,
      row.quantity,
      specificSectors(row).map(vulnerabilityLabel).join('; '),
      row.worker?.name || '',
      row.status,
    ])
    const csv = '\uFEFF' + [headers, ...csvRows].map(
      (columns) => columns.map(csvCell).join(','),
    ).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `CRMS-${reportTemplate.toLowerCase()}-relief-report-${report.from}-to-${report.to}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const labelOptions = (
    field: keyof Filters,
    items: Array<{ value: string; label: string }>,
    placeholder: string,
  ) => (
    <SearchableSelect
      value={filters[field]}
      onValueChange={(value) => updateFilter(field, value)}
      placeholder={placeholder}
      searchPlaceholder={`Search ${placeholder.toLowerCase()}...`}
      className="min-w-0"
      contentClassName="max-w-[calc(100vw-2rem)]"
      options={[{ value: ALL, label: placeholder }, ...items]}
    />
  )

  return (
    <div className="space-y-5" data-testid="relief-reports-section">
      <style>{PRINT_CSS}</style>

      <div className="no-print flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-950">
            <FileBarChart2 className="h-5 w-5 text-emerald-700" />
            Relief Distribution Reports
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Request a standalone report for relief assistance within a chosen period.
            Counts and approved quantities follow the visible filters.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={!isCurrent || rows.length === 0 || loading}
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button
            onClick={() => window.print()}
            disabled={!isCurrent || loading || (reportTemplate !== 'LGU' && rows.length === 0)}
          >
            <Printer className="mr-2 h-4 w-4" /> Print Relief Report
          </Button>
        </div>
      </div>

      <Card className="no-print min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-4 w-4 text-emerald-700" />
            Request a Relief Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[{ label: 'Today', days: 1 }, { label: 'Last 7 days', days: 7 }, { label: 'Last 30 days', days: 30 }].map((preset) => (
              <Button
                key={preset.days}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPeriod(presetPeriod(preset.days))}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="relief-report-from">From</Label>
              <Input
                id="relief-report-from"
                type="date"
                className="w-full min-w-0"
                value={period.from}
                onChange={(event) => setPeriod((prev) => ({ ...prev, from: event.target.value }))}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="relief-report-to">To</Label>
              <Input
                id="relief-report-to"
                type="date"
                className="w-full min-w-0"
                value={period.to}
                onChange={(event) => setPeriod((prev) => ({ ...prev, to: event.target.value }))}
              />
            </div>
          </div>
          {dateError ? <p role="alert" className="text-sm text-destructive">{dateError}</p> : null}
          <Button onClick={() => void generate()} disabled={loading || Boolean(dateError)}>
            {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <FileBarChart2 className="mr-2 h-4 w-4" />}
            {loading ? 'Generating…' : 'Generate Relief Report'}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <WowLoader compact label="Generating relief report" description="Reading authorized distribution records..." />
      ) : !report ? (
        <Card className="no-print">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Choose a period and select Generate Relief Report to preview the document.
          </CardContent>
        </Card>
      ) : !isCurrent ? (
        <Card className="no-print">
          <CardContent className="p-7 text-sm text-amber-800">
            The reporting dates have changed. Generate the report again to display the new period.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="no-print min-w-0" data-testid="relief-report-template-picker">
            <CardHeader>
              <CardTitle className="text-base">Choose print template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label="Report template">
                {([
                  ['LGU', 'LGU Relief Summary Report'],
                  ['DSWD_RDS', 'DSWD-style Relief Distribution Sheet'],
                  ['ACCOMPLISHMENT', 'Relief Accomplishment Report'],
                ] as const).map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    variant={reportTemplate === value ? 'default' : 'outline'}
                    aria-pressed={reportTemplate === value}
                    onClick={() => switchTemplate(value)}
                    className="h-auto min-h-12 whitespace-normal text-left"
                  >
                    {label}
                  </Button>
                ))}
              </div>
              {reportTemplate !== 'LGU' ? (
                <p className="text-sm text-amber-800" role="status">
                  Only accepted field-distribution records (APPROVED or DISTRIBUTED) are included.
                  Pending and rejected entries are excluded. Signed beneficiary acknowledgment
                  must still be collected for a DSWD-style RDS.
                  {rows.length === 0 ? ' No verified records match the current period or filters.' : ''}
                </p>
              ) : (
                <p className="text-sm text-slate-600">
                  Existing LGU operational summary is preserved, including all relief statuses.
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="no-print min-w-0">
            <CardHeader>
              <CardTitle className="text-base">Filter this relief report</CardTitle>
            </CardHeader>
            <CardContent
              data-testid="relief-report-filters"
              className="grid w-full min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3 [&>div]:min-w-0"
            >
              <div className="space-y-2">
                <Label>Relief status</Label>
                {labelOptions('status', options.status.map((value) => ({
                  value, label: value[0] + value.slice(1).toLowerCase(),
                })), 'All statuses')}
              </div>
              <div className="space-y-2">
                <Label>Barangay</Label>
                {labelOptions('barangay', options.barangay.map((value) => ({ value, label: value })), 'All barangays')}
              </div>
              {isAdmin ? (
                <div className="space-y-2">
                  <Label>Worker</Label>
                  {labelOptions('worker', options.worker.map(([value, label]) => ({ value, label })), 'All workers')}
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>General relief type</Label>
                {labelOptions(
                  'generalRelief',
                  options.generalRelief.map((value) => ({
                    value, label: RELIEF_GENERAL_LABELS[value] || value,
                  })),
                  'All general relief types',
                )}
              </div>
              <div className="space-y-2">
                <Label>Specific relief type</Label>
                {labelOptions('specificRelief', options.specificRelief.map((value) => ({ value, label: value })), 'All specific relief types')}
              </div>
              <div className="space-y-2">
                <Label>General vulnerability</Label>
                {labelOptions(
                  'generalVulnerability',
                  options.generalVulnerability.map((value) => ({
                    value, label: VULNERABILITY_GENERAL_LABELS[value] || value,
                  })),
                  'All general vulnerabilities',
                )}
              </div>
              <div className="space-y-2">
                <Label>Specific vulnerability</Label>
                {labelOptions(
                  'specificVulnerability',
                  options.specificVulnerability.map((value) => ({
                    value, label: vulnerabilityLabel(value),
                  })),
                  'All specific vulnerabilities',
                )}
              </div>
              <div className="space-y-2">
                <Label>Sort records by</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full min-w-0"><SelectValue /></SelectTrigger>
                  <SelectContent align="start" className="min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">
                    <SelectItem value="DATE_DESC">Newest first</SelectItem>
                    <SelectItem value="DATE_ASC">Oldest first</SelectItem>
                    <SelectItem value="BARANGAY">Barangay</SelectItem>
                    <SelectItem value="BENEFICIARY">Beneficiary</SelectItem>
                    <SelectItem value="RELIEF">Relief type</SelectItem>
                    <SelectItem value="STATUS">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={() => setFilters(INITIAL_FILTERS)} className="w-full">
                  Clear filters
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="no-print">
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="relief-report-prepared">Prepared by</Label>
                <Input id="relief-report-prepared" value={preparedName} onChange={(e) => setPreparedName(e.target.value)} maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relief-report-approved">Reviewed / Approved by</Label>
                <Input id="relief-report-approved" value={approvedName} onChange={(e) => setApprovedName(e.target.value)} placeholder="Municipal Mayor / MSWDO Head" maxLength={120} />
              </div>
            </CardContent>
          </Card>

          {reportTemplate !== 'LGU' && (
            <Card className="no-print">
              <CardHeader>
                <CardTitle className="text-base">Print details and verification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                  These details are for this print preview only and do not modify the source
                  distribution records. Verify missing information before signing or submitting.
                </p>
                {reportTemplate === 'DSWD_RDS' && (
                  <>
                    <p className="text-sm font-medium">
                      DSWD Annex H-inspired format for LGU preparation — not an official DSWD-issued document.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {([
                        ['region', 'Region'],
                        ['province', 'Province'],
                        ['municipality', 'Municipality'],
                        ['disasterType', 'Type of Disaster'],
                        ['evacuationCenter', 'Name of Evacuation Center'],
                      ] as const).map(([field, label]) => (
                        <div className="space-y-1" key={field}>
                          <Label htmlFor={'rds-' + field}>{label}</Label>
                          <Input id={'rds-' + field} value={rdsInfo[field]}
                            onChange={(e) => setRdsInfo((prev) => ({ ...prev, [field]: e.target.value }))}
                            maxLength={150} />
                        </div>
                      ))}
                      <div className="space-y-1">
                        <Label htmlFor="rds-occurrenceDate">Date of Occurrence</Label>
                        <Input id="rds-occurrenceDate" type="date" value={rdsInfo.occurrenceDate}
                          onChange={(e) => setRdsInfo((prev) => ({ ...prev, occurrenceDate: e.target.value }))} />
                      </div>
                    </div>
                  </>
                )}
                <details className="rounded-lg border border-slate-200 p-3">
                  <summary className="cursor-pointer font-medium">
                    Verify quantities/units{reportTemplate === 'DSWD_RDS' ? ' and number of dependents' : ''} per beneficiary
                  </summary>
                  <p className="my-3 text-xs text-slate-600">
                    The current database does not record these values separately. Leave unknown
                    values blank; no number of dependents or unit will be invented.
                    Signature/thumbmark is intentionally blank for actual acknowledgment on paper.
                  </p>
                  <div className="max-h-96 space-y-3 overflow-y-auto">
                    {rows.map((row) => (
                      <div key={row.id} className="grid gap-2 border-b pb-3 sm:grid-cols-3">
                        <p className="text-sm font-medium">
                          {fullName(row)} · {barangayOf(row)} · {row.distributionType}
                        </p>
                        {reportTemplate === 'DSWD_RDS' && (
                          <div className="space-y-1">
                            <Label htmlFor={'rds-dependents-' + row.id}>No. of dependents for {fullName(row)}</Label>
                            <Input
                              id={'rds-dependents-' + row.id} inputMode="numeric" type="number" min={0} step={1}
                              value={dependentCounts[row.id] ?? ''}
                              onChange={(e) => setDependentCounts((prev) => ({
                                ...prev, [row.id]: e.target.value,
                              }))}
                              placeholder="Unknown — leave blank"
                            />
                          </div>
                        )}
                        <div className="space-y-1">
                          <Label htmlFor={'rds-unit-' + row.id}>Quantity unit for {fullName(row)} ({row.quantity})</Label>
                          <Input id={'rds-unit-' + row.id} value={quantityUnits[row.id] ?? ''}
                            maxLength={60} placeholder="e.g. packs, kg, kits"
                            onChange={(e) => setQuantityUnits((prev) => ({
                              ...prev, [row.id]: e.target.value,
                            }))} />
                        </div>
                      </div>
                    ))}
                    {rows.length === 0 && <p className="text-sm">No verified relief distributions in the current filters.</p>}
                  </div>
                </details>
              </CardContent>
            </Card>
          )}

          {reportTemplate === 'LGU' ? (
          <article
            data-template="LGU"
            data-print-report="true"
            data-testid="relief-report-preview"
            aria-label="Relief Distribution Report"
            className="relief-report-print report-print-root space-y-6 rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm sm:p-9"
          >
            <header className="relief-print-header border-b-2 border-slate-900 pb-4 text-center">
              <div className="flex items-center justify-center gap-3">
                <img src="/san-policarpo-logo.png" alt="Municipality of San Policarpo seal" className="h-14 w-14 object-contain" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]">Republic of the Philippines</p>
                  <p className="font-bold">Municipality of San Policarpo</p>
                  <p className="text-sm">Community Resource Mapping System</p>
                </div>
              </div>
              <h2 className="mt-4 text-xl font-bold uppercase tracking-wide">
                Relief Distribution Report
              </h2>
              <p className="mt-1 text-sm">
                Period: {dateText(report.from)} — {dateText(report.to)}
              </p>
              <p className="text-xs text-slate-500">
                Generated: {dateText(report.generatedAt)} · {isAdmin ? 'Municipal report' : 'Worker accomplishment report'}
              </p>
            </header>

            <section className="relief-keep-together">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">Relief Summary</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                {[
                  ['Records', summary.records],
                  ['Beneficiaries', summary.beneficiaries],
                  ['Approved', summary.approved],
                  ['Pending', summary.pending],
                  ['Rejected', summary.rejected],
                  ['Approved quantity', summary.approvedQuantity],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-1 text-xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Quantity sums approved distribution records only. Units may differ by relief type.
                Pending and rejected records are not counted as approved distributions.
              </p>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
              <div className="min-w-0">
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">Breakdown by Barangay</h3>
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-100"><th>Barangay</th><th>Records</th><th>Approved quantity</th></tr></thead>
                  <tbody>
                    {summary.barangays.length ? summary.barangays.map(([name, data]) => (
                      <tr key={name}><td>{name}</td><td>{data.count}</td><td>{data.quantity}</td></tr>
                    )) : <tr><td colSpan={3}>No matching records</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="min-w-0">
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">Breakdown by Relief Type</h3>
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-100"><th>Relief type</th><th>Records</th><th>Approved quantity</th></tr></thead>
                  <tbody>
                    {summary.reliefTypes.length ? summary.reliefTypes.map(([name, data]) => (
                      <tr key={name}><td>{name}</td><td>{data.count}</td><td>{data.quantity}</td></tr>
                    )) : <tr><td colSpan={3}>No matching records</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wide">
                Distribution Details ({rows.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th>Date</th>
                      <th>Beneficiary</th>
                      <th>Barangay</th>
                      <th>Vulnerability</th>
                      <th>Relief type</th>
                      <th>Goods / Assistance</th>
                      <th>Quantity</th>
                      <th>Worker</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? rows.map((row) => (
                      <tr key={row.id}>
                        <td>{dateText(row.distributionDate)}</td>
                        <td>{fullName(row)}</td>
                        <td>{barangayOf(row)}</td>
                        <td>{specificSectors(row).map(vulnerabilityLabel).join(', ')}</td>
                        <td>{row.distributionType}</td>
                        <td>{row.itemsProvided}</td>
                        <td>{row.quantity}</td>
                        <td>{row.worker?.name || '—'}</td>
                        <td>{row.status}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={9} className="py-5 text-center">No relief distributions match these filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="relief-keep-together grid grid-cols-2 gap-12 pt-8 text-center text-sm">
              <div>
                <p className="mb-10 text-xs text-slate-500">Prepared by</p>
                <p className="border-t border-slate-900 pt-2 font-semibold">{preparedName || '____________________'}</p>
                <p className="text-xs text-slate-500">{isAdmin ? 'CRMS Administrator' : 'Field Worker'}</p>
              </div>
              <div>
                <p className="mb-10 text-xs text-slate-500">Reviewed / Approved by</p>
                <p className="border-t border-slate-900 pt-2 font-semibold">{approvedName || '____________________'}</p>
                <p className="text-xs text-slate-500">Municipal Mayor / MSWDO Head</p>
              </div>
            </section>
          </article>
          ) : (
            <AdditionalReliefPrintTemplate
              template={reportTemplate}
              rows={rows}
              from={report.from}
              to={report.to}
              generatedAt={report.generatedAt}
              context={{
                ...rdsInfo,
                preparedBy: preparedName,
                reviewedBy: approvedName,
                preparedTitle: isAdmin ? 'CRMS Administrator' : 'Field Worker',
              }}
              dependentCounts={dependentCounts}
              quantityUnits={quantityUnits}
            />
          )}
        </>
      )}
    </div>
  )
}
