'use client'

import {
  Check,
  ClipboardCheck,
  Filter,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch, type AuthUser } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type TabName = 'registrations' | 'distributions'
type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
type ActionName = 'APPROVE' | 'REJECT'
type RecordType = 'REGISTRATION' | 'DISTRIBUTION'

type Registration = {
  id: string
  firstName: string
  middleName?: string | null
  lastName: string
  suffix?: string | null
  mobileNumber: string
  emailAddress: string
  barangay: string
  municipality: string
  province: string
  vulnerabilityTypes: string
  registrationStatus: string
  rejectionReason?: string | null
  createdAt: string
}

type Distribution = {
  id: string
  distributionDate: string
  distributionType: string
  itemsProvided: string
  quantity: number
  notes?: string | null
  status: string
  rejectionReason?: string | null
  createdAt: string
  worker: { id: string; name: string; email: string }
  vulnerableProfile?: {
    id: string
    firstName: string
    middleName?: string | null
    lastName: string
    suffix?: string | null
    barangay: string
    municipality: string
    province: string
    mobileNumber: string
  } | null
  household?: {
    id: string
    address: string
    barangay: string
    headOfHousehold?: string | null
  } | null
}

type ResponseData = {
  success: boolean
  generatedAt: string
  registrations: Registration[]
  distributions: Distribution[]
}

type PendingAction = {
  type: RecordType
  action: ActionName
  ids: string[]
}

type PrintPayload =
  | { type: 'REGISTRATION'; title: string; category: string; rows: Registration[] }
  | { type: 'DISTRIBUTION'; title: string; category: string; rows: Distribution[] }

const ALL = 'ALL'

function status(value: unknown) {
  return String(value || '').trim().toUpperCase()
}

function fullName(record: {
  firstName: string
  middleName?: string | null
  lastName: string
  suffix?: string | null
}) {
  return [record.firstName, record.middleName, record.lastName, record.suffix]
    .filter(Boolean)
    .join(' ')
}

function vulnerabilityTypes(value: string | null | undefined) {
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.map(String).map((entry) => entry.trim()).filter(Boolean)
    }
  } catch {}

  return value.split(',').map((entry) => entry.trim()).filter(Boolean)
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => String(value || '').trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b))
}

function beneficiary(record: Distribution) {
  return record.vulnerableProfile
    ? fullName(record.vulnerableProfile)
    : record.household?.headOfHousehold || 'Household beneficiary'
}

function barangayOfDistribution(record: Distribution) {
  return record.vulnerableProfile?.barangay || record.household?.barangay || 'Unspecified'
}

function date(value: string | null | undefined) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'

  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(parsed)
}

function dateTime(value: string | null | undefined) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'

  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed)
}

function statusClass(value: string) {
  if (status(value) === 'APPROVED') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (status(value) === 'REJECTED') {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }

  return 'border-amber-200 bg-amber-50 text-amber-700'
}


function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}


