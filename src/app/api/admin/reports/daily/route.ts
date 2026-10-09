export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

function todayInManila() {
  return new Date(Date.now() + 8 * 60 * 60 * 1_000).toISOString().slice(0, 10)
}

function getDayRange(value: string | null) {
  const date = value ?? todayInManila()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const [year, month, day] = date.split('-').map(Number)
  const calendarDay = new Date(Date.UTC(year, month - 1, day))
  if (
    calendarDay.getUTCFullYear() !== year ||
    calendarDay.getUTCMonth() !== month - 1 ||
    calendarDay.getUTCDate() !== day
  ) return null

  const start = new Date(`${date}T00:00:00.000+08:00`)
  return { date, start, end: new Date(start.getTime() + 24 * 60 * 60 * 1_000) }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

    const range = getDayRange(request.nextUrl.searchParams.get('date'))
    if (!range) {
      return NextResponse.json(
        { success: false, error: 'Choose a valid calendar date (YYYY-MM-DD).' },
        { status: 400 },
      )
    }
    const { date, start, end } = range
    const barangay = request.nextUrl.searchParams.get('barangay')?.trim() || null
    const workerId = request.nextUrl.searchParams.get('workerId')?.trim() || null
    const personId = request.nextUrl.searchParams.get('personId')?.trim() || null
    const lastName = request.nextUrl.searchParams.get('lastName')?.trim() || null

    if (workerId) {
      const worker = await db.user.findUnique({
        where: { id: workerId },
        select: { id: true, role: true },
      })
      if (!worker || worker.role !== 'WORKER') {
        return NextResponse.json(
          { success: false, error: 'The selected Worker account was not found' },
          { status: 400 },
        )
      }
    }

    const profileWhere: any = {
      ...(barangay ? { barangay } : {}),
      ...(personId ? { id: personId } : {}),
      ...(lastName ? { lastName } : {}),
    }
    const dailyProfileWhere: any = {
      ...profileWhere,
      createdAt: { gte: start, lt: end },
    }
    const beneficiaryWhere: any = {
      ...(barangay ? { barangay } : {}),
      ...(personId ? { id: personId } : {}),
      ...(lastName ? { lastName } : {}),
    }

    const distributionWhere: any = {
      distributionDate: { gte: start, lt: end },
      ...(workerId ? { workerId } : {}),
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

    const [
      totalVulnerableCitizens,
      newRegistrations,
      activeWorkers,
      workersOnlineToday,
      announcementsCreated,
      distributions,
      citizenRecords,
      registrations,
      fieldNoteRows,
      workers,
      barangayProfiles,
      allBarangayRows,
      allPeopleRows,
    ] = await Promise.all([
      db.vulnerableProfile.count({ where: profileWhere }),
      db.vulnerableProfile.count({ where: dailyProfileWhere }),
      db.user.count({ where: { role: 'WORKER' } }),
      db.user.count({
        where: {
          role: 'WORKER',
          OR: [
            { isOnline: true },
            { lastSeenAt: { gte: start, lt: end } },
          ],
        },
      }),
      db.announcement.count({ where: { createdAt: { gte: start, lt: end } } }),
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
          worker: {
            select: { id: true, name: true, email: true },
          },
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
        orderBy: { distributionDate: 'desc' },
      }),
      db.vulnerableProfile.findMany({
        where: profileWhere,
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          suffix: true,
          barangay: true,
          vulnerabilityTypes: true,
          needsAssistance: true,
          assistanceType: true,
          registrationStatus: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [
          { barangay: 'asc' },
          { lastName: 'asc' },
          { firstName: 'asc' },
        ],
      }),
      db.vulnerableProfile.findMany({
        where: dailyProfileWhere,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          barangay: true,
          registrationStatus: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.feedback.findMany({
        where: {
          type: 'FIELD_NOTE',
          createdAt: { gte: start, lt: end },
          ...(workerId ? { userId: workerId } : {}),
        },
        select: {
          id: true,
          message: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.user.findMany({
        where: { role: 'WORKER' },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      }),
      db.vulnerableProfile.findMany({
        where: profileWhere,
        select: { barangay: true },
      }),
      db.vulnerableProfile.findMany({
        select: { barangay: true },
        distinct: ['barangay'],
        orderBy: { barangay: 'asc' },
      }),
      db.vulnerableProfile.findMany({
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

    const barangayCounts = new Map<string, number>()
    for (const profile of barangayProfiles) {
      const key = profile.barangay || 'Unspecified'
      barangayCounts.set(key, (barangayCounts.get(key) || 0) + 1)
    }

    const distributionCounts = new Map<string, number>()
    for (const distribution of distributions) {
      const key = distribution.vulnerableProfile?.barangay ||
        distribution.household?.barangay || 'Unspecified'
      distributionCounts.set(key, (distributionCounts.get(key) || 0) + 1)
    }

    const barangaySummary = Array.from(
      new Set([...barangayCounts.keys(), ...distributionCounts.keys()]),
    )
      .map((name) => ({
        name,
        registeredCitizens: barangayCounts.get(name) || 0,
        distributions: distributionCounts.get(name) || 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    const approvedDistributions = distributions.filter(
      (item) => item.status === 'APPROVED',
    ).length
    const distributedDistributions = distributions.filter(
      (item) => item.status === 'DISTRIBUTED',
    ).length
    const verifiedDistributions = approvedDistributions + distributedDistributions
    const pendingDistributions = distributions.filter(
      (item) => item.status === 'PENDING',
    ).length
    const rejectedDistributions = distributions.filter(
      (item) => item.status === 'REJECTED',
    ).length
    const fieldNotes = fieldNoteRows.map((item) => ({
      id: item.id,
      note: item.message,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      user: item.user,
    }))

    return NextResponse.json({
      success: true,
      report: {
        date,
        generatedAt: new Date().toISOString(),
        timeZone: 'Asia/Manila',
        filters: { barangay, workerId, personId, lastName },
        summary: {
          totalVulnerableCitizens,
          newRegistrations,
          activeWorkers,
          workersOnlineToday,
          announcementsCreated,
          distributionsRecorded: distributions.length,
          approvedDistributions,
          distributedDistributions,
          verifiedDistributions,
          pendingDistributions,
          rejectedDistributions,
          fieldNotesCreated: fieldNotes.length,
        },
        citizenRecords,
        registrations,
        distributions,
        fieldNotes,
        barangaySummary,
        barangays: allBarangayRows
          .map((item) => item.barangay)
          .filter(Boolean),
        workers,
        people: allPeopleRows,
      },
    })
  } catch (error) {
    console.error('Error generating admin daily report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate daily report' },
      { status: 500 },
    )
  }
}
