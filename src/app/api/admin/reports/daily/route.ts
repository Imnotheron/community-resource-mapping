export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type TokenPayload = {
  userId?: string
  role?: string
}

function normalizeRole(value: unknown) {
  return String(value || '').trim().toUpperCase()
}

function readToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') || ''
  const bearerToken = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : ''

  return bearerToken || request.cookies.get('token')?.value || ''
}

function decodeToken(token: string): TokenPayload | null {
  if (!token) return null

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    const payload = JSON.parse(decoded) as TokenPayload
    return payload && typeof payload === 'object' ? payload : null
  } catch {
    return null
  }
}

async function requireAdmin(request: NextRequest) {
  const payload = decodeToken(readToken(request))
  const tokenUserId = String(payload?.userId || '').trim()

  if (!tokenUserId) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Authentication is required to generate an administrative report.' },
        { status: 401 },
      ),
    }
  }

  const requestedUserId = String(
    request.nextUrl.searchParams.get('userId') ||
      request.headers.get('x-user-id') ||
      '',
  ).trim()

  if (requestedUserId && requestedUserId !== tokenUserId) {
    return {
      error: NextResponse.json(
        { success: false, error: 'The requested user does not match the current session.' },
        { status: 403 },
      ),
    }
  }

  const user = await db.user.findUnique({
    where: { id: tokenUserId },
    select: { id: true, role: true },
  })

  if (!user || normalizeRole(user.role) !== 'ADMIN') {
    return {
      error: NextResponse.json(
        { success: false, error: 'Administrator access is required.' },
        { status: 403 },
      ),
    }
  }

  return { user }
}

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

  // Asia/Manila is UTC+08:00 and does not observe daylight-saving time.
  const start = new Date(`${date}T00:00:00.000+08:00`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

  return { date, start, end }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error

    const { date, start, end } = getDayRange(request.nextUrl.searchParams.get('date'))
    const barangay = request.nextUrl.searchParams.get('barangay')?.trim() || null
    const workerId = request.nextUrl.searchParams.get('workerId')?.trim() || null

    const profileWhere = {
      ...(barangay ? { barangay } : {}),
    }

    const dailyProfileWhere = {
      ...profileWhere,
      createdAt: { gte: start, lt: end },
    }

    const distributionWhere = {
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
      fieldNotes,
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
        include: {
          worker: { select: { id: true, name: true, email: true } },
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
      db.fieldNote.findMany({
        where: {
          createdAt: { gte: start, lt: end },
          ...(workerId ? { userId: workerId } : {}),
        },
        include: { user: { select: { id: true, name: true } } },
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

    const approvedDistributions = distributions.filter((item) => item.status === 'APPROVED').length
    const pendingDistributions = distributions.filter((item) => item.status === 'PENDING').length
    const rejectedDistributions = distributions.filter((item) => item.status === 'REJECTED').length

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
        barangays: allBarangayRows.map((item) => item.barangay).filter(Boolean),
        workers,
      },
    })
  } catch (error) {
    console.error('Error generating admin daily report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate daily report', details: String(error) },
      { status: 500 },
    )
  }
}