function buildPrintHtml(
  payload: PrintPayload,
  adminName: string,
  generatedAt: string,
) {
  const rows =
    payload.type === 'REGISTRATION'
      ? payload.rows
          .map(
            (record, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(fullName(record))}</td>
                <td>
                  ${escapeHtml(record.mobileNumber)}<br />
                  ${escapeHtml(record.emailAddress)}
                </td>
                <td>${escapeHtml(record.barangay)}</td>
                <td>${escapeHtml(
                  vulnerabilityTypes(record.vulnerabilityTypes).join(', ') ||
                    '—',
                )}</td>
                <td>${escapeHtml(date(record.createdAt))}</td>
                <td>${escapeHtml(record.registrationStatus)}</td>
                <td>${escapeHtml(record.rejectionReason || '—')}</td>
              </tr>
            `,
          )
          .join('')
      : payload.rows
          .map(
            (record, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(beneficiary(record))}</td>
                <td>${escapeHtml(barangayOfDistribution(record))}</td>
                <td>${escapeHtml(record.distributionType)}</td>
                <td>
                  ${escapeHtml(record.itemsProvided)}<br />
                  Quantity: ${escapeHtml(record.quantity)}
                </td>
                <td>${escapeHtml(record.worker?.name || '—')}</td>
                <td>${escapeHtml(date(record.distributionDate))}</td>
                <td>
                  ${escapeHtml(record.status)}
                  ${
                    record.rejectionReason
                      ? ` — ${escapeHtml(record.rejectionReason)}`
                      : ''
                  }
                </td>
              </tr>
            `,
          )
          .join('')

  const headers =
    payload.type === 'REGISTRATION'
      ? `
        <th>#</th>
        <th>Citizen</th>
        <th>Contact</th>
        <th>Barangay</th>
        <th>Vulnerability</th>
        <th>Submitted</th>
        <th>Status</th>
        <th>Remarks</th>
      `
      : `
        <th>#</th>
        <th>Beneficiary</th>
        <th>Barangay</th>
        <th>Category</th>
        <th>Items / Quantity</th>
        <th>Worker</th>
        <th>Date</th>
        <th>Status / Remarks</th>
      `

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>​</title>
    <style>
      @page {
        size: A4 landscape;
        margin: 12mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #ffffff;
        color: #0f172a;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11px;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .header {
        border-bottom: 2px solid #0f172a;
        padding-bottom: 14px;
        text-align: center;
      }

      .header p {
        margin: 0;
      }

      .republic {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.15em;
        text-transform: uppercase;
      }

      h1 {
        margin: 5px 0 0;
        font-size: 20px;
      }

      .system-name {
        margin-top: 5px !important;
        font-size: 12px;
        font-weight: 700;
      }

      h2 {
        margin: 18px 0 0;
        font-size: 17px;
        text-transform: uppercase;
      }

      .category {
        margin: 6px auto 0 !important;
        max-width: 950px;
        line-height: 1.5;
      }

      .meta {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin: 16px 0;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        border: 1px solid #94a3b8;
        padding: 6px;
        text-align: left;
        vertical-align: top;
        overflow-wrap: anywhere;
      }

      th {
        background: #e2e8f0;
        font-weight: 700;
      }

      tbody tr:nth-child(even) {
        background: #f8fafc;
      }

      .signatures {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 48px;
        margin-top: 58px;
        break-inside: avoid;
        text-align: center;
      }

      .signature {
        border-top: 1px solid #000000;
        padding-top: 7px;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <header class="header">
      <p class="republic">Republic of the Philippines</p>
      <h1>Municipality of San Policarpo, Eastern Samar</h1>
      <p class="system-name">Community Resource Mapping System</p>
      <h2>${escapeHtml(payload.title)}</h2>
      <p class="category">${escapeHtml(payload.category)}</p>
    </header>

    <section class="meta">
      <div><strong>Generated by:</strong> ${escapeHtml(adminName)}</div>
      <div><strong>Generated:</strong> ${escapeHtml(
        dateTime(generatedAt),
      )}</div>
      <div><strong>Total records:</strong> ${payload.rows.length}</div>
    </section>

    <table>
      <thead>
        <tr>${headers}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <section class="signatures">
      <div class="signature">
        Prepared by<br />
        <strong>${escapeHtml(adminName)}</strong>
      </div>
      <div class="signature">
        Reviewed by<br />
        <strong>Authorized Municipal Officer</strong>
      </div>
      <div class="signature">
        Approved by<br />
        <strong>Municipal Social Welfare Officer</strong>
      </div>
    </section>
  </body>
</html>`
}

function printUsingIframe(
  payload: PrintPayload,
  adminName: string,
  generatedAt: string,
) {
  const oldFrame = document.getElementById(
    'crms-approval-print-frame',
  )

  oldFrame?.remove()

  const frame = document.createElement('iframe')
  frame.id = 'crms-approval-print-frame'
  frame.setAttribute('title', 'Approval Center print document')
  frame.style.position = 'fixed'
  frame.style.right = '0'
  frame.style.bottom = '0'
  frame.style.width = '1px'
  frame.style.height = '1px'
  frame.style.border = '0'
  frame.style.opacity = '0'
  frame.style.pointerEvents = 'none'

  document.body.appendChild(frame)

  const frameWindow = frame.contentWindow
  const frameDocument = frame.contentDocument

  if (!frameWindow || !frameDocument) {
    frame.remove()
    toast.error('Unable to prepare the print document')
    return false
  }

  frameDocument.open()
  frameDocument.write(
    buildPrintHtml(payload, adminName, generatedAt),
  )
  frameDocument.close()

  let printed = false

  const runPrint = () => {
    if (printed) return
    printed = true

    const originalDocumentTitle = document.title
    const blankPrintTitle = '\u200B'

    const restoreDocumentTitle = () => {
      document.title = originalDocumentTitle
      frameWindow.removeEventListener(
        'afterprint',
        restoreDocumentTitle,
      )
      window.removeEventListener(
        'afterprint',
        restoreDocumentTitle,
      )
    }

    try {
      // Chromium may use the top-level page title even when an iframe
      // owns the print document. Blank both titles before opening print.
      document.title = blankPrintTitle
      frameDocument.title = blankPrintTitle

      frameWindow.addEventListener(
        'afterprint',
        restoreDocumentTitle,
        { once: true },
      )
      window.addEventListener(
        'afterprint',
        restoreDocumentTitle,
        { once: true },
      )

      frameWindow.focus()
      frameWindow.print()

      // Fallback for browsers that do not dispatch afterprint reliably.
      window.setTimeout(restoreDocumentTitle, 10_000)
    } catch (error) {
      restoreDocumentTitle()
      console.error('Approval Center print error:', error)
      toast.error('The browser could not open the print dialog')
    }
  }

  frame.onload = runPrint
  frameWindow.addEventListener(
    'afterprint',
    () => frame.remove(),
    { once: true },
  )

  window.setTimeout(runPrint, 250)

  window.setTimeout(() => {
    frame.remove()
  }, 300_000)

  return true
}

export function ApprovalCenter({ admin }: { admin: AuthUser }) {
  const [tab, setTab] = useState<TabName>('registrations')
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [generatedAt, setGeneratedAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING')
  const [barangayFilter, setBarangayFilter] = useState(ALL)
  const [categoryFilter, setCategoryFilter] = useState(ALL)
  const [workerFilter, setWorkerFilter] = useState(ALL)

  const [selectedRegistrations, setSelectedRegistrations] = useState<Set<string>>(new Set())
  const [selectedDistributions, setSelectedDistributions] = useState<Set<string>>(new Set())

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [reason, setReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const data = await apiFetch<ResponseData>('/api/admin/approval-center', {
        method: 'GET',
        useUserHeader: true,
        cache: 'no-store',
      })

      setRegistrations(data.registrations || [])
      setDistributions(data.distributions || [])
      setGeneratedAt(data.generatedAt || new Date().toISOString())
    } catch (error: any) {
      toast.error('Failed to load Approval Center', {
        description: error?.message || 'Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])


  const registrationBarangays = useMemo(
    () => unique(registrations.map((record) => record.barangay)),
    [registrations],
  )

  const registrationCategories = useMemo(
    () => unique(registrations.flatMap((record) => vulnerabilityTypes(record.vulnerabilityTypes))),
    [registrations],
  )

  const distributionBarangays = useMemo(
    () => unique(distributions.map(barangayOfDistribution)),
    [distributions],
  )

  const distributionCategories = useMemo(
    () => unique(distributions.map((record) => record.distributionType)),
    [distributions],
  )

  const workers = useMemo(
    () => unique(distributions.map((record) => record.worker?.name)),
    [distributions],
  )

  const filteredRegistrations = useMemo(() => {
    const search = query.trim().toLowerCase()

    return registrations.filter((record) => {
      const categories = vulnerabilityTypes(record.vulnerabilityTypes)
      const searchable = [
        fullName(record),
        record.emailAddress,
        record.mobileNumber,
        record.barangay,
        record.municipality,
        record.province,
        ...categories,
      ]
        .join(' ')
        .toLowerCase()

      return (
        (!search || searchable.includes(search)) &&
        (statusFilter === ALL || status(record.registrationStatus) === statusFilter) &&
        (barangayFilter === ALL || record.barangay === barangayFilter) &&
        (categoryFilter === ALL || categories.includes(categoryFilter))
      )
    })
  }, [barangayFilter, categoryFilter, query, registrations, statusFilter])

  const filteredDistributions = useMemo(() => {
    const search = query.trim().toLowerCase()

    return distributions.filter((record) => {
      const searchable = [
        beneficiary(record),
        record.worker?.name,
        record.distributionType,
        record.itemsProvided,
        barangayOfDistribution(record),
        record.notes,
      ]
        .join(' ')
        .toLowerCase()

      return (
        (!search || searchable.includes(search)) &&
        (statusFilter === ALL || status(record.status) === statusFilter) &&
        (barangayFilter === ALL || barangayOfDistribution(record) === barangayFilter) &&
        (categoryFilter === ALL || record.distributionType === categoryFilter) &&
        (workerFilter === ALL || record.worker?.name === workerFilter)
      )
    })
  }, [
    barangayFilter,
    categoryFilter,
    distributions,
    query,
    statusFilter,
    workerFilter,
  ])

  const selected = tab === 'registrations' ? selectedRegistrations : selectedDistributions
  const visibleIds =
    tab === 'registrations'
      ? filteredRegistrations.map((record) => record.id)
      : filteredDistributions.map((record) => record.id)

  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))
  const partlySelected = visibleIds.some((id) => selected.has(id)) && !allVisibleSelected

  const actionableIds = useMemo(() => {
    if (tab === 'registrations') {
      return registrations
        .filter(
          (record) =>
            selectedRegistrations.has(record.id) &&
            status(record.registrationStatus) === 'PENDING',
        )
        .map((record) => record.id)
    }

    return distributions
      .filter(
        (record) =>
          selectedDistributions.has(record.id) && status(record.status) === 'PENDING',
      )
      .map((record) => record.id)
  }, [
    distributions,
    registrations,
    selectedDistributions,
    selectedRegistrations,
    tab,
  ])

  const counts = useMemo(() => {
    const source: any[] = tab === 'registrations' ? registrations : distributions
    const readStatus = (record: any) =>
      status(tab === 'registrations' ? record.registrationStatus : record.status)

    return {
      total: source.length,
      pending: source.filter((record) => readStatus(record) === 'PENDING').length,
      approved: source.filter((record) => readStatus(record) === 'APPROVED').length,
      rejected: source.filter((record) => readStatus(record) === 'REJECTED').length,
    }
  }, [distributions, registrations, tab])

  function resetFilters(nextTab: TabName) {
    setTab(nextTab)
    setQuery('')
    setStatusFilter('PENDING')
    setBarangayFilter(ALL)
    setCategoryFilter(ALL)
    setWorkerFilter(ALL)
  }

  function toggle(type: TabName, id: string, checked: boolean) {
    const setter =
      type === 'registrations' ? setSelectedRegistrations : setSelectedDistributions

    setter((current) => {
      const next = new Set(current)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }

  function toggleVisible(checked: boolean) {
    const setter =
      tab === 'registrations' ? setSelectedRegistrations : setSelectedDistributions

    setter((current) => {
      const next = new Set(current)

      visibleIds.forEach((id) => {
        checked ? next.add(id) : next.delete(id)
      })

      return next
    })
  }

  function ask(action: ActionName, ids = actionableIds) {
    if (ids.length === 0) {
      toast.error('Select at least one pending record')
      return
    }

    setReason('')
    setPendingAction({
      type: tab === 'registrations' ? 'REGISTRATION' : 'DISTRIBUTION',
      action,
      ids,
    })
  }

  async function confirm() {
    if (!pendingAction) return

    if (pendingAction.action === 'REJECT' && !reason.trim()) {
      toast.error('A rejection reason is required')
      return
    }

    setProcessing(true)

    try {
      const result = await apiFetch<{ success: boolean; message: string }>(
        '/api/admin/approval-center',
        {
          method: 'POST',
          useUserHeader: true,
          body: JSON.stringify({
            ...pendingAction,
            reason: pendingAction.action === 'REJECT' ? reason.trim() : undefined,
          }),
        },
      )

      toast.success(result.message || 'Records updated successfully')
      setPendingAction(null)
      setReason('')

      if (pendingAction.type === 'REGISTRATION') {
        setSelectedRegistrations(new Set())
      } else {
        setSelectedDistributions(new Set())
      }

      await load()
    } catch (error: any) {
      toast.error('Approval action failed', {
        description: error?.message || 'Please try again.',
      })
    } finally {
      setProcessing(false)
    }
  }

  function categoryDescription() {
    const values = [
      `Status: ${statusFilter === ALL ? 'All' : statusFilter}`,
      `Barangay: ${barangayFilter === ALL ? 'All' : barangayFilter}`,
      tab === 'registrations'
        ? `Vulnerability: ${categoryFilter === ALL ? 'All' : categoryFilter}`
        : `Distribution type: ${categoryFilter === ALL ? 'All' : categoryFilter}`,
    ]

    if (tab === 'distributions') {
      values.push(`Worker: ${workerFilter === ALL ? 'All' : workerFilter}`)
    }

    if (query.trim()) values.push(`Search: ${query.trim()}`)
    return values.join(' • ')
  }

  function printRecords(mode: 'SELECTED' | 'FILTERED') {
    let payload: PrintPayload

    if (tab === 'registrations') {
      const rows =
        mode === 'SELECTED'
          ? registrations.filter((record) =>
              selectedRegistrations.has(record.id),
            )
          : filteredRegistrations

      if (!rows.length) {
        toast.error(
          mode === 'SELECTED'
            ? 'Select at least one registration first'
            : 'The current registration category has no records',
        )
        return
      }

      payload = {
        type: 'REGISTRATION',
        title:
          mode === 'SELECTED'
            ? 'Selected Vulnerable Registration Records'
            : 'Categorized Vulnerable Registration Records',
        category:
          mode === 'SELECTED'
            ? `${rows.length} selected record${rows.length === 1 ? '' : 's'}`
            : categoryDescription(),
        rows,
      }
    } else {
      const rows =
        mode === 'SELECTED'
          ? distributions.filter((record) =>
              selectedDistributions.has(record.id),
            )
          : filteredDistributions

      if (!rows.length) {
        toast.error(
          mode === 'SELECTED'
            ? 'Select at least one relief distribution first'
            : 'The current relief category has no records',
        )
        return
      }

      payload = {
        type: 'DISTRIBUTION',
        title:
          mode === 'SELECTED'
            ? 'Selected Relief Distribution Records'
            : 'Categorized Relief Distribution Records',
        category:
          mode === 'SELECTED'
            ? `${rows.length} selected record${rows.length === 1 ? '' : 's'}`
            : categoryDescription(),
        rows,
      }
    }

    const opened = printUsingIframe(
      payload,
      admin.name || 'Administrator',
      generatedAt || new Date().toISOString(),
    )

    if (opened) {
      toast.success('Print dialog opened', {
        description:
          'In More settings, turn off Headers and footers to remove the URL and browser title.',
      })
    }
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          body * { visibility: hidden !important; }
          #approval-center-print, #approval-center-print * {
            visibility: visible !important;
          }
          #approval-center-print {
            display: block !important;
            position: absolute;
            inset: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
          #approval-center-print table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
          }
          #approval-center-print th,
          #approval-center-print td {
            border: 1px solid #94a3b8;
            padding: 5px 6px;
            text-align: left;
            vertical-align: top;
          }
          #approval-center-print th {
            background: #e2e8f0 !important;
            font-weight: 700;
          }
          #approval-center-print .print-signatures { break-inside: avoid; }
        }
      `}</style>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <ClipboardCheck className="h-4 w-4" />
              Administrative workflow
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Approval Center</h1>
            <p className="text-sm text-muted-foreground">
              Categorize, print, approve, and reject registrations and relief records.
            </p>
          </div>

          <div className="relative z-[80] flex flex-wrap gap-2 pointer-events-auto">
            <Button type="button" variant="outline" onClick={() => void load()} disabled={loading} className="pointer-events-auto">
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              className="relative z-[90] pointer-events-auto"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                printRecords('SELECTED')
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Selected
            </Button>
            <Button
              type="button"
              className="relative z-[90] pointer-events-auto"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                printRecords('FILTERED')
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Category
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <CountCard label="All records" value={counts.total} />
          <CountCard label="Pending" value={counts.pending} tone="amber" />
          <CountCard label="Approved" value={counts.approved} tone="emerald" />
          <CountCard label="Rejected" value={counts.rejected} tone="rose" />
          <CountCard label="Selected" value={selected.size} tone="primary" />
        </div>

        <Tabs value={tab} onValueChange={(value) => resetFilters(value as TabName)}>
          <TabsList className="grid w-full max-w-xl grid-cols-2">
            <TabsTrigger value="registrations">
              Registrations ({registrations.length})
            </TabsTrigger>
            <TabsTrigger value="distributions">
              Relief Distributions ({distributions.length})
            </TabsTrigger>
          </TabsList>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4 text-primary" />
                Categories and filters
              </CardTitle>
              <CardDescription>
                Bulk approval and category printing use the visible filtered records.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  'grid gap-3',
                  tab === 'registrations' ? 'md:grid-cols-4' : 'md:grid-cols-5',
                )}
              >
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search..."
                    className="pl-9"
                  />
                </div>

                <FilterSelect
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value as StatusFilter)}
                  allLabel="All statuses"
                  options={['PENDING', 'APPROVED', 'REJECTED']}
                />

                <FilterSelect
                  value={barangayFilter}
                  onChange={setBarangayFilter}
                  allLabel="All barangays"
                  options={tab === 'registrations' ? registrationBarangays : distributionBarangays}
                />

                <FilterSelect
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  allLabel={
                    tab === 'registrations'
                      ? 'All vulnerabilities'
                      : 'All distribution types'
                  }
                  options={
                    tab === 'registrations'
                      ? registrationCategories
                      : distributionCategories
                  }
                />

                {tab === 'distributions' && (
                  <FilterSelect
                    value={workerFilter}
                    onChange={setWorkerFilter}
                    allLabel="All workers"
                    options={workers}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <div className="mt-4 flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              <b>{selected.size}</b> selected • <b>{actionableIds.length}</b> pending
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => ask('APPROVE')}
                disabled={!actionableIds.length || processing}
              >
                <Check className="mr-2 h-4 w-4" />
                Approve Selected
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => ask('REJECT')}
                disabled={!actionableIds.length || processing}
              >
                <X className="mr-2 h-4 w-4" />
                Reject Selected
              </Button>
            </div>
          </div>

          <TabsContent value="registrations" className="mt-4">
            <TableShell
              loading={loading}
              empty={!filteredRegistrations.length}
              message="No registrations match the current categories."
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          allVisibleSelected
                            ? true
                            : partlySelected
                              ? 'indeterminate'
                              : false
                        }
                        onCheckedChange={(checked) => toggleVisible(Boolean(checked))}
                      />
                    </TableHead>
                    <TableHead>Citizen</TableHead>
                    <TableHead>Barangay</TableHead>
                    <TableHead>Vulnerability</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRegistrations.has(record.id)}
                          onCheckedChange={(checked) =>
                            toggle('registrations', record.id, Boolean(checked))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{fullName(record)}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.emailAddress} • {record.mobileNumber}
                        </p>
                      </TableCell>
                      <TableCell>{record.barangay}</TableCell>
                      <TableCell>
                        <div className="flex max-w-xs flex-wrap gap-1">
                          {vulnerabilityTypes(record.vulnerabilityTypes).map((value) => (
                            <Badge key={value} variant="secondary" className="text-[10px]">
                              {value}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{date(record.createdAt)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusClass(record.registrationStatus)}
                        >
                          {record.registrationStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {status(record.registrationStatus) === 'PENDING' && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => ask('APPROVE', [record.id])}>
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => ask('REJECT', [record.id])}>
                              <X className="h-4 w-4 text-rose-600" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableShell>
          </TabsContent>

          <TabsContent value="distributions" className="mt-4">
            <TableShell
              loading={loading}
              empty={!filteredDistributions.length}
              message="No relief distributions match the current categories."
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          allVisibleSelected
                            ? true
                            : partlySelected
                              ? 'indeterminate'
                              : false
                        }
                        onCheckedChange={(checked) => toggleVisible(Boolean(checked))}
                      />
                    </TableHead>
                    <TableHead>Beneficiary</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead>Barangay</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDistributions.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedDistributions.has(record.id)}
                          onCheckedChange={(checked) =>
                            toggle('distributions', record.id, Boolean(checked))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{beneficiary(record)}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.itemsProvided} • Qty {record.quantity}
                        </p>
                      </TableCell>
                      <TableCell>{record.distributionType}</TableCell>
                      <TableCell>{record.worker?.name || '—'}</TableCell>
                      <TableCell>{barangayOfDistribution(record)}</TableCell>
                      <TableCell>{date(record.distributionDate)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusClass(record.status)}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {status(record.status) === 'PENDING' && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => ask('APPROVE', [record.id])}>
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => ask('REJECT', [record.id])}>
                              <X className="h-4 w-4 text-rose-600" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableShell>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open && !processing) {
            setPendingAction(null)
            setReason('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction?.action === 'APPROVE'
                ? 'Approve selected records?'
                : 'Reject selected records?'}
            </DialogTitle>
            <DialogDescription>
              This will update {pendingAction?.ids.length || 0} record(s) and notify
              affected users when contact details are available.
            </DialogDescription>
          </DialogHeader>

          {pendingAction?.action === 'REJECT' && (
            <div className="space-y-2">
              <Label htmlFor="approval-reason">Rejection reason</Label>
              <Textarea
                id="approval-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                placeholder="Explain why these records are being rejected..."
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingAction(null)
                setReason('')
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant={pendingAction?.action === 'REJECT' ? 'destructive' : 'default'}
              onClick={() => void confirm()}
              disabled={processing}
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm {pendingAction?.action === 'APPROVE' ? 'Approval' : 'Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  )
}

function FilterSelect({
  value,
  onChange,
  allLabel,
  options,
}: {
  value: string
  onChange: (value: string) => void
  allLabel: string
  options: string[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function CountCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number
  tone?: 'default' | 'amber' | 'emerald' | 'rose' | 'primary'
}) {
  const toneClass =
    tone === 'amber'
      ? 'border-amber-200 bg-amber-50/70'
      : tone === 'emerald'
        ? 'border-emerald-200 bg-emerald-50/70'
        : tone === 'rose'
          ? 'border-rose-200 bg-rose-50/70'
          : tone === 'primary'
            ? 'border-primary/30 bg-primary/10'
            : ''

  return (
    <Card className={toneClass}>
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}

function TableShell({
  loading,
  empty,
  message,
  children,
}: {
  loading: boolean
  empty: boolean
  message: string
  children: ReactNode
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex min-h-64 items-center justify-center">
          <Loader2 className="mr-3 h-5 w-5 animate-spin text-primary" />
          Loading approval records...
        </CardContent>
      </Card>
    )
  }

  if (empty) {
    return (
      <Card>
        <CardContent className="flex min-h-64 items-center justify-center text-center">
          <div>
            <ClipboardCheck className="mx-auto h-9 w-9 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">{message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return <Card className="overflow-hidden">{children}</Card>
}

