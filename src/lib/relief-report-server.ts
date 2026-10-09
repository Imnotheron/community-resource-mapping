import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

const MAX_DAYS = 366
const MAX_RECORDS = 5000
const DAY_MS = 24 * 60 * 60 * 1000

function parseCalendarDay(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null

  const [year, month, day] = value.split('-').map(Number)
  const utc = new Date(Date.UTC(year, month - 1, day))
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null
  }

  return { date: value, index: Math.floor(utc.getTime() / DAY_MS) }
}

/**
 * Admin reports cover municipal records; Worker reports are always limited to
 * the signed-in worker. No supporting photo blobs are included in report data.
 */
export async function getReliefReport(
  request: NextRequest,
  audience: 'ADMIN' | 'WORKER',
) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: [audience],
    })
    if ('error' in auth) return auth.error

    const from = parseCalendarDay(request.nextUrl.searchParams.get('from'))
    const to = parseCalendarDay(request.nextUrl.searchParams.get('to'))

    if (!from || !to || to.index < from.index) {
      return NextResponse.json(
        { success: false, error: 'Choose valid From and To dates in chronological order.' },
        { status: 400 },
      )
    }

    if (to.index - from.index + 1 > MAX_DAYS) {
      return NextResponse.json(
        { success: false, error: 'Select a period of 366 days or less.' },
        { status: 400 },
      )
    }

    const start = new Date(`${from.date}T00:00:00.000+08:00`)
    const exclusiveEnd = new Date(`${to.date}T00:00:00.000+08:00`)
    exclusiveEnd.setTime(exclusiveEnd.getTime() + DAY_MS)

    const distributions = await db.reliefDistribution.findMany({
      where: {
        distributionDate: { gte: start, lt: exclusiveEnd },
        ...(audience === 'WORKER' ? { workerId: auth.userId } : {}),
      },
      select: {
        id: true,
        distributionDate: true,
        distributionType: true,
        itemsProvided: true,
        quantity: true,
        status: true,
        rejectionReason: true,
        notes: true,
        worker: { select: { id: true, name: true } },
        vulnerableProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            barangay: true,
            vulnerabilityTypes: true,
          },
        },
        household: {
          select: {
            id: true,
            headOfHousehold: true,
            barangay: true,
          },
        },
      },
      orderBy: [{ distributionDate: 'desc' }, { id: 'desc' }],
      take: MAX_RECORDS + 1,
    })

    if (distributions.length > MAX_RECORDS) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many relief records for one report. Please choose a shorter date range.',
        },
        { status: 413 },
      )
    }

    return NextResponse.json({
      success: true,
      report: {
        from: from.date,
        to: to.date,
        generatedAt: new Date().toISOString(),
        scope: audience,
        distributions,
      },
    })
  } catch (error) {
    console.error('Failed to generate relief report:', error)
    return NextResponse.json(
      { success: false, error: 'Could not generate the relief report.' },
      { status: 500 },
    )
  }
}
