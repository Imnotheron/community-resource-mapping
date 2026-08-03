export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

function todayInManila() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function getDayRange(value: string | null) {
  const date = value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : todayInManila()

  const start = new Date(`${date}T00:00:00.000+08:00`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1_000)

  return { date, start, end }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

    const { date, start, end } = getDayRange(
      request.nextUrl.searchParams.get('date'),
    )
    const barangay = request.nextUrl.searchParams.get('barangay')?.trim() || null
    const workerId = request.nextUrl.searchParams.get('workerId')?.trim() || null

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
    }
    const dailyProfileWhere: any = {
      ...profileWhere,
      createdAt: { gte: start, lt: end },
    }
    const distributionWhere: any = {
      distributionDate: { gte: start, lt: end },
      ...(workerId ? { workerId } : {}),
      ...(barangay
        ? {
            vulnerableProfile: {
              is: { barangay },
            },
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
      registrations,
      fieldNoteRows,
      workers,
      barangayProfiles,
      allBarangayRows,
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
            },
          },
        },
        orderBy: { distributionDate: 'desc' },
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
    ])

    const barangayCounts = new Map<string, number>()
    for (const profile of barangayProfiles) {
      const key = profile.barangay || 'Unspecified'
      barangayCounts.set(key, (barangayCounts.get(key) || 0) + 1)
    }

    const distributionCounts = new Map<string, number>()
    for (const distribution of distributions) {
      const key = distribution.vulnerableProfile?.barangay || 'Unspecified'
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
        filters: { barangay, workerId },
        summary: {
          totalVulnerableCitizens,
          newRegistrations,
          activeWorkers,
          workersOnlineToday,
          announcementsCreated,
          distributionsRecorded: distributions.length,
          approvedDistributions,
          pendingDistributions,
          rejectedDistributions,
          fieldNotesCreated: fieldNotes.length,
        },
        registrations,
        distributions,
        fieldNotes,
        barangaySummary,
        barangays: allBarangayRows
          .map((item) => item.barangay)
          .filter(Boolean),
        workers,
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
