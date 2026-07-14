export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function getDayRange(value: string | null) {
  const date = value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : new Date().toISOString().slice(0, 10)

  const start = new Date(`${date}T00:00:00.000Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)

  return { date, start, end }
}

export async function GET(request: NextRequest) {
  try {
    const workerId = request.nextUrl.searchParams.get('workerId')?.trim()
    const { date, start, end } = getDayRange(request.nextUrl.searchParams.get('date'))

    if (!workerId) {
      return NextResponse.json(
        { success: false, error: 'Worker ID is required' },
        { status: 400 },
      )
    }

    const worker = await db.user.findUnique({
      where: { id: workerId },
      select: { id: true, name: true, email: true, role: true },
    })

    if (!worker || worker.role !== 'WORKER') {
      return NextResponse.json(
        { success: false, error: 'Worker account not found' },
        { status: 404 },
      )
    }

    const [distributions, fieldNotes, assignedHouseholds] = await Promise.all([
      db.reliefDistribution.findMany({
        where: {
          workerId,
          distributionDate: { gte: start, lt: end },
        },
        include: {
          vulnerableProfile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              barangay: true,
            },
          },
          household: {
            select: {
              id: true,
              address: true,
              barangay: true,
              headOfHousehold: true,
            },
          },
        },
        orderBy: { distributionDate: 'desc' },
      }),
      db.fieldNote.findMany({
        where: {
          userId: workerId,
          createdAt: { gte: start, lt: end },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.household.count({ where: { assignedWorkerId: workerId } }),
    ])

    const approved = distributions.filter((item) => item.status === 'APPROVED').length
    const pending = distributions.filter((item) => item.status === 'PENDING').length
    const rejected = distributions.filter((item) => item.status === 'REJECTED').length
    const totalQuantity = distributions.reduce((sum, item) => sum + item.quantity, 0)

    return NextResponse.json({
      success: true,
      report: {
        date,
        generatedAt: new Date().toISOString(),
        worker,
        summary: {
          distributionsRecorded: distributions.length,
          approvedDistributions: approved,
          pendingDistributions: pending,
          rejectedDistributions: rejected,
          totalQuantity,
          fieldNotesCreated: fieldNotes.length,
          assignedHouseholds,
        },
        distributions,
        fieldNotes,
      },
    })
  } catch (error) {
    console.error('Error generating worker daily report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate daily report', details: String(error) },
      { status: 500 },
    )
  }
}
