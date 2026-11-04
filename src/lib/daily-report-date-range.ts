/**
 * Date boundaries for Daily Operations reports.
 * Both inputs are calendar dates in Asia/Manila; the To date is inclusive.
 * Existing links using ?date=YYYY-MM-DD remain supported.
 */
export function todayInManila(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1_000).toISOString().slice(0, 10)
}

function validCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false
  const parsed = new Date(`${value}T00:00:00.000+08:00`)
  if (Number.isNaN(parsed.getTime())) return false
  // Check the calendar day after converting back to the requested local zone.
  const manila = new Date(parsed.getTime() + 8 * 60 * 60 * 1_000)
  return (
    manila.getUTCFullYear() === year &&
    manila.getUTCMonth() === month - 1 &&
    manila.getUTCDate() === day
  )
}

export function getDailyReportRange(params: URLSearchParams) {
  const today = todayInManila()
  const fromDate = params.get('from') ?? params.get('date') ?? params.get('to') ?? today
  const toDate = params.get('to') ?? params.get('date') ?? params.get('from') ?? today

  if (!validCalendarDate(fromDate) || !validCalendarDate(toDate) || fromDate > toDate) {
    return null
  }

  const start = new Date(`${fromDate}T00:00:00.000+08:00`)
  const endDate = new Date(`${toDate}T00:00:00.000+08:00`)
  const end = new Date(endDate.getTime() + 24 * 60 * 60 * 1_000)

  return {
    date: toDate,
    fromDate,
    toDate,
    start,
    end,
    includesToday: fromDate <= today && today <= toDate,
  }
}
