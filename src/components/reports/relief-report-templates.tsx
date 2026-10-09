'use client'

import { formatVulnerabilityTypes, vulnerabilityLabel } from '@/components/dashboards/shared'

export type ReportTemplate = 'LGU' | 'DSWD_RDS' | 'ACCOMPLISHMENT'

export type PrintableReliefDistribution = {
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

export type ReliefPrintContext = {
  region: string
  province: string
  municipality: string
  disasterType: string
  occurrenceDate: string
  evacuationCenter: string
  preparedBy: string
  reviewedBy: string
  preparedTitle: string
}

type Props = {
  template: Exclude<ReportTemplate, 'LGU'>
  rows: PrintableReliefDistribution[]
  from: string
  to: string
  generatedAt: string
  context: ReliefPrintContext
  dependentCounts: Record<string, string>
  quantityUnits: Record<string, string>
}

function formatDay(value: string): string {
  const date = new Date(value.includes('T') ? value : value + 'T12:00:00+08:00')
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function calendarDay(value: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value))
  const get = (type: string) => parts.find((part) => part.type === type)?.value || ''
  return [get('year'), get('month'), get('day')].join('-')
}

function beneficiaryName(row: PrintableReliefDistribution): string {
  const profile = row.vulnerableProfile
  return profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ')
    : row.household?.headOfHousehold || 'Unspecified household'
}

function beneficiaryKey(row: PrintableReliefDistribution): string {
  return row.vulnerableProfile?.id || row.household?.id || row.id
}

function barangayName(row: PrintableReliefDistribution): string {
  return row.vulnerableProfile?.barangay || row.household?.barangay || 'Unspecified'
}

function blank(value: string | undefined): string {
  return value?.trim() || '________________________'
}

function Signatures({ context, dswd }: { context: ReliefPrintContext; dswd?: boolean }) {
  return (
    <div className="relief-keep-together mt-8 grid grid-cols-2 gap-10 text-center text-xs">
      <div>
        <p className="mb-10">{dswd ? 'Submitted by' : 'Prepared by'}</p>
        <p className="border-t border-slate-900 pt-2 font-semibold">{blank(context.preparedBy)}</p>
        <p>{context.preparedTitle}</p>
      </div>
      <div>
        <p className="mb-10">{dswd ? 'Certified True and Correct' : 'Reviewed / Approved by'}</p>
        <p className="border-t border-slate-900 pt-2 font-semibold">{blank(context.reviewedBy)}</p>
        <p>Designated LGU approving/certifying officer</p>
      </div>
    </div>
  )
}

function PrintHeading({
  title,
  context,
  from,
  to,
  generatedAt,
}: {
  title: string
  context: ReliefPrintContext
  from: string
  to: string
  generatedAt: string
}) {
  return (
    <header className="relief-print-header mb-5 border-b-2 border-slate-900 pb-4 text-center">
      <div className="flex items-center justify-center gap-3">
        <img
          src="/san-policarpo-logo.png"
          alt="Municipality of San Policarpo seal"
          className="h-14 w-14 object-contain"
        />
        <div>
          <p className="text-xs font-semibold uppercase">Republic of the Philippines</p>
          <p className="font-bold">{context.municipality || 'Municipality not specified'}</p>
          <p className="text-xs">Community Resource Mapping System · Local Government Unit</p>
        </div>
      </div>
      <h2 className="mt-3 text-xl font-bold uppercase">{title}</h2>
      <p className="mt-1 text-sm">Reporting period: {formatDay(from)} – {formatDay(to)}</p>
      <p className="text-xs">Generated: {formatDay(generatedAt)}</p>
    </header>
  )
}

