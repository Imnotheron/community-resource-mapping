'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CalendarDays, FileText, Printer, RefreshCw, Save } from 'lucide-react'
import { toast } from 'sonner'

import { apiFetch, type AuthUser } from '@/lib/api-client'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { WowLoader } from '@/components/ui/wow-loader'
import { SearchableSelect } from '@/components/ui/searchable-select'

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

type ReportTemplateChoice = 'FORMAL' | 'COMPACT' | 'SUMMARY'

type ReportSettings = {
  template: ReportTemplateChoice
  title: string
  preparedName: string
  preparedPosition: string
  approvedName: string
  approvedPosition: string
}

function defaultReportSettings(
  user: AuthUser,
  isAdmin: boolean,
): ReportSettings {
  return {
    template: 'FORMAL',
    title: isAdmin
      ? 'Daily Municipal Operations Report'
      : 'Daily Worker Accomplishment Report',
    preparedName: user.name || '',
    preparedPosition: isAdmin
      ? 'CRMS Administrator'
      : 'Field Worker',
    approvedName: '',
    approvedPosition: isAdmin
      ? 'MSWDO Head / Municipal Mayor'
      : 'Supervisor / MSWDO',
  }
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
  settings,
}: {
  settings: ReportSettings
}) {
  const blocks = [
    {
      label: 'Prepared by',
      name: settings.preparedName,
      position: settings.preparedPosition,
    },
    {
      label: 'Reviewed / Approved by',
      name: settings.approvedName,
      position: settings.approvedPosition,
    },
  ]

  return (
    <section className="report-signatures mt-12 grid grid-cols-2 gap-16 text-center text-sm">
      {blocks.map((item) => (
        <div key={item.label}>
          <p className="mb-10 text-xs text-slate-500">
            {item.label}
          </p>
          <div className="border-t border-slate-900 pt-2">
            <p className="font-semibold uppercase">
              {item.name || '____________________________'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {item.position || 'Position'}
            </p>
          </div>
        </div>
      ))}
    </section>
  )
}

function ReportTable({ children }: { children: ReactNode }) {
  return (
    <div className="report-table-wrap overflow-hidden rounded-xl border border-slate-200">
      {children}
    </div>
  )
}

function AdminReport({
  report,
  settings,
}: {
  report: any
  settings: ReportSettings
}) {
  return (
    <div
      className={`report-document space-y-6 report-template-${settings.template.toLowerCase()}`}
    >
      <ReportHeader
        title={settings.title || 'Daily Municipal Operations Report'}
        date={report.date}
        generatedAt={report.generatedAt}
      />

      <section className="report-section">
        <h2 className="report-section-title mb-3 text-sm font-bold uppercase tracking-wide">
          Executive Summary
        </h2>
        <div className="report-summary-grid grid grid-cols-2 gap-3 md:grid-cols-4">
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

      {settings.template !== 'SUMMARY' && (
      <section className="report-section">
        <h2 className="report-section-title mb-3 text-sm font-bold uppercase tracking-wide">
          Detailed Vulnerable Citizen Records
        </h2>
        <ReportTable>
          <table className="report-table w-full text-left text-[0.6875rem]">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-2 py-2">Citizen</th>
                <th className="px-2 py-2">Barangay / Address</th>
                <th className="px-2 py-2">Contact</th>
                <th className="px-2 py-2">Vulnerability</th>
                <th className="px-2 py-2">Assistance</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(report.citizenRecords || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    No vulnerable citizen records match the selected filters.
                  </td>
                </tr>
              ) : (
                report.citizenRecords.map((item: any) => {
                  let vulnerabilities: string[] = []
                  try {
                    const parsed = JSON.parse(item.vulnerabilityTypes || '[]')
                    vulnerabilities = Array.isArray(parsed) ? parsed : []
                  } catch {
                    vulnerabilities = String(item.vulnerabilityTypes || '')
                      .split(/[,;|]/)
                      .map((value) => value.trim())
                      .filter(Boolean)
                  }

                  return (
                    <tr key={item.id} className="border-t border-slate-200 align-top">
                      <td className="px-2 py-2 font-medium">
                        {[item.firstName, item.middleName, item.lastName, item.suffix]
                          .filter(Boolean)
                          .join(' ')}
                      </td>
                      <td className="px-2 py-2">
                        <div>{item.barangay || '—'}</div>
                        <div className="text-slate-500">
                          {[item.houseNumber, item.street, item.municipality, item.province]
                            .filter(Boolean)
                            .join(', ') || '—'}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div>{item.mobileNumber || '—'}</div>
                        <div className="text-slate-500">{item.emailAddress || '—'}</div>
                      </td>
                      <td className="px-2 py-2">
                        {vulnerabilities.length
                          ? vulnerabilities.map((value) => String(value).replace(/_/g, ' ')).join(', ')
                          : '—'}
                      </td>
                      <td className="px-2 py-2">
                        {item.needsAssistance
                          ? item.assistanceType || 'Needs assistance'
                          : 'No active assistance flag'}
                      </td>
                      <td className="px-2 py-2">{item.registrationStatus}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </ReportTable>
      </section>
      )}

      {settings.template !== 'SUMMARY' && (
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
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
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
      )}

      {settings.template !== 'SUMMARY' && (
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
                  <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
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
      )}

      <section className="report-section">
        <h2 className="report-section-title mb-3 text-sm font-bold uppercase tracking-wide">
          Barangay Summary (Counts)
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

      <SignatureBlock settings={settings} />
    </div>
  )
}

function WorkerReport({
  report,
  settings,
}: {
  report: any
  settings: ReportSettings
}) {
  return (
    <div
      className={`report-document space-y-6 report-template-${settings.template.toLowerCase()}`}
    >
      <ReportHeader
        title={settings.title || 'Daily Worker Accomplishment Report'}
        date={report.date}
        generatedAt={report.generatedAt}
      />

      <section className="report-worker-info rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <p>
          <strong>Worker:</strong> {report.worker.name}
        </p>
        <p>
          <strong>Email:</strong> {report.worker.email || '—'}
        </p>
      </section>

      <section className="report-section">
        <h2 className="report-section-title mb-3 text-sm font-bold uppercase tracking-wide">
          Daily Summary
        </h2>
        <div className="report-summary-grid grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Distributions" value={report.summary.distributionsRecorded} />
          <Metric label="Approved" value={report.summary.approvedDistributions} />
          <Metric label="Pending" value={report.summary.pendingDistributions} />
          <Metric label="Rejected" value={report.summary.rejectedDistributions} />
          <Metric label="Total Quantity" value={report.summary.totalQuantity} />
          <Metric label="Field Notes" value={report.summary.fieldNotesCreated} />
          <Metric label="Assigned Households" value={report.summary.assignedHouseholds} />
        </div>
      </section>

      {settings.template !== 'SUMMARY' && (
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
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
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
                      {item.vulnerableProfile?.barangay || item.household?.barangay || '—'}
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
      )}

      {settings.template !== 'SUMMARY' && (
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
      )}

      <SignatureBlock settings={settings} />
    </div>
  )
}


function distributionSectorValues(distribution: any) {
  const sectors = formatVulnerabilityTypes(
    distribution?.vulnerableProfile?.vulnerabilityTypes,
  )
  return sectors.length ? sectors : ['OTHER']
}

function distributionBeneficiaryName(distribution: any) {
  if (distribution?.vulnerableProfile) {
    return [
      distribution.vulnerableProfile.lastName,
      distribution.vulnerableProfile.firstName,
    ]
      .filter(Boolean)
      .join(' ')
  }

  return distribution?.household?.headOfHousehold || ''
}

function distributionBarangay(distribution: any) {
  return (
    distribution?.vulnerableProfile?.barangay ||
    distribution?.household?.barangay ||
    ''
  )
}

type ReliefFacet =
  | 'status'
  | 'reliefGeneral'
  | 'reliefType'
  | 'vulnerabilityGeneral'
  | 'sector'

function matchesReliefFilters(
  distribution: any,
  filters: {
    status: string
    reliefGeneral: string
    reliefType: string
    vulnerabilityGeneral: string
    sector: string
  },
  omit?: ReliefFacet,
) {
  if (
    omit !== 'status' &&
    filters.status !== 'ALL' &&
    distribution.status !== filters.status
  ) {
    return false
  }

  if (
    omit !== 'reliefGeneral' &&
    filters.reliefGeneral !== 'ALL' &&
    reliefGeneralCategory(distribution) !== filters.reliefGeneral
  ) {
    return false
  }

  if (
    omit !== 'reliefType' &&
    filters.reliefType !== 'ALL' &&
    String(distribution.distributionType || '') !== filters.reliefType
  ) {
    return false
  }

  if (
    omit !== 'vulnerabilityGeneral' &&
    filters.vulnerabilityGeneral !== 'ALL' &&
    !vulnerabilityGeneralGroups(distribution?.vulnerableProfile).includes(
      filters.vulnerabilityGeneral,
    )
  ) {
    return false
  }

  if (
    omit !== 'sector' &&
    filters.sector !== 'ALL' &&
    !distributionSectorValues(distribution).includes(filters.sector)
  ) {
    return false
  }

  return true
}

export function DailyReportsView({ user }: { user: AuthUser }) {
  const isAdmin = String(user.role).toUpperCase() === 'ADMIN'
  const [date, setDate] = useState(todayInputValue())
  const [barangay, setBarangay] = useState('ALL')
  const [workerId, setWorkerId] = useState('ALL')
  const [personId, setPersonId] = useState('ALL')
  const [lastName, setLastName] = useState('ALL')
  const [reliefStatusFilter, setReliefStatusFilter] = useState('ALL')
  const [reliefCategoryFilter, setReliefCategoryFilter] = useState('ALL')
  const [reliefTypeFilter, setReliefTypeFilter] = useState('ALL')
  const [vulnerabilityGroupFilter, setVulnerabilityGroupFilter] =
    useState('ALL')
  const [sectorFilter, setSectorFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('DATE_DESC')
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [savingReportSettings, setSavingReportSettings] =
    useState(false)
  const [reportSettings, setReportSettings] =
    useState<ReportSettings>(() =>
      defaultReportSettings(user, isAdmin),
    )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams({ date })
      if (barangay !== 'ALL') query.set('barangay', barangay)
      if (personId !== 'ALL') query.set('personId', personId)
      if (lastName !== 'ALL') query.set('lastName', lastName)

      if (isAdmin) {
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
  }, [barangay, date, isAdmin, lastName, personId, user.id, workerId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let active = true

    apiFetch<{ user?: { reportSettings?: Partial<ReportSettings> } }>(
      '/api/user/settings',
      { useUserHeader: true },
    )
      .then((data) => {
        if (!active) return
        const saved = data.user?.reportSettings
        if (!saved) return

        setReportSettings((current) => ({
          ...current,
          ...saved,
          template:
            saved.template === 'FORMAL' ||
            saved.template === 'COMPACT' ||
            saved.template === 'SUMMARY'
              ? saved.template
              : current.template,
        }))
      })
      .catch(() => {
        // Report settings are optional. Defaults keep reporting usable.
      })

    return () => {
      active = false
    }
  }, [])

  async function saveReportSettings() {
    setSavingReportSettings(true)
    try {
      await apiFetch('/api/user/settings', {
        method: 'PUT',
        useUserHeader: true,
        body: JSON.stringify({
          reportSettings,
        }),
      })
      toast.success('Report settings saved')
    } catch (error: any) {
      toast.error('Failed to save report settings', {
        description: error.message,
      })
    } finally {
      setSavingReportSettings(false)
    }
  }

  const barangays = useMemo(() => report?.barangays || [], [report])
  const people = useMemo(() => report?.people || [], [report])

  const lastNames = useMemo(
    () =>
      Array.from(
        new Set(
          people
            .filter((person: any) => barangay === 'ALL' || person.barangay === barangay)
            .map((person: any) => String(person.lastName || '').trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => String(a).localeCompare(String(b))),
    [barangay, people],
  )

  const peopleForSelection = useMemo(
    () =>
      people
        .filter((person: any) => barangay === 'ALL' || person.barangay === barangay)
        .filter((person: any) => lastName === 'ALL' || person.lastName === lastName)
        .sort((a: any, b: any) =>
          `${a.lastName || ''} ${a.firstName || ''}`.localeCompare(
            `${b.lastName || ''} ${b.firstName || ''}`,
          ),
        ),
    [barangay, lastName, people],
  )

  useEffect(() => {
    if (
      personId !== 'ALL' &&
      !peopleForSelection.some((person: any) => person.id === personId)
    ) {
      setPersonId('ALL')
    }
  }, [peopleForSelection, personId])

  useEffect(() => {
    if (lastName !== 'ALL' && !lastNames.includes(lastName)) {
      setLastName('ALL')
    }
  }, [lastName, lastNames])


  const baseDistributions = report?.distributions || []
  const activeReliefFilters = {
    status: reliefStatusFilter,
    reliefGeneral: reliefCategoryFilter,
    reliefType: reliefTypeFilter,
    vulnerabilityGeneral: vulnerabilityGroupFilter,
    sector: sectorFilter,
  }

  const recordsForReliefFacet = (facet: ReliefFacet) =>
    baseDistributions.filter((distribution: any) =>
      matchesReliefFilters(distribution, activeReliefFilters, facet),
    )

  const reliefStatusOptions = Array.from(
    new Set(
      recordsForReliefFacet('status')
        .map((item: any) => String(item.status || '').trim())
        .filter(Boolean),
    ),
  ).sort()

  const reliefCategories = Array.from(
    new Set(
      recordsForReliefFacet('reliefGeneral').map((item: any) =>
        reliefGeneralCategory(item),
      ),
    ),
  ).sort((a, b) =>
    (RELIEF_GENERAL_LABELS[a] || a).localeCompare(
      RELIEF_GENERAL_LABELS[b] || b,
    ),
  )

  const reliefTypes = Array.from(
    new Set(
      recordsForReliefFacet('reliefType')
        .map((item: any) => String(item.distributionType || '').trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b))

  const vulnerabilityGroups = Array.from(
    new Set(
      recordsForReliefFacet('vulnerabilityGeneral').flatMap((item: any) =>
        vulnerabilityGeneralGroups(item?.vulnerableProfile),
      ),
    ),
  ).sort((a, b) =>
    (VULNERABILITY_GENERAL_LABELS[a] || a).localeCompare(
      VULNERABILITY_GENERAL_LABELS[b] || b,
    ),
  )

  const distributionSectors = Array.from(
    new Set(
      recordsForReliefFacet('sector').flatMap((item: any) =>
        distributionSectorValues(item),
      ),
    ),
  ).sort((a, b) =>
    vulnerabilityLabel(a).localeCompare(vulnerabilityLabel(b)),
  )

  const reliefStatusOptionsKey = reliefStatusOptions.join('|')
  const reliefCategoriesKey = reliefCategories.join('|')
  const reliefTypesKey = reliefTypes.join('|')
  const vulnerabilityGroupsKey = vulnerabilityGroups.join('|')
  const distributionSectorsKey = distributionSectors.join('|')

  useEffect(() => {
    if (
      reliefStatusFilter !== 'ALL' &&
      !reliefStatusOptions.includes(reliefStatusFilter)
    ) {
      setReliefStatusFilter('ALL')
    }
  }, [reliefStatusFilter, reliefStatusOptionsKey])

  useEffect(() => {
    if (
      reliefCategoryFilter !== 'ALL' &&
      !reliefCategories.includes(reliefCategoryFilter)
    ) {
      setReliefCategoryFilter('ALL')
    }
  }, [reliefCategoryFilter, reliefCategoriesKey])

  useEffect(() => {
    if (
      reliefTypeFilter !== 'ALL' &&
      !reliefTypes.includes(reliefTypeFilter)
    ) {
      setReliefTypeFilter('ALL')
    }
  }, [reliefTypeFilter, reliefTypesKey])

  useEffect(() => {
    if (
      vulnerabilityGroupFilter !== 'ALL' &&
      !vulnerabilityGroups.includes(vulnerabilityGroupFilter)
    ) {
      setVulnerabilityGroupFilter('ALL')
    }
  }, [vulnerabilityGroupFilter, vulnerabilityGroupsKey])

  useEffect(() => {
    if (
      sectorFilter !== 'ALL' &&
      !distributionSectors.includes(sectorFilter)
    ) {
      setSectorFilter('ALL')
    }
  }, [sectorFilter, distributionSectorsKey])

  const displayReport = useMemo(() => {
    if (!report) return report

    const filteredDistributions = (report.distributions || [])
      .filter((distribution: any) =>
        matchesReliefFilters(distribution, {
          status: reliefStatusFilter,
          reliefGeneral: reliefCategoryFilter,
          reliefType: reliefTypeFilter,
          vulnerabilityGeneral: vulnerabilityGroupFilter,
          sector: sectorFilter,
        }),
      )
      .sort((a: any, b: any) => {
        if (sortBy === 'RELIEF_GENERAL') {
          return String(
            RELIEF_GENERAL_LABELS[reliefGeneralCategory(a)] || '',
          ).localeCompare(
            String(RELIEF_GENERAL_LABELS[reliefGeneralCategory(b)] || ''),
          )
        }

        if (sortBy === 'TYPE') {
          return String(a.distributionType || '').localeCompare(
            String(b.distributionType || ''),
          )
        }

        if (sortBy === 'BARANGAY') {
          return distributionBarangay(a).localeCompare(distributionBarangay(b))
        }

        if (sortBy === 'VULNERABILITY_GENERAL') {
          const aGroup =
            VULNERABILITY_GENERAL_LABELS[
              vulnerabilityGeneralGroups(a.vulnerableProfile)[0]
            ] || ''
          const bGroup =
            VULNERABILITY_GENERAL_LABELS[
              vulnerabilityGeneralGroups(b.vulnerableProfile)[0]
            ] || ''
          return aGroup.localeCompare(bGroup)
        }

        if (sortBy === 'SECTOR') {
          return vulnerabilityLabel(distributionSectorValues(a)[0]).localeCompare(
            vulnerabilityLabel(distributionSectorValues(b)[0]),
          )
        }

        if (sortBy === 'LAST_NAME') {
          return distributionBeneficiaryName(a).localeCompare(
            distributionBeneficiaryName(b),
          )
        }

        if (sortBy === 'WORKER') {
          return String(a.worker?.name || '').localeCompare(
            String(b.worker?.name || ''),
          )
        }

        if (sortBy === 'STATUS') {
          return String(a.status || '').localeCompare(String(b.status || ''))
        }

        const aDate = new Date(a.distributionDate || a.createdAt || 0).getTime()
        const bDate = new Date(b.distributionDate || b.createdAt || 0).getTime()

        if (sortBy === 'DATE_ASC') return aDate - bDate
        return bDate - aDate
      })

    const sortOtherRecords = (items: any[]) =>
      [...(items || [])].sort((a, b) => {
        if (sortBy === 'BARANGAY') {
          const compared = String(a.barangay || '').localeCompare(
            String(b.barangay || ''),
          )
          if (compared !== 0) return compared
        }

        return String(a.lastName || '').localeCompare(String(b.lastName || ''))
      })

    const approvedDistributions = filteredDistributions.filter(
      (item: any) => item.status === 'APPROVED',
    ).length
    const pendingDistributions = filteredDistributions.filter(
      (item: any) => item.status === 'PENDING',
    ).length
    const rejectedDistributions = filteredDistributions.filter(
      (item: any) => item.status === 'REJECTED',
    ).length
    const totalQuantity = filteredDistributions.reduce(
      (sum: number, item: any) => sum + Number(item.quantity || 0),
      0,
    )

    const filteredBarangayCounts = new Map<string, number>()
    for (const item of filteredDistributions) {
      const key = distributionBarangay(item) || 'Unspecified'
      filteredBarangayCounts.set(
        key,
        (filteredBarangayCounts.get(key) || 0) + 1,
      )
    }

    return {
      ...report,
      summary: {
        ...report.summary,
        distributionsRecorded: filteredDistributions.length,
        approvedDistributions,
        pendingDistributions,
        rejectedDistributions,
        totalQuantity,
      },
      citizenRecords: sortOtherRecords(report.citizenRecords || []),
      registrations: sortOtherRecords(report.registrations || []),
      distributions: filteredDistributions,
      barangaySummary: (report.barangaySummary || []).map((item: any) => ({
        ...item,
        distributions: filteredBarangayCounts.get(item.name) || 0,
      })),
    }
  }, [
    reliefCategoryFilter,
    reliefStatusFilter,
    reliefTypeFilter,
    report,
    sectorFilter,
    sortBy,
    vulnerabilityGroupFilter,
  ])

  return (
    <div className="daily-reports-screen space-y-5 animate-fade-in">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          html,
          body {
            width: auto !important;
            min-width: 0 !important;
            height: auto !important;
            min-height: 0 !important;
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

          aside,
          footer,
          nav,
          header:not(.report-document-header),
          button,
          .no-print,
          .crms-dashboard-theme .md\\:hidden,
          [data-walkthrough-overlay="true"],
          [data-registration-form-controls="true"] {
            display: none !important;
          }

          .crms-dashboard-theme {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          .crms-dashboard-theme > div,
          .crms-dashboard-theme > div > div {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          main {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          main > div {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            opacity: 1 !important;
            filter: none !important;
            transform: none !important;
          }

          .daily-reports-screen {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .report-print-root {
            position: static !important;
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
            opacity: 1 !important;
            filter: none !important;
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
            display: block !important;
            margin: 0 0 6mm !important;
            padding: 0 0 4mm !important;
            border-bottom: 1.2pt solid #0f172a !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .report-government-heading {
            display: flex !important;
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
            display: block !important;
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
            display: table !important;
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
            display: table-row !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .report-table th,
          .report-table td {
            display: table-cell !important;
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

          .report-template-compact {
            font-size: 8.5pt !important;
            line-height: 1.25 !important;
          }

          .report-template-compact .report-section {
            margin-bottom: 3mm !important;
          }

          .report-template-compact .report-metric {
            min-height: 15mm !important;
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
            Generate a date-based report, verify the figures, then print it on A4 paper.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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

      <Card
        data-report-template-settings="true"
        className="no-print border-slate-200"
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-emerald-600" />
            Report Template & Signatories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select
                value={reportSettings.template}
                onValueChange={(value) =>
                  setReportSettings((current) => ({
                    ...current,
                    template:
                      value as ReportTemplateChoice,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FORMAL">
                    Formal — full detail
                  </SelectItem>
                  <SelectItem value="COMPACT">
                    Compact — full detail, tighter layout
                  </SelectItem>
                  <SelectItem value="SUMMARY">
                    Summary — key totals and summaries
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-1 xl:col-span-2">
              <Label htmlFor="report-custom-title">
                Report title
              </Label>
              <Input
                id="report-custom-title"
                value={reportSettings.title}
                onChange={(event) =>
                  setReportSettings((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                maxLength={140}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold">
                Prepared by
              </p>
              <div className="mt-3 grid gap-3">
                <Input
                  value={reportSettings.preparedName}
                  onChange={(event) =>
                    setReportSettings((current) => ({
                      ...current,
                      preparedName: event.target.value,
                    }))
                  }
                  placeholder="Name"
                  maxLength={120}
                />
                <Input
                  value={reportSettings.preparedPosition}
                  onChange={(event) =>
                    setReportSettings((current) => ({
                      ...current,
                      preparedPosition: event.target.value,
                    }))
                  }
                  placeholder="Position"
                  maxLength={120}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold">
                Reviewed / Approved by
              </p>
              <div className="mt-3 grid gap-3">
                <Input
                  value={reportSettings.approvedName}
                  onChange={(event) =>
                    setReportSettings((current) => ({
                      ...current,
                      approvedName: event.target.value,
                    }))
                  }
                  placeholder="Mayor / MSWDO head name"
                  maxLength={120}
                />
                <Input
                  value={reportSettings.approvedPosition}
                  onChange={(event) =>
                    setReportSettings((current) => ({
                      ...current,
                      approvedPosition: event.target.value,
                    }))
                  }
                  placeholder="Position"
                  maxLength={120}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => void saveReportSettings()}
              disabled={savingReportSettings}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {savingReportSettings
                ? 'Saving…'
                : 'Save report settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="no-print border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="report-date">Report date</Label>
            <Input
              id="report-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          <>
            <div className="space-y-2">
              <Label>Barangay</Label>
              <SearchableSelect
                value={barangay}
                onValueChange={setBarangay}
                placeholder="All barangays"
                searchPlaceholder="Type a barangay..."
                options={[
                  {
                    value: 'ALL',
                    label: 'All barangays',
                  },
                  ...barangays.map(
                    (name: string) => ({
                      value: name,
                      label: name,
                    }),
                  ),
                ]}
              />
            </div>

            <div className="space-y-2">
              <Label>Last name</Label>
              <SearchableSelect
                value={lastName}
                onValueChange={setLastName}
                placeholder="All last names"
                searchPlaceholder="Type a last name..."
                options={[
                  {
                    value: 'ALL',
                    label: 'All last names',
                  },
                  ...lastNames.map(
                    (name: string) => ({
                      value: name,
                      label: name,
                    }),
                  ),
                ]}
              />
            </div>

            <div className="space-y-2">
              <Label>Person</Label>
              <SearchableSelect
                value={personId}
                onValueChange={setPersonId}
                placeholder="All people"
                searchPlaceholder="Type a person's name..."
                options={[
                  {
                    value: 'ALL',
                    label: 'All people',
                  },
                  ...peopleForSelection.map(
                    (person: any) => ({
                      value: person.id,
                      label:
                        `${person.lastName}, ${person.firstName}${person.barangay ? ' — ' + person.barangay : ''}`,
                      keywords:
                        [
                          person.firstName,
                          person.lastName,
                          person.barangay,
                        ]
                          .filter(Boolean)
                          .join(' '),
                    }),
                  ),
                ]}
              />
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <Label>Worker</Label>
                <SearchableSelect
                  value={workerId}
                  onValueChange={setWorkerId}
                  placeholder="All workers"
                  searchPlaceholder="Type a worker's name..."
                  options={[
                    {
                      value: 'ALL',
                      label: 'All workers',
                    },
                    ...(report?.workers || []).map(
                      (worker: any) => ({
                        value: worker.id,
                        label: worker.name,
                      }),
                    ),
                  ]}
                />
              </div>
            )}
          </>


            <div className="space-y-2">
              <Label>Relief status</Label>
              <Select
                value={reliefStatusFilter}
                onValueChange={setReliefStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {['PENDING', 'APPROVED', 'REJECTED']
                    .filter((status) => reliefStatusOptions.includes(status))
                    .map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0) + status.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>General relief type</Label>
              <Select
                value={reliefCategoryFilter}
                onValueChange={setReliefCategoryFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All general relief" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All general relief</SelectItem>
                  {reliefCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {RELIEF_GENERAL_LABELS[category] || category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Specific relief type</Label>
              <SearchableSelect
                value={reliefTypeFilter}
                onValueChange={setReliefTypeFilter}
                placeholder="All specific relief types"
                searchPlaceholder="Search relief type..."
                options={[
                  { value: 'ALL', label: 'All specific relief types' },
                  ...reliefTypes.map((type) => ({
                    value: type,
                    label: type,
                    keywords: type,
                  })),
                ]}
              />
            </div>

            <div className="space-y-2">
              <Label>General vulnerability</Label>
              <Select
                value={vulnerabilityGroupFilter}
                onValueChange={setVulnerabilityGroupFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All general vulnerabilities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All general vulnerabilities</SelectItem>
                  {vulnerabilityGroups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {VULNERABILITY_GENERAL_LABELS[group] || group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Specific vulnerability</Label>
              <SearchableSelect
                value={sectorFilter}
                onValueChange={setSectorFilter}
                placeholder="All specific vulnerabilities"
                searchPlaceholder="Search vulnerability..."
                options={[
                  { value: 'ALL', label: 'All specific vulnerabilities' },
                  ...distributionSectors.map((sector) => ({
                    value: sector,
                    label: vulnerabilityLabel(sector),
                    keywords: sector,
                  })),
                ]}
              />
            </div>

          <div className="space-y-2">
            <Label>Sort printed lists by</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DATE_DESC">Newest first</SelectItem>
                <SelectItem value="DATE_ASC">Oldest first</SelectItem>
                <SelectItem value="RELIEF_GENERAL">General relief type</SelectItem>
                <SelectItem value="TYPE">Specific relief type</SelectItem>
                <SelectItem value="BARANGAY">Barangay</SelectItem>
                <SelectItem value="VULNERABILITY_GENERAL">General vulnerability</SelectItem>
                <SelectItem value="SECTOR">Specific vulnerability</SelectItem>
                <SelectItem value="LAST_NAME">Beneficiary name</SelectItem>
                {isAdmin ? <SelectItem value="WORKER">Worker</SelectItem> : null}
                <SelectItem value="STATUS">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
            <p className="mt-3 text-sm text-slate-500">No report data is available.</p>
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
            <AdminReport
              report={displayReport}
              settings={reportSettings}
            />
          ) : (
            <WorkerReport
              report={displayReport}
              settings={reportSettings}
            />
          )}
        </div>
      )}
    </div>
  )
}
