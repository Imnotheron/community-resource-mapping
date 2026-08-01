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

async function requireMapViewer(request: NextRequest) {
  const payload = decodeToken(readToken(request))
  const tokenUserId = String(payload?.userId || '').trim()

  if (!tokenUserId) {
    return {
      error: NextResponse.json(
        { success: false, message: 'Authentication is required to view live vulnerable map data.' },
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
        { success: false, message: 'The requested user does not match the current session.' },
        { status: 403 },
      ),
    }
  }

  const user = await db.user.findUnique({
    where: { id: tokenUserId },
    select: { id: true, role: true },
  })

  const role = normalizeRole(user?.role)
  if (!user || (role !== 'ADMIN' && role !== 'WORKER')) {
    return {
      error: NextResponse.json(
        { success: false, message: 'Administrator or field-worker access is required.' },
        { status: 403 },
      ),
    }
  }

  return { user }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireMapViewer(request)
    if ('error' in auth) return auth.error

    // Only approved profiles with recorded coordinates belong on the operational map.
    const profiles = await db.vulnerableProfile.findMany({
      where: {
        registrationStatus: 'APPROVED',
        latitude: { not: null },
        longitude: { not: null },
      },
      include: {
        household: {
          select: {
            id: true,
            totalMembers: true,
            vulnerableMembers: true,
          },
        },
        reliefDistributions: {
          select: {
            id: true,
            distributionDate: true,
          },
          orderBy: {
            distributionDate: 'desc',
          },
          take: 1,
        },
      },
    })

    const mapData = profiles.map((profile) => {
      const hasReceivedRelief = profile.reliefDistributions.length > 0
      const lastDistributionDate = hasReceivedRelief
        ? profile.reliefDistributions[0].distributionDate
        : undefined

      let vulnerabilityTypes: string[] = []
      try {
        const parsed = JSON.parse(profile.vulnerabilityTypes || '[]')
        vulnerabilityTypes = Array.isArray(parsed) ? parsed : []
      } catch {
        vulnerabilityTypes = []
      }

      return {
        id: profile.id,
        name: `${profile.lastName}, ${profile.firstName} ${profile.middleName || ''} ${profile.suffix || ''}`
          .replace(/\s+/g, ' ')
          .trim(),
        email: profile.emailAddress,
        mobileNumber: profile.mobileNumber || 'Not recorded',
        latitude: profile.latitude!,
        longitude: profile.longitude!,
        barangay: profile.barangay,
        address: `${profile.houseNumber || ''} ${profile.street || ''}, ${profile.barangay || ''}`
          .replace(/\s+/g, ' ')
          .replace(/^\s*,|,\s*$/g, '')
          .trim(),
        vulnerabilityTypes,
        disabilityType: profile.disabilityType,
        disabilityCause: profile.disabilityCause || null,
        hasReceivedRelief,
        lastDistributionDate,
        totalMembers: profile.household?.totalMembers,
        vulnerableMembers: profile.household?.vulnerableMembers,
        needsAssistance: profile.needsAssistance,
      }
    })

    return NextResponse.json({
      success: true,
      points: mapData,
    })
  } catch (error) {
    console.error('Error fetching map data:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch map data' },
      { status: 500 },
    )
  }
}