export function AdditionalReliefPrintTemplate({
  template, rows, from, to, generatedAt, context, dependentCounts, quantityUnits,
}: Props) {
  // CRMS workers record completed distributions before Admin approval.
  // APPROVED is an accepted field-distribution record; DISTRIBUTED is also completed.
  // Neither replaces a beneficiary-signed acknowledgment on the RDS.
  const delivered = rows.filter((row) => row.status === 'APPROVED' || row.status === 'DISTRIBUTED')
  const distinctBeneficiaries = new Set(delivered.map(beneficiaryKey)).size

  const barangays = new Map<string, {
    count: number
    beneficiaries: Set<string>
    assistance: Set<string>
  }>()
  const assistance = new Map<string, {
    count: number
    beneficiaries: Set<string>
    quantity: number
  }>()
  const rdsGroups = new Map<string, {
    date: string
    barangay: string
    records: PrintableReliefDistribution[]
  }>()

  for (const row of delivered) {
    const barangay = barangayName(row)
    const name = beneficiaryKey(row)
    const place = barangays.get(barangay) || {
      count: 0, beneficiaries: new Set<string>(), assistance: new Set<string>(),
    }
    place.count += 1
    place.beneficiaries.add(name)
    place.assistance.add(row.distributionType)
    barangays.set(barangay, place)

    const type = row.distributionType || 'Unspecified relief'
    const unit = quantityUnits[row.id]?.trim() || 'Unit not supplied'
    const key = JSON.stringify([type, unit])
    const group = assistance.get(key) || { count: 0, beneficiaries: new Set<string>(), quantity: 0 }
    group.count += 1
    group.beneficiaries.add(name)
    group.quantity += Number(row.quantity) || 0
    assistance.set(key, group)

    // One actual distribution date and one barangay per RDS sheet.
    const date = calendarDay(row.distributionDate)
    const rdsKey = JSON.stringify([date, barangay])
    const rds = rdsGroups.get(rdsKey) || { date, barangay, records: [] }
    rds.records.push(row)
    rdsGroups.set(rdsKey, rds)
  }

  if (template === 'DSWD_RDS') {
    return (
      <article
        data-testid="relief-report-preview"
        data-template="DSWD_RDS"
        data-print-report="true"
        aria-label="DSWD-style Relief Distribution Sheet"
        className="relief-report-print report-print-root rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm sm:p-9"
      >
        <PrintHeading title="Relief Distribution Sheet (RDS-style)" context={context} from={from} to={to} generatedAt={generatedAt} />
        <p className="mb-4 text-xs font-semibold">
          LGU-generated draft aligned with DSWD RDS (MC No. 24, s. 2024, Annex H).
          Not an issued or certified DSWD form. Have the MSWDO verify before official submission.
        </p>
        {!delivered.length ? (
          <p className="border p-4 text-sm">No verified relief distribution records match these filters. Pending and rejected records are excluded.</p>
        ) : Array.from(rdsGroups.entries()).map(([key, group]) => (
          <section className="rds-sheet mb-8" key={key}>
            <div className="mb-3 grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
              <p>Region: <strong>{blank(context.region)}</strong></p>
              <p>Name of Evacuation Center: <strong>{blank(context.evacuationCenter)}</strong></p>
              <p>Province: <strong>{blank(context.province)}</strong></p>
              <p>Type of Disaster: <strong>{blank(context.disasterType)}</strong></p>
              <p>Municipality: <strong>{blank(context.municipality)}</strong></p>
              <p>Date of Occurrence: <strong>{context.occurrenceDate ? formatDay(context.occurrenceDate) : blank('')}</strong></p>
              <p>Barangay: <strong>{group.barangay}</strong></p>
              <p>Date of Relief Distribution: <strong>{formatDay(group.date)}</strong></p>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th rowSpan={2}>No.</th>
                  <th rowSpan={2}>Name of Beneficiary</th>
                  <th rowSpan={2}>No. of Dependents</th>
                  <th colSpan={2}>Assistance Provided</th>
                  <th rowSpan={2}>Signature / Thumbmark</th>
                </tr>
                <tr><th>Kind / Type</th><th>Quantity / Unit</th></tr>
              </thead>
              <tbody>
                {group.records.map((row, index) => (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td>{beneficiaryName(row)}</td>
                    <td>{dependentCounts[row.id] ?? '________'}</td>
                    <td>{row.distributionType}{row.itemsProvided ? ': ' + row.itemsProvided : ''}</td>
                    <td>{row.quantity} / {quantityUnits[row.id]?.trim() || '________'}</td>
                    <td className="rds-signature-cell">________________</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Signatures context={context} dswd />
          </section>
        ))}
      </article>
    )
  }

  return (
    <article
      data-testid="relief-report-preview"
      data-template="ACCOMPLISHMENT"
      data-print-report="true"
      aria-label="Relief Accomplishment Report"
      className="relief-report-print report-print-root rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm sm:p-9"
    >
      <PrintHeading title="Relief Distribution Accomplishment Report" context={context} from={from} to={to} generatedAt={generatedAt} />
      <p className="mb-3 text-xs">Based on accepted field-distribution records (APPROVED or DISTRIBUTED). Pending and rejected records are excluded. A signed receipt is still required for beneficiary acknowledgment.</p>
      <div className="relief-keep-together mb-6 grid grid-cols-2 gap-3">
        <div className="rounded border p-3"><p className="text-xs">Verified distribution records</p><p className="text-2xl font-bold">{delivered.length}</p></div>
        <div className="rounded border p-3"><p className="text-xs">Unique beneficiaries / households</p><p className="text-2xl font-bold">{distinctBeneficiaries}</p></div>
      </div>
      <h3 className="mb-2 text-sm font-bold">Completed Assistance by Barangay</h3>
      <table className="mb-6 w-full text-xs">
        <thead className="bg-slate-100"><tr><th>Barangay</th><th>Distribution records</th><th>Unique beneficiaries</th><th>Relief types delivered</th></tr></thead>
        <tbody>
          {Array.from(barangays.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([name, data]) => (
            <tr key={name}><td>{name}</td><td>{data.count}</td><td>{data.beneficiaries.size}</td><td>{Array.from(data.assistance).join(', ')}</td></tr>
          ))}
          {!delivered.length && <tr><td colSpan={4}>No verified distribution records match the selected period and filters.</td></tr>}
        </tbody>
      </table>
      <h3 className="mb-2 text-sm font-bold">Assistance Provided (Separated by Type and Unit)</h3>
      <table className="mb-6 w-full text-xs">
        <thead className="bg-slate-100"><tr><th>Relief type</th><th>Unit</th><th>Distribution records</th><th>Unique beneficiaries</th><th>Total quantity</th></tr></thead>
        <tbody>
          {Array.from(assistance.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([key, data]) => {
            const [type, unit] = JSON.parse(key) as [string, string]
            return <tr key={key}><td>{type}</td><td>{unit}</td><td>{data.count}</td><td>{data.beneficiaries.size}</td><td>{unit === 'Unit not supplied' ? '— (unit missing)' : data.quantity}</td></tr>
          })}
          {!delivered.length && <tr><td colSpan={5}>No verified distribution records.</td></tr>}
        </tbody>
      </table>
      <h3 className="mb-2 text-sm font-bold">Completed Distribution Register</h3>
      <table className="w-full text-xs">
        <thead className="bg-slate-100"><tr><th>Date</th><th>Barangay</th><th>Beneficiary</th><th>Vulnerability</th><th>Assistance / Goods</th><th>Quantity / Unit</th><th>Worker</th></tr></thead>
        <tbody>
          {delivered.map((row) => (
            <tr key={row.id}>
              <td>{formatDay(row.distributionDate)}</td>
              <td>{barangayName(row)}</td>
              <td>{beneficiaryName(row)}</td>
              <td>{formatVulnerabilityTypes(row.vulnerableProfile?.vulnerabilityTypes).map(vulnerabilityLabel).join(', ') || 'Not recorded'}</td>
              <td>{row.distributionType}{row.itemsProvided ? ': ' + row.itemsProvided : ''}</td>
              <td>{row.quantity} / {quantityUnits[row.id]?.trim() || 'Not recorded'}</td>
              <td>{row.worker?.name || '—'}</td>
            </tr>
          ))}
          {!delivered.length && <tr><td colSpan={7}>No verified distribution records.</td></tr>}
        </tbody>
      </table>
      <p className="mt-3 text-xs">Quantities are grouped by type and unit; missing units are not assumed. Data is subject to verification against signed distribution sheets and source records.</p>
      <Signatures context={context} />
    </article>
  )
}
