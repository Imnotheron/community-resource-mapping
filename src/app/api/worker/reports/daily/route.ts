export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'
import { getDailyReportRange } from '@/lib/daily-report-date-range'

export async function GET(request: NextRequest) {
  try {
    const requestedWorkerId = request.nextUrl.searchParams.get('workerId')?.trim()
    const auth = await requireRequestUser(request, {
      allowedRoles: ['WORKER'],
      requestedUserId: requestedWorkerId,
    })
    if ('error' in auth) return auth.error

    const range = getDailyReportRange(request.nextUrl.searchParams)
    if (!range) {
      return NextResponse.json(
        { success: false, error: 'Select valid From and To dates (YYYY-MM-DD); From must not be after To.' },
        { status: 400 },
      )
    }
    const { date, fromDate, toDate, start, end, includesToday } = range
    const barangay = request.nextUrl.searchParams.get('barangay')?.trim() || null
    const personId = request.nextUrl.searchParams.get('personId')?.trim() || null
    const lastName = request.nextUrl.searchParams.get('lastName')?.trim() || null

    const worker = await db.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, name: true, email: true, role: true },
    })

    if (!worker) {
      return NextResponse.json(
        { success: false, error: 'Worker account not found' },
        { status: 404 },
      )
    }

    const beneficiaryWhere: any = {
      ...(barangay ? { barangay } : {}),
      ...(personId ? { id: personId } : {}),
      ...(lastName ? { lastName } : {}),
    }

    const distributionWhere: any = {
      workerId: auth.userId,
      distributionDate: { gte: start, lt: end },
      ...(personId || lastName
        ? { vulnerableProfile: { is: beneficiaryWhere } }
        : barangay
          ? {
              OR: [
                { vulnerableProfile: { is: { barangay } } },
                { household: { is: { barangay } } },
              ],
            }
          : {}),
    }

    const [distributions, fieldNoteRows, assignedHouseholds, allBarangayRows, allPeopleRows] = await Promise.all([
      db.reliefDistribution.findMany({
        where: distributionWhere,
        select: {
          id: true,
          distributionType: true,
          itemsProvided: true,
          quantity: true,
          distributionDate: true,
          notes: true,
          status: true,
          rejectionReason: true,
          createdAt: true,
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
              address: true,
              barangay: true,
              headOfHousehold: true,
            },
          },
        },
        orderBy: { distributionDate: 'desc' },
      }),
      db.feedback.findMany({
        where: {
          userId: auth.userId,
          type: 'FIELD_NOTE',
          createdAt: { gte: start, lt: end },
        },
        select: {
          id: true,
          message: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.household.count({ where: { assignedWorkerId: auth.userId } }),
      db.vulnerableProfile.findMany({
        select: { barangay: true },
        distinct: ['barangay'],
        orderBy: { barangay: 'asc' },
      }),
      db.vulnerableProfile.findMany({
        // The Worker selector must not disclose every citizen in the municipality.
        where: {
          OR: [
            { reliefDistributions: { some: { workerId: auth.userId } } },
            { household: { is: { assignedWorkerId: auth.userId } } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          suffix: true,
          barangay: true,
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' },
        ],
      }),
    ])

    const approved = distributions.filter((item) => item.status === 'APPROVED').length
    const distributed = distributions.filter((item) => item.status === 'DISTRIBUTED').length
    const pending = distributions.filter((item) => item.status === 'PENDING').length
    const rejected = distributions.filter((item) => item.status === 'REJECTED').length
    const verified = approved + distributed
    const fieldNotes = fieldNoteRows.map((item) => ({
      id: item.id,
      note: item.message,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }))

    return NextResponse.json({
      success: true,
      report: {
        date,
        fromDate,
        toDate,
        generatedAt: new Date().toISOString(),
        worker,
        filters: { barangay, personId, lastName },
        barangays: allBarangayRows
          .map((item) => item.barangay)
          .filter(Boolean),
        people: allPeopleRows,
        summary: {
          distributionsRecorded: distributions.length,
          approvedDistributions: approved,
          distributedDistributions: distributed,
          verifiedDistributions: verified,
          pendingDistributions: pending,
          rejectedDistributions: rejected,
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
      { success: false, error: 'Failed to generate daily report' },
      { status: 500 },
    )
  }
}
